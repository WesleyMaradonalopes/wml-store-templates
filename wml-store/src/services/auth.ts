import { getStoredJson, removeStoredValue, setStoredJson } from './storage';
import * as SecureStore from 'expo-secure-store';
import { storeConfig } from '@/config/store';

export type AccountSession = { email: string; loggedAt: string };

const SESSION_KEY = 'lojahr:account-session';
const AUTH_TOKEN_KEY = 'lojahr_vtex_user_token';

let accountSessionCache: AccountSession | null | undefined;
let accountSessionRequest: Promise<AccountSession | null> | null = null;
let vtexTokenCache: string | null | undefined;
let vtexTokenRequest: Promise<string | null> | null = null;

export function getAccountSession() {
  if (accountSessionCache !== undefined) return Promise.resolve(accountSessionCache);
  if (!accountSessionRequest) {
    accountSessionRequest = getStoredJson<AccountSession>(SESSION_KEY)
      .then((session) => {
        accountSessionCache = session;
        return session;
      })
      .finally(() => { accountSessionRequest = null; });
  }
  return accountSessionRequest;
}

export function saveAccountSession(email: string) {
  const session = { email, loggedAt: new Date().toISOString() };
  accountSessionCache = session;
  return setStoredJson<AccountSession>(SESSION_KEY, session);
}

export function clearAccountSession() {
  accountSessionCache = null;
  vtexTokenCache = null;
  return Promise.all([removeStoredValue(SESSION_KEY), SecureStore.deleteItemAsync(AUTH_TOKEN_KEY)]).then(() => undefined);
}

export function getCachedAccountSession() {
  return accountSessionCache;
}

export function getCachedVtexUserToken() {
  return vtexTokenCache;
}

async function saveVtexUserToken(token: string) {
  vtexTokenCache = token;
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

type StartAuthResponse = { authenticationToken?: string };
type ValidateAuthResponse = { authStatus?: string; authCookie?: { Value?: string }; userId?: string };
type GoogleClientIdResponse = { enabled?: boolean; clientId?: string };
export type VtexGoogleLoginResponse = {
  authStatus?: string;
  authCookie?: unknown;
  accountAuthCookie?: unknown;
  authToken?: string;
  userId?: string;
  message?: string;
};

function authUrl(path: string) {
  return `${storeConfig.vtexBaseUrl}/api/vtexid/pub/authentication/${path}`;
}

export async function getVtexGoogleClientId() {
  const response = await fetch(`${storeConfig.vtexBaseUrl}/api/vtexid/google/onetap/id`, {
    headers: { Accept: 'application/json' },
  });
  const data = await response.json().catch(() => ({})) as GoogleClientIdResponse;
  if (!response.ok || data.enabled === false || !data.clientId) {
    throw new Error('O login com Google não está configurado na VTEX.');
  }
  return data.clientId;
}

function extractAuthToken(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return String(record.Value ?? record.value ?? record.token ?? '').trim();
}

export async function loginVtexGoogle(credential: string) {
  const form = new URLSearchParams();
  form.append('account', storeConfig.account);
  form.append('credential', credential);
  const response = await fetch(`${storeConfig.vtexBaseUrl}/api/vtexid/google/onetap/signin`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = await response.json().catch(() => ({})) as VtexGoogleLoginResponse;
  const token = extractAuthToken(data.authCookie) || extractAuthToken(data.accountAuthCookie);
  if (!response.ok || data.authStatus !== 'Success' || !token) {
    const messages: Record<string, string> = {
      InvalidToken: 'O Google não retornou uma credencial válida.',
      CanceledByUser: 'O login com Google foi cancelado.',
      InativeUser: 'Esta conta Google não está ativa na loja.',
    };
    throw new Error(messages[data.authStatus || ''] || 'Não foi possível concluir o login com Google.');
  }
  await saveVtexUserToken(token);
  return data;
}

export async function exchangeVtexGoogleAccessToken(accessToken: string) {
  const providerId = process.env.EXPO_PUBLIC_VTEX_GOOGLE_PROVIDER_ID || 'Google';
  const response = await fetch(`${storeConfig.vtexBaseUrl}/api/vtexid/audience/webstore/provider/oauth/exchange`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId, accessToken }),
  });
  const data = await response.json().catch(() => ({})) as VtexGoogleLoginResponse;
  const token = extractAuthToken(data.authToken) || extractAuthToken(data.authCookie) || extractAuthToken(data.accountAuthCookie);
  if (!response.ok || !token) {
    throw new Error(data.message || 'Não foi possível vincular o login Google à VTEX.');
  }
  await saveVtexUserToken(token);
  return data;
}

export function getGoogleEmailFromIdToken(idToken: string) {
  try {
    const encodedPayload = idToken.split('.')[1];
    if (!encodedPayload) return '';
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const atobFn = (globalThis as typeof globalThis & { atob?: (value: string) => string }).atob;
    if (!atobFn) return '';
    const binary = atobFn(base64);
    const json = decodeURIComponent(Array.from(binary).map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
    const email = String((JSON.parse(json) as { email?: string }).email || '').trim().toLowerCase();
    return email.includes('@') ? email : '';
  } catch {
    return '';
  }
}

export async function startVtexAuthentication() {
  const fingerprint = `lojahr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const response = await fetch(`${authUrl('start')}?scope=${encodeURIComponent(storeConfig.account)}&fingerprint=${encodeURIComponent(fingerprint)}`);
  if (!response.ok) throw new Error('Não foi possível iniciar a autenticação VTEX.');
  const data = await response.json() as StartAuthResponse;
  if (!data.authenticationToken) throw new Error('A VTEX não retornou o token de autenticação.');
  return data.authenticationToken;
}

export async function sendVtexAccessKey(email: string, authenticationToken: string) {
  const response = await fetch(`${authUrl('accesskey/send')}?email=${encodeURIComponent(email)}`, { method: 'POST', headers: { Cookie: `_vss=${authenticationToken}` } });
  if (!response.ok) throw new Error('Não foi possível enviar o código de acesso.');
}

export async function validateVtexAccessKey(email: string, accessKey: string, authenticationToken: string) {
  const backendResponse = await fetch(`${storeConfig.backendUrl}/auth/access-key/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, accessKey, authenticationToken }),
  }).catch(() => null);
  if (backendResponse?.ok) {
    const data = await backendResponse.json() as ValidateAuthResponse;
    if (data.authCookie?.Value) await saveVtexUserToken(data.authCookie.Value);
    return data;
  }
  const form = new FormData();
  form.append('accesskey', accessKey);
  form.append('login', email);
  const response = await fetch(authUrl('accesskey/validate'), { method: 'POST', headers: { Cookie: `_vss=${authenticationToken}` }, body: form });
  if (!response.ok) throw new Error('Código de acesso inválido.');
  const data = await response.json() as ValidateAuthResponse;
  if (data.authStatus !== 'Success' || !data.authCookie?.Value) throw new Error('Não foi possível validar o código.');
  await saveVtexUserToken(data.authCookie.Value);
  return data;
}

export async function loginVtexPassword(email: string, password: string) {
  const backendResponse = await fetch(`${storeConfig.backendUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);
  if (backendResponse?.ok) {
    const data = await backendResponse.json() as ValidateAuthResponse;
    if (data.authCookie?.Value) await saveVtexUserToken(data.authCookie.Value);
    return data;
  }
  const authenticationToken = await startVtexAuthentication();
  const form = new FormData();
  form.append('login', email);
  form.append('password', password);
  form.append('authenticationToken', authenticationToken);
  const response = await fetch(authUrl('classic/validate'), {
    method: 'POST',
    headers: { Cookie: `_vss=${authenticationToken}` },
    body: form,
  });
  const data = await response.json().catch(() => ({})) as ValidateAuthResponse & { error?: string; message?: string };
  if (!response.ok || data.authStatus !== 'Success' || !data.authCookie?.Value) {
    throw new Error(data.message || data.error || 'E-mail ou senha inválidos.');
  }
  await saveVtexUserToken(data.authCookie.Value);
  return data;
}

export function getVtexUserToken() {
  if (vtexTokenCache !== undefined) return Promise.resolve(vtexTokenCache);
  if (!vtexTokenRequest) {
    vtexTokenRequest = SecureStore.getItemAsync(AUTH_TOKEN_KEY)
      .then((token) => {
        vtexTokenCache = token;
        return token;
      })
      .finally(() => { vtexTokenRequest = null; });
  }
  return vtexTokenRequest;
}

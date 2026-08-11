import { getStoredJson, removeStoredValue, setStoredJson } from './storage';
import * as SecureStore from 'expo-secure-store';
import { storeConfig } from '@/config/store';

export type AccountSession = { email: string; loggedAt: string };

const SESSION_KEY = 'lojabl:account-session';
const AUTH_TOKEN_KEY = 'lojabl_vtex_user_token';

export function getAccountSession() {
  return getStoredJson<AccountSession>(SESSION_KEY);
}

export function saveAccountSession(email: string) {
  return setStoredJson<AccountSession>(SESSION_KEY, { email, loggedAt: new Date().toISOString() });
}

export function clearAccountSession() {
  return Promise.all([removeStoredValue(SESSION_KEY), SecureStore.deleteItemAsync(AUTH_TOKEN_KEY)]).then(() => undefined);
}

type StartAuthResponse = { authenticationToken?: string };
type ValidateAuthResponse = { authStatus?: string; authCookie?: { Value?: string }; userId?: string };

function authUrl(path: string) {
  return `${storeConfig.vtexBaseUrl}/api/vtexid/pub/authentication/${path}`;
}

export async function startVtexAuthentication() {
  const fingerprint = `lojabl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    if (data.authCookie?.Value) await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.authCookie.Value);
    return data;
  }
  const form = new FormData();
  form.append('accesskey', accessKey);
  form.append('login', email);
  const response = await fetch(authUrl('accesskey/validate'), { method: 'POST', headers: { Cookie: `_vss=${authenticationToken}` }, body: form });
  if (!response.ok) throw new Error('Código de acesso inválido.');
  const data = await response.json() as ValidateAuthResponse;
  if (data.authStatus !== 'Success' || !data.authCookie?.Value) throw new Error('Não foi possível validar o código.');
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.authCookie.Value);
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
    if (data.authCookie?.Value) await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.authCookie.Value);
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
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.authCookie.Value);
  return data;
}

export function getVtexUserToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

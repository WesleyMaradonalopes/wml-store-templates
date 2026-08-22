import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 6001);
const account = process.env.VTEX_ACCOUNT || 'lojahr';
const domain = process.env.VTEX_STORE_DOMAIN || `${account}.myvtex.com`;
const vtexBaseUrl = `https://${domain}`;
const vtexPaymentsBaseUrl = `https://${account}.vtexpayments.com.br`;
// O endpoint antigo em vtexpayments.com.br deixou de aceitar o envio de
// pagamentos. O Payments Gateway atual usa o domínio da conta no VTEX Vault.
const vtexVaultBaseUrl = `https://${account}.vtexvault.com`;
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
const wishlistEntity = process.env.VTEX_WISHLIST_ENTITY || 'wishlist';
const wishlistSchema = process.env.VTEX_WISHLIST_SCHEMA || 'wishlist';
const wishlistEntities = [...new Set([wishlistEntity, 'wishlist', 'WL', 'wl', 'WI', 'wi'])];
const customerVtexSessions = new Map();
const wishlistIoStrategyByEmail = new Map();
const backendSourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const cmsDirectory = process.env.CMS_SCHEMAS_DIR
  ? path.resolve(process.env.CMS_SCHEMAS_DIR)
  : path.resolve(backendSourceDirectory, '../../wml-store/public/cms');

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '1mb' }));

// Schemas usados pelo projeto Custom do Headless CMS. O diretório pode ser
// sobrescrito com CMS_SCHEMAS_DIR quando o backend for publicado sozinho.
app.use('/cms', express.static(cmsDirectory, {
  extensions: ['json'],
  fallthrough: false,
  setHeaders(response) {
    response.setHeader('Cache-Control', 'public, max-age=300');
  },
}));

function vtexHeaders() {
  const headers = { Accept: 'application/json' };
  if (process.env.VTEX_APP_KEY) headers['X-VTEX-API-AppKey'] = process.env.VTEX_APP_KEY;
  if (process.env.VTEX_APP_TOKEN) headers['X-VTEX-API-AppToken'] = process.env.VTEX_APP_TOKEN;
  return headers;
}

function checkoutHeaders(userToken = '', contentType = false, cookie = '') {
  const headers = { ...vtexHeaders() };
  if (contentType) headers['Content-Type'] = 'application/json';
  const cookies = [];
  if (userToken) {
    headers.VtexIdclientAutCookie = userToken;
    cookies.push(`VtexIdclientAutCookie_${account}=${userToken}`, `VtexIdclientAutCookie=${userToken}`);
  }
  if (cookie) cookies.push(cookie);
  if (cookies.length) headers.Cookie = cookies.join('; ');
  return headers;
}

function publicCheckoutHeaders(userToken = '', contentType = false, cookie = '') {
  const headers = { Accept: 'application/json' };
  if (contentType) headers['Content-Type'] = 'application/json';
  const cookies = [];
  if (userToken) {
    headers.VtexIdclientAutCookie = userToken;
    cookies.push(`VtexIdclientAutCookie_${account}=${userToken}`, `VtexIdclientAutCookie=${userToken}`);
  }
  if (cookie) cookies.push(cookie);
  if (cookies.length) headers.Cookie = cookies.join('; ');
  return headers;
}

async function requestCheckout(url, {
  method = 'GET',
  body,
  userToken = '',
  contentType = false,
  cookie = '',
  fallbackToAppAuth = false,
  singleAttempt = false,
  } = {}) {
  const init = {
    method,
    headers: publicCheckoutHeaders(userToken, contentType, cookie),
    ...(body === undefined ? {} : { body }),
  };
  let result = await fetch(url, init);
  let fallbackUserToken = userToken;
  // A VTEX também usa 403 para desafios de reCAPTCHA/progressive auth. Nesse
  // caso, remover o cookie troca a identidade no meio do checkout e pode abrir
  // uma nova tela de login. Só descartamos um token realmente não autorizado.
  if (!singleAttempt && !result.ok && result.status === 401 && userToken) {
    result = await fetch(url, {
      ...init,
      headers: publicCheckoutHeaders('', contentType, cookie),
    });
    fallbackUserToken = '';
  }
  if (!singleAttempt && !result.ok && [401, 403].includes(result.status) && fallbackToAppAuth && hasVtexPaymentCredentials()) {
    result = await fetch(url, {
      ...init,
      headers: checkoutHeaders(fallbackUserToken, contentType, cookie),
    });
  }
  return result;
}

function hasVtexPaymentCredentials() {
  return Boolean(process.env.VTEX_APP_KEY && process.env.VTEX_APP_TOKEN);
}

async function readResponseBody(response) {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function vtexErrorMessage(body, fallback) {
  const candidates = [
    body?.error?.message,
    typeof body?.error === 'string' ? body.error : '',
    body?.message,
    body?.errorMessage,
    body?.errors?.[0]?.message,
  ];
  const message = candidates.find((value) => typeof value === 'string' && value.trim());
  return String(message || fallback).slice(0, 300);
}

function vtexErrorCode(body) {
  return body?.error?.code || body?.code || body?.errorCode || '';
}

function vtexRecaptchaKey(body) {
  const candidates = [
    body?.recaptchaKeyV3,
    body?.recaptchaKey,
    body?.fields?.recaptchaKeyV3,
    body?.fields?.recaptchaKey,
    body?.details?.recaptchaKey,
    body?.error?.recaptchaKey,
    body?.error?.recaptchaKeyV3,
    body?.error?.fields?.recaptchaKeyV3,
    body?.error?.fields?.recaptchaKey,
    body?.error?.details?.recaptchaKey,
  ];
  const key = candidates.find((value) => typeof value === 'string' && value.trim());
  return String(key || '').trim();
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isSafeCheckoutId(value) {
  return /^[A-Za-z0-9-]{16,80}$/.test(String(value || ''));
}

function normalizePaymentSystem(value) {
  const stringValue = String(value || '').trim();
  return /^\d+$/.test(stringValue) ? Number(stringValue) : stringValue;
}

function paymentSystemMatches(orderForm, paymentSystem) {
  const requested = String(paymentSystem);
  const systems = [
    ...(orderForm?.paymentData?.paymentSystems || []),
    ...(orderForm?.paymentData?.payments || []),
  ];
  return systems.some((system) => String(
    system.stringId ?? system.id ?? system.paymentSystem ?? '',
  ) === requested);
}

function normalizeAddress(address) {
  if (!address || typeof address !== 'object') return null;
  return {
    addressType: 'residential',
    receiverName: String(address.receiverName || '').slice(0, 120),
    postalCode: digits(address.postalCode).slice(0, 8),
    street: String(address.street || '').slice(0, 160),
    number: String(address.number || '').slice(0, 30),
    complement: String(address.complement || '').slice(0, 120),
    neighborhood: String(address.neighborhood || '').slice(0, 120),
    city: String(address.city || '').slice(0, 120),
    state: String(address.state || '').slice(0, 2).toUpperCase(),
    country: 'BRA',
  };
}

function paymentSystemKind(orderForm, paymentSystem, requestedKind) {
  const requested = String(requestedKind || '').toLowerCase();
  const system = [
    ...(orderForm?.paymentData?.paymentSystems || []),
    ...(orderForm?.paymentData?.payments || []),
  ].find((item) => String(item.stringId ?? item.id ?? item.paymentSystem ?? '') === String(paymentSystem));
  const label = `${system?.name || ''} ${system?.groupName || ''} ${system?.group || ''}`.toLowerCase();
  if (label.includes('pix') || label.includes('instant')) return 'pix';
  if (label.includes('cart') || label.includes('card') || label.includes('credit')) return 'card';
  return requested === 'pix' || requested === 'card' ? requested : '';
}

function buildPaymentFields({ kind, card, document, address, accountId = '', bin = '' }) {
  const fields = {
    accountId: String(card?.accountId || accountId || ''),
    address: normalizeAddress(address),
  };
  if (kind === 'card') {
    fields.holderName = String(card?.holderName || '').trim().slice(0, 120);
    fields.cardNumber = digits(card?.cardNumber);
    fields.validationCode = digits(card?.validationCode);
    fields.dueDate = String(card?.dueDate || '').trim();
    fields.document = digits(document);
    fields.bin = digits(bin).slice(0, 6);
  }
  return fields;
}

function validateCardFields(card, document) {
  const cardNumber = digits(card?.cardNumber);
  const validationCode = digits(card?.validationCode);
  const dueDate = String(card?.dueDate || '').trim();
  if (cardNumber.length < 13 || cardNumber.length > 19) return 'Informe um número de cartão válido.';
  if (!String(card?.holderName || '').trim()) return 'Informe o nome do titular do cartão.';
  if (validationCode.length < 3 || validationCode.length > 4) return 'Informe um código de segurança válido.';
  if (!/^((0[1-9])|(1[0-2]))\/\d{2}$/.test(dueDate)) return 'Informe a validade do cartão no formato MM/AA.';
  if (digits(document).length !== 11) return 'Informe um CPF válido para o pagamento.';
  return '';
}

function paymentGatewayUrl(_transactionBody, transactionId) {
  // A `receiverUri` returned by older Checkout responses can still point to
  // the retired vtexpayments.com.br/split route. The current Send Payments
  // endpoint is account-scoped and must be used for both regular and split
  // marketplace transactions.
  return `${vtexVaultBaseUrl}/api/payments/transactions/${encodeURIComponent(transactionId)}/payments`;
}

function extractPaymentApp(...bodies) {
  const collection = bodies.flatMap((body) => Array.isArray(body?.paymentAuthorizationAppCollection)
    ? body.paymentAuthorizationAppCollection
    : []);
  const app = collection.find((item) => /pix/i.test(String(item?.appName || ''))) || collection[0];
  if (!app) return null;
  const serializedPayload = app.appPayload ?? app.payload ?? app.paymentAppData?.payload ?? '';
  return {
    appName: String(app.appName || ''),
    appPayload: typeof serializedPayload === 'string' ? serializedPayload : JSON.stringify(serializedPayload),
  };
}

function normalizeTransactionStatus(body) {
  const value = String(
    body?.status
      || body?.transactionStatus
      || body?.payments?.[0]?.status
      || body?.payments?.[0]?.paymentStatus
      || '',
  ).toLowerCase();
  if (['approved', 'authorized', 'completed', 'captured', 'settled'].includes(value)) return 'completed';
  if (['denied', 'declined', 'canceled', 'cancelled', 'failed', 'rejected'].includes(value)) return 'failed';
  return 'waiting';
}

function extractSetCookie(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie().join(', ');
  return response.headers.get('set-cookie') || '';
}

function extractCookieValue(cookieHeader, name) {
  const match = String(cookieHeader || '').match(new RegExp(`${name}=([^;]+)`, 'i'));
  return match?.[1] || '';
}

function transactionAuthCookie(response) {
  const raw = extractSetCookie(response);
  const vtexAuth = extractCookieValue(raw, 'Vtex_CHKO_Auth');
  const checkoutAccess = extractCookieValue(raw, 'CheckoutDataAccess');
  return [
    vtexAuth ? `Vtex_CHKO_Auth=${vtexAuth}` : '',
    checkoutAccess ? `CheckoutDataAccess=${checkoutAccess}` : '',
  ].filter(Boolean).join('; ');
}

function normalizeCookieHeader(raw) {
  return String(raw || '').split(/,(?=[A-Za-z0-9_.-]+=)/).map((part) => part.trim().split(';')[0]).filter(Boolean).join('; ');
}

function tokenFromCookie(cookieHeader) {
  const match = String(cookieHeader || '').match(/VtexIdclientAutCookie(?:_[^=]+)?=([^;]+)/i);
  return match?.[1] || '';
}

function sessionHeaders(email, token = '') {
  const stored = customerVtexSessions.get(email) || {};
  const authToken = stored.authToken || token;
  const headers = { ...vtexHeaders() };
  if (stored.cookieHeader) headers.Cookie = stored.cookieHeader;
  if (authToken) {
    headers.VtexIdclientAutCookie = authToken;
    if (!headers.Cookie) headers.Cookie = `VtexIdclientAutCookie_${account}=${authToken}; VtexIdclientAutCookie=${authToken}`;
  }
  return headers;
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  return {
    id: profile.id || profile.Id || '',
    userId: profile.userId || profile.UserId || '',
    email: profile.email || profile.userEmail || '',
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    document: profile.document || '',
    documentType: profile.documentType || 'cpf',
    phone: profile.phone || profile.homePhone || '',
    homePhone: profile.homePhone || profile.phone || '',
    businessPhone: profile.businessPhone || '',
    birthDate: profile.birthDate || '',
    gender: profile.gender || '',
    isNewsletterOptIn: Boolean(profile.isNewsletterOptIn),
  };
}

async function searchCustomerByEmail(email) {
  const fields = 'id,userId,email,firstName,lastName,document,documentType,phone,homePhone,businessPhone,birthDate,gender,isNewsletterOptIn';
  const url = new URL(`${vtexBaseUrl}/api/dataentities/CL/search`);
  url.searchParams.set('_fields', fields);
  url.searchParams.set('_where', `email=${email}`);
  url.searchParams.set('_size', '1');
  const response = await fetch(url, { headers: vtexHeaders() });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`VTEX Master Data retornou HTTP ${response.status}.`);
  return Array.isArray(body) ? normalizeProfile(body[0]) : null;
}

async function updateCustomerByEmail(email, profile) {
  const current = await searchCustomerByEmail(email);
  const payload = {
    email,
    firstName: profile.firstName ?? current?.firstName ?? '',
    lastName: profile.lastName ?? current?.lastName ?? '',
    document: profile.document ?? current?.document ?? '',
    documentType: profile.documentType ?? current?.documentType ?? 'cpf',
    phone: profile.phone ?? current?.phone ?? '',
    homePhone: profile.homePhone ?? current?.homePhone ?? profile.phone ?? current?.homePhone ?? '',
    birthDate: profile.birthDate ?? current?.birthDate ?? '',
    gender: profile.gender ?? current?.gender ?? '',
    isNewsletterOptIn: profile.isNewsletterOptIn ?? current?.isNewsletterOptIn ?? false,
  };
  const url = current?.id
    ? `${vtexBaseUrl}/api/dataentities/CL/documents/${encodeURIComponent(current.id)}`
    : `${vtexBaseUrl}/api/dataentities/CL/documents`;
  const response = await fetch(url, {
    method: current?.id ? 'PATCH' : 'POST',
    headers: { ...vtexHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`VTEX Master Data retornou HTTP ${response.status} ao salvar.`);
  return searchCustomerByEmail(email);
}

function normalizeCustomerAddress(document = {}) {
  const documentId = document.id || document.Id || document.documentId || '';
  const addressId = document.addressId || document.addressName || documentId;
  return {
    id: String(addressId || documentId),
    documentId: String(documentId),
    addressName: document.addressName || '',
    addressType: document.addressType || 'residential',
    receiverName: document.receiverName || '',
    street: document.street || '',
    number: document.number || '',
    complement: document.complement || '',
    neighborhood: document.neighborhood || '',
    city: document.city || '',
    state: document.state || '',
    country: document.country || 'BRA',
    postalCode: document.postalCode || '',
    reference: document.reference || '',
  };
}

async function searchCustomerAddressesByEmail(email) {
  const profile = await searchCustomerByEmail(email).catch(() => null);
  const identities = [...new Set([profile?.userId, profile?.id, email].map((value) => String(value || '').trim()).filter(Boolean))];
  const fields = 'id,addressId,userId,email,userEmail,addressName,addressType,receiverName,street,number,complement,neighborhood,city,state,country,postalCode,reference';
  const whereClauses = identities.flatMap((identity) => [
    `userId=${identity}`, `userId="${identity}"`,
    `email=${identity}`, `email="${identity}"`,
    `userEmail=${identity}`, `userEmail="${identity}"`,
  ]);

  const documents = (await Promise.all(whereClauses.map(async (where) => {
    const url = new URL(`${vtexBaseUrl}/api/dataentities/AD/search`);
    url.searchParams.set('_fields', fields);
    url.searchParams.set('_where', where);
    url.searchParams.set('_size', '100');
    const result = await fetch(url, { headers: vtexHeaders() }).catch(() => null);
    if (!result?.ok) return [];
    const body = await result.json().catch(() => []);
    return Array.isArray(body) ? body : [];
  }))).flat();

  return [...new Map(documents.map((document) => {
    const address = normalizeCustomerAddress(document);
    return [address.id || address.documentId, address];
  })).values()].filter((address) => address.id || address.street || address.postalCode);
}

function normalizeWishlistIds(value) {
  if (Array.isArray(value)) return value.flatMap(normalizeWishlistIds).map(String).filter(Boolean);
  if (typeof value === 'number') return [String(value)];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try { return normalizeWishlistIds(JSON.parse(trimmed)); } catch { return trimmed.split(',').map((item) => item.trim()).filter(Boolean); }
  }
  if (value && typeof value === 'object') {
    const record = value;
    return normalizeWishlistIds(record.productId ?? record.ProductId ?? record.productIds ?? record.products ?? record.items ?? record.listItems ?? record.ListItemsWrapper ?? record.ListItems ?? record.wishlist ?? record.data ?? record.result ?? record.id);
  }
  return [];
}

function scalarValues(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number') return [String(value).trim()];
  if (Array.isArray(value)) return value.flatMap(scalarValues);
  if (typeof value === 'object') return Object.values(value).flatMap(scalarValues);
  return [];
}

function extractProductIdsFromDocument(document) {
  if (!document || typeof document !== 'object') return [];
  const ids = [];
  for (const [key, value] of Object.entries(document)) {
    if (/wishlist|product|sku|favorite|favourite|favorit|item/i.test(key)) ids.push(...normalizeWishlistIds(value));
  }
  return [...new Set(ids)];
}

async function discoverWishlistAcrossEntities(email, identityValues, knownEntities) {
  const catalog = await fetch(`${vtexBaseUrl}/api/dataentities?_size=200`, { headers: vtexHeaders() })
    .then(async (result) => result.ok ? result.json() : [])
    .then((body) => Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [])
    .catch(() => []);
  const entities = [...new Set(catalog.map((item) => String(item?.acronym || item?.entityName || item?.name || '').trim()).filter(Boolean))]
    .filter((entity) => !knownEntities.has(entity));
  const results = [];
  for (let index = 0; index < entities.length; index += 8) {
    const batch = entities.slice(index, index + 8);
    const found = await Promise.all(batch.map(async (entity) => {
      const url = new URL(`${vtexBaseUrl}/api/dataentities/${encodeURIComponent(entity)}/search`);
      url.searchParams.set('_fields', '_all');
      url.searchParams.set('_size', '100');
      if (entity.toLowerCase() === 'wishlist') url.searchParams.set('_schema', wishlistSchema);
      const response = await fetch(url, { headers: vtexHeaders() }).catch(() => null);
      if (!response?.ok) return null;
      const documents = await response.json().catch(() => []);
      const list = Array.isArray(documents) ? documents : [];
      for (const document of list) {
        const values = scalarValues(document).map((value) => value.toLowerCase());
        if (!identityValues.some((identity) => values.includes(String(identity).toLowerCase()))) continue;
        const wishlist = extractProductIdsFromDocument(document);
        if (wishlist.length) return { entity, id: document.id || '', wishlist };
      }
      return null;
    }));
    results.push(...found.filter(Boolean));
    if (results.length) break;
  }
  return results[0] || null;
}

function wishlistSessionHeaders(email, token) {
  return { ...sessionHeaders(email, token), 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
}

async function readVtexIoWishlist(email, token) {
  if (!token) return null;
  if (wishlistIoStrategyByEmail.get(email) === 'master-data') return { wishlist: [], source: 'master-data' };
  const endpoints = [
    '/api/io/wishlist/private/list',
    '/api/io/wishlist/private/products',
    '/api/io/wishlist/private/user/products',
    '/api/io/wishlist/products',
    '/api/io/_v/wishlist/products',
    '/api/io/wishlist/pub/products',
  ];
  const publicStoreDomain = String(process.env.VTEX_PUBLIC_STORE_DOMAIN || '').trim().replace(/\/$/, '');
  const publicStoreBaseUrl = publicStoreDomain
    ? (/^https?:\/\//i.test(publicStoreDomain) ? publicStoreDomain : `https://${publicStoreDomain}`)
    : vtexBaseUrl;
  const bases = [...new Set([vtexBaseUrl, publicStoreBaseUrl])];
  const candidates = bases.flatMap((base) => endpoints.map((endpoint) => ({ base, endpoint })));
  const results = await Promise.all(candidates.map(async ({ base, endpoint }) => {
    const url = new URL(`${base}${endpoint}`);
    url.searchParams.set('_nc', String(Date.now()));
    url.searchParams.set('email', email);
    const result = await fetch(url, { headers: wishlistSessionHeaders(email, token), redirect: 'manual' }).catch(() => null);
    const status = result?.status || 0;
    const source = `${new URL(base).host}${endpoint}`;
    console.log(`[WISHLIST] io ${source} -> HTTP ${status}`);
    if (!result?.ok) return { status, source, wishlist: [] };
    const body = await result.json().catch(() => null);
    const ids = normalizeWishlistIds(body?.products ?? body?.items ?? body?.wishlist ?? body?.list ?? body);
    console.log(`[WISHLIST] io ${source} -> items=${ids.length}`);
    return { status, source, wishlist: [...new Set(ids)] };
  }));

  const withItems = results.find((result) => result.wishlist.length > 0);
  if (withItems) {
    wishlistIoStrategyByEmail.set(email, 'vtex-io');
    return { wishlist: withItems.wishlist, source: withItems.source };
  }

  const accessible = results.find((result) => result.status >= 200 && result.status < 300);
  if (accessible) {
    wishlistIoStrategyByEmail.set(email, 'vtex-io');
    return { wishlist: [], source: accessible.source };
  }

  if (results.length > 0 && results.every((result) => [0, 401, 403, 404].includes(result.status))) {
    wishlistIoStrategyByEmail.set(email, 'master-data');
  }
  return null;
}

async function mutateVtexIoWishlist(productId, action, token, email) {
  if (!token) return false;
  const payload = { productId, listName: 'Wishlist', title: 'Wishlist', name: 'Wishlist' };
  const candidates = action === 'add'
    ? [
        { method: 'POST', path: '/api/io/wishlist/products', body: payload },
        { method: 'POST', path: '/api/io/_v/wishlist/products', body: payload },
        { method: 'PUT', path: `/api/io/wishlist/products/${encodeURIComponent(productId)}` },
        { method: 'POST', path: '/api/io/wishlist/add', body: payload },
      ]
    : [
        { method: 'DELETE', path: `/api/io/wishlist/products/${encodeURIComponent(productId)}` },
        { method: 'DELETE', path: `/api/io/_v/wishlist/products/${encodeURIComponent(productId)}` },
        { method: 'POST', path: '/api/io/wishlist/remove', body: payload },
      ];
  for (const candidate of candidates) {
    const result = await fetch(`${vtexBaseUrl}${candidate.path}`, {
      method: candidate.method,
      headers: { ...wishlistSessionHeaders(email, token), ...(candidate.body ? { 'Content-Type': 'application/json' } : {}) },
      ...(candidate.body ? { body: JSON.stringify(candidate.body) } : {}),
    }).catch(() => null);
    if (result?.ok) return true;
  }
  return false;
}

async function getWishlistByEmail(email, token = '') {
  const ioWishlist = await readVtexIoWishlist(email, token);
  const profile = await searchCustomerByEmail(email).catch(() => null);
  const identityValues = [...new Set([email, profile?.id, profile?.userId, profile?.profileId, profile?.shopperId].map((value) => String(value || '').trim()).filter(Boolean))];
  const dynamicEntities = await fetch(`${vtexBaseUrl}/api/dataentities?_size=200`, { headers: vtexHeaders() })
    .then(async (result) => result.ok ? result.json() : [])
    .then((body) => (Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []).map((item) => String(item?.acronym || item?.entityName || item?.name || '').trim()).filter((name) => /wish|favorit/i.test(name)))
    .catch(() => []);
  const entities = [...new Set([...wishlistEntities, ...dynamicEntities])];
  for (const entity of entities) {
    for (const identityField of ['email', 'userEmail', 'customerEmail', 'user', 'userId', 'customerId', 'profileId', 'shopperId', 'owner', 'id']) {
      for (const identityValue of identityValues) {
        const url = new URL(`${vtexBaseUrl}/api/dataentities/${entity}/search`);
        url.searchParams.set('_fields', 'id,email,userEmail,customerEmail,user,userId,customerId,profileId,shopperId,owner,wishlist,ListItemsWrapper,productId,products');
        if (entity.toLowerCase() === 'wishlist') url.searchParams.set('_schema', wishlistSchema);
        url.searchParams.set('_where', `${identityField}=${identityValue}`);
        url.searchParams.set('_size', '10');
        const response = await fetch(url, { headers: vtexHeaders() });
        const body = await response.json().catch(() => []);
        if (!response.ok) continue;
        const documents = Array.isArray(body) ? body : [];
        const document = documents
          .map((item) => ({ item, wrapperItems: normalizeWishlistIds(item?.ListItemsWrapper ?? item?.ListItems ?? []) }))
          .sort((left, right) => right.wrapperItems.length - left.wrapperItems.length)[0]?.item;
        if (!document) continue;
        const wrapperItems = normalizeWishlistIds(document.ListItemsWrapper ?? document.ListItems ?? []);
        const items = wrapperItems.length > 0
          ? wrapperItems
          : normalizeWishlistIds(document.wishlist ?? document.productId ?? document.products ?? document.items ?? []);
        return { id: document.id || '', entity, wishlist: [...new Set([...(ioWishlist?.wishlist || []), ...items])], source: ioWishlist?.source || 'master-data' };
      }
    }
  }
  const discovered = await discoverWishlistAcrossEntities(email, identityValues, new Set(entities));
  if (discovered?.wishlist?.length) return { id: discovered.id, entity: discovered.entity, wishlist: [...new Set([...(ioWishlist?.wishlist || []), ...discovered.wishlist])], source: 'master-data-discovery' };
  return { id: '', entity: ioWishlist?.wishlist?.length ? 'vtex-io' : wishlistEntity, wishlist: ioWishlist?.wishlist || [], source: ioWishlist?.source || 'master-data' };
}

async function saveWishlistByEmail(email, items, token = '', current = null) {
  const resolvedCurrent = current || await getWishlistByEmail(email, token);
  const entity = resolvedCurrent.entity || wishlistEntity;
  const url = resolvedCurrent.id
    ? `${vtexBaseUrl}/api/dataentities/${entity}/documents/${encodeURIComponent(resolvedCurrent.id)}`
    : `${vtexBaseUrl}/api/dataentities/${entity}/documents`;
  const listItems = items.map((productId, index) => ({ Id: index, ProductId: String(productId) }));
  const payload = { email, wishlist: items, ListItemsWrapper: [{ ListItems: listItems, IsPublic: false, Name: 'Wishlist' }] };
  const response = await fetch(url, { method: resolvedCurrent.id ? 'PATCH' : 'POST', headers: { ...vtexHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`VTEX Wishlist (${entity}) retornou HTTP ${response.status} ao salvar.`);
  return { wishlist: items };
}

app.get('/health', (_request, response) => response.json({ ok: true, service: 'wml-backend' }));

app.post('/checkout/order-form/:orderFormId/client-profile', async (request, response) => {
  const orderFormId = String(request.params.orderFormId || '').trim();
  if (!isSafeCheckoutId(orderFormId)) {
    return response.status(400).json({ ok: false, message: 'Carrinho inválido.' });
  }

  const source = request.body && typeof request.body === 'object' ? request.body : {};
  const profile = {
    email: String(source.email || '').trim(),
    ...(source.firstName ? { firstName: String(source.firstName).trim() } : {}),
    ...(source.lastName ? { lastName: String(source.lastName).trim() } : {}),
    ...(source.document ? { document: digits(source.document), documentType: 'cpf' } : {}),
    ...(source.phone ? { phone: digits(source.phone) } : {}),
    ...(source.gender ? { gender: String(source.gender).trim() } : {}),
    ...(source.birthDate ? { birthDate: String(source.birthDate).trim() } : {}),
  };
  if (!profile.email) {
    return response.status(400).json({ ok: false, message: 'Informe o e-mail do cliente.' });
  }

  try {
    // O orderForm é identificado pelo próprio ID. Evitar o cookie do usuário
    // aqui impede que um token antigo do Expo Go bloqueie um attachment público.
    const result = await requestCheckout(
      `${vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(orderFormId)}/attachments/clientProfileData`,
      {
        method: 'POST',
        contentType: true,
        fallbackToAppAuth: true,
        body: JSON.stringify(profile),
      },
    );
    const body = await readResponseBody(result);
    if (!result.ok) {
      return response.status(502).json({
        ok: false,
        code: vtexErrorCode(body),
        message: vtexErrorMessage(body, `A VTEX não conseguiu atualizar os dados pessoais (HTTP ${result.status}).`),
      });
    }
    return response.json(body);
  } catch (error) {
    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Não foi possível atualizar os dados pessoais.',
    });
  }
});

app.post('/checkout/order', async (request, response) => {
  const orderFormId = String(request.body?.orderFormId || '').trim();
  const paymentSystem = String(request.body?.paymentSystem || '').trim();
  const requestedKind = String(request.body?.paymentKind || '').trim().toLowerCase();
  const userToken = String(request.headers.vtexidclientautcookie || '').trim();

  if (!isSafeCheckoutId(orderFormId) || !paymentSystem) {
    return response.status(400).json({ ok: false, message: 'Carrinho ou forma de pagamento inválidos.' });
  }

  try {
    const orderFormResult = await requestCheckout(
      `${vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(orderFormId)}`,
      { userToken, fallbackToAppAuth: true },
    );
    const orderForm = await readResponseBody(orderFormResult);
    if (!orderFormResult.ok) {
      return response.status(502).json({
        ok: false,
        code: vtexErrorCode(orderForm),
        message: vtexErrorMessage(orderForm, `Não foi possível consultar o carrinho na VTEX (HTTP ${orderFormResult.status}).`),
      });
    }

    const orderValue = Number(orderForm?.value || 0);
    if (!Array.isArray(orderForm?.items) || orderForm.items.length === 0 || !Number.isInteger(orderValue) || orderValue <= 0) {
      return response.status(400).json({ ok: false, message: 'O carrinho está vazio ou não possui um valor válido.' });
    }
    if (!paymentSystemMatches(orderForm, paymentSystem)) {
      return response.status(400).json({ ok: false, message: 'A forma de pagamento não está disponível para este carrinho.' });
    }

    const kind = paymentSystemKind(orderForm, paymentSystem, requestedKind);
    if (!kind) {
      return response.status(400).json({ ok: false, message: 'Não foi possível identificar a forma de pagamento.' });
    }
    const document = String(request.body?.document || '');
    if (kind === 'card') {
      const cardError = validateCardFields(request.body?.card, document);
      if (cardError) return response.status(400).json({ ok: false, message: cardError });
    }

    const transactionPayload = {
      referenceId: orderFormId,
      value: orderValue,
      referenceValue: orderValue,
      interestValue: 0,
      savePersonalData: Boolean(request.body?.savePersonalData),
      optinNewsLetter: Boolean(request.body?.optinNewsLetter),
    };
    if (request.body?.captchaToken && request.body?.captchaSiteKey) {
      transactionPayload.recaptchaToken = String(request.body.captchaToken);
      transactionPayload.recaptchaKey = String(request.body.captchaSiteKey);
    }

    const transactionResult = await requestCheckout(
      `${vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(orderFormId)}/transaction`,
      {
        method: 'POST',
        // Preserve the authenticated VTEX identity for both payment types.
        // A logged-in customer may be using a newly entered address; removing
        // the token makes Checkout reject the transaction with a login error.
        // Guests still make a public request because userToken is empty.
        userToken,
        contentType: true,
        // PIX pode refazer apenas a autenticação porque não carrega token de
        // uso único. Cartão deve fazer exatamente uma chamada por token.
        fallbackToAppAuth: kind === 'pix',
        singleAttempt: kind === 'card',
        body: JSON.stringify(transactionPayload),
      },
    );
    const transactionBody = await readResponseBody(transactionResult);
    if (!transactionResult.ok) {
      const transactionErrorCode = vtexErrorCode(transactionBody);
      const requestedRecaptchaKey = vtexRecaptchaKey(transactionBody);
      console.warn(
        `[CHECKOUT] transaction rejected -> HTTP ${transactionResult.status}`
          + ` code=${transactionErrorCode || 'unknown'}`
          + ` recaptcha=${Boolean(requestedRecaptchaKey)}`
          + ` tokenSent=${Boolean(transactionPayload.recaptchaToken)}`,
      );
      return response.status(502).json({
        ok: false,
        code: transactionErrorCode,
        recaptchaKey: requestedRecaptchaKey || undefined,
        message: vtexErrorMessage(transactionBody, 'A VTEX não conseguiu iniciar a transação.'),
      });
    }

    const orderGroup = String(transactionBody?.orderGroup || transactionBody?.orderId || '').trim();
    const transactionId = String(
      transactionBody?.transactionId
        || transactionBody?.id
        || transactionBody?.merchantTransactions?.[0]?.transactionId
        || '',
    ).trim();
    if (!orderGroup || !transactionId) {
      return response.status(502).json({ ok: false, message: 'A VTEX iniciou a transação sem retornar seus identificadores.' });
    }
    console.info(`[CHECKOUT] transaction created -> payment=${kind} order=${orderGroup} transaction=${transactionId}`);

    const transactionPayments = [
      ...(transactionBody?.paymentData?.payments || []),
      ...(transactionBody?.payments || []),
    ];
    const payment = transactionPayments.find((item) => String(item?.paymentSystem) === paymentSystem)
      || transactionPayments[0]
      || transactionBody?.merchantTransactions?.[0]?.payments?.find((item) => String(item?.paymentSystem) === paymentSystem)
      || transactionBody?.merchantTransactions?.[0]?.payments?.[0]
      || {};
    const merchantSellerPayment = payment?.merchantSellerPayments?.[0] || {};
    const installments = Number(merchantSellerPayment?.installments || payment?.installments || 1);
    const installmentsInterestRate = Number(merchantSellerPayment?.interestRate ?? payment?.installmentsInterestRate ?? 0);
    const installmentsValue = Number(merchantSellerPayment?.installmentValue ?? payment?.installmentsValue ?? payment?.value ?? orderValue);
    const paymentValue = Number(merchantSellerPayment?.value ?? payment?.value ?? orderValue);
    const paymentReferenceValue = Number(merchantSellerPayment?.referenceValue ?? payment?.referenceValue ?? orderValue);
    const paymentPayload = [{
      paymentSystem: normalizePaymentSystem(payment?.paymentSystem ?? paymentSystem),
      installments,
      currencyCode: 'BRL',
      value: paymentValue,
      installmentsInterestRate,
      installmentsValue,
      referenceValue: paymentReferenceValue,
      fields: kind === 'card' ? buildPaymentFields({
        kind,
        card: request.body?.card,
        document,
        address: request.body?.address,
        accountId: payment?.accountId || '',
        bin: payment?.bin || request.body?.card?.bin || '',
      }) : {},
      ...(kind === 'card' ? {
        hasDefaultBillingAddress: true,
        isLuhnValid: true,
        bin: payment?.bin || request.body?.card?.bin || '',
        isBillingAddressDifferent: false,
        chooseToUseNewCard: true,
        isRegexValid: true,
      } : {}),
      transaction: {
        id: transactionId,
        merchantName: account,
      },
    }];

    let paymentUrl;
    try {
      paymentUrl = paymentGatewayUrl(transactionBody, transactionId, orderGroup);
    } catch (error) {
      return response.status(502).json({ ok: false, orderGroup, transactionId, message: error.message });
    }

    const paymentResult = await requestCheckout(paymentUrl, {
      method: 'POST',
      userToken,
      contentType: true,
      fallbackToAppAuth: true,
      body: JSON.stringify(paymentPayload),
    });
    const paymentBody = await readResponseBody(paymentResult);
    if (!paymentResult.ok) {
      console.warn(
        `[CHECKOUT] payment rejected -> HTTP ${paymentResult.status}`
          + ` code=${vtexErrorCode(paymentBody) || 'unknown'}`,
      );
      return response.json({
        ok: true,
        status: 'payment_failed',
        phase: 'payment',
        orderId: orderGroup,
        orderGroup,
        transactionId,
        code: vtexErrorCode(paymentBody),
        message: vtexErrorMessage(paymentBody, 'A VTEX criou a transação, mas o pagamento não foi autorizado.'),
      });
    }

    const callbackResult = await requestCheckout(
      `${vtexBaseUrl}/api/checkout/pub/gatewayCallback/${encodeURIComponent(orderGroup)}`,
      {
        method: 'POST',
        userToken,
        contentType: true,
        cookie: transactionAuthCookie(transactionResult),
        fallbackToAppAuth: true,
      },
    );
    const callbackBody = await readResponseBody(callbackResult);
    const paymentApp = extractPaymentApp(transactionBody, paymentBody, callbackBody);
    if (!callbackResult.ok) {
      return response.json({
        ok: true,
        status: paymentApp ? 'pending_payment' : 'payment_failed',
        phase: 'authorization',
        orderId: orderGroup,
        orderGroup,
        transactionId,
        paymentApp,
        code: vtexErrorCode(callbackBody),
        message: vtexErrorMessage(callbackBody, 'A VTEX criou a transação, mas não confirmou o pagamento.'),
      });
    }

    const callbackStatus = normalizeTransactionStatus(callbackBody);
    const status = paymentApp || (callbackResult.status !== 204 && callbackStatus === 'waiting')
      ? 'pending_payment'
      : callbackStatus === 'failed' ? 'payment_failed' : 'completed';

    return response.json({
      ok: true,
      status,
      orderId: orderGroup,
      orderGroup,
      transactionId,
      paymentId: payment?.paymentId || payment?.id || '',
      paymentApp,
      message: status === 'completed'
        ? 'Pedido processado com sucesso.'
        : status === 'pending_payment'
          ? 'Aguardando a confirmação do pagamento.'
          : 'A VTEX criou a transação, mas o pagamento não foi autorizado.',
    });
  } catch (error) {
    console.error(`[CHECKOUT] order ${orderFormId} -> error`);
    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Não foi possível finalizar o pedido.',
    });
  }
});

app.get('/checkout/transaction/:transactionId/status', async (request, response) => {
  const transactionId = String(request.params.transactionId || '').trim();
  const orderGroup = String(request.query.orderGroup || '').trim();
  const paymentId = String(request.query.paymentId || '').trim();
  const userToken = String(request.headers.vtexidclientautcookie || '').trim();
  if (!isSafeCheckoutId(transactionId)) {
    return response.status(400).json({ ok: false, message: 'Transação inválida.' });
  }

  try {
    const statusUrl = paymentId
      ? `${vtexBaseUrl}/_v/private/pix/status/${encodeURIComponent(transactionId)}/payments/${encodeURIComponent(paymentId)}`
      : `${vtexPaymentsBaseUrl}/api/pvt/transactions/${encodeURIComponent(transactionId)}`;
    const result = await requestCheckout(
      statusUrl,
      { userToken, fallbackToAppAuth: true },
    );
    const body = await readResponseBody(result);
    if (!result.ok) {
      return response.status(502).json({
        ok: false,
        message: vtexErrorMessage(body, 'Não foi possível consultar o status do pagamento.'),
      });
    }
    const payment = body?.payments?.[0] || body?.merchantTransactions?.[0]?.payments?.[0] || {};
    return response.json({
      ok: true,
      status: normalizeTransactionStatus(body),
      orderId: orderGroup || body?.orderGroup || body?.orderId || '',
      paymentId: payment.paymentId || payment.id || '',
    });
  } catch (error) {
    return response.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Não foi possível consultar o status do pagamento.',
    });
  }
});

app.post('/checkout/order-form/:orderFormId/items', async (request, response) => {
  const orderFormId = String(request.params.orderFormId || '').trim();
  const requestedItems = Array.isArray(request.body?.orderItems) ? request.body.orderItems : [];
  if (!orderFormId || requestedItems.length === 0) return response.status(400).json({ ok: false, message: 'Carrinho e item são obrigatórios.' });

  const requested = requestedItems[0] || {};
  const index = Number(requested.index);
  const quantity = Number(requested.quantity);
  const seller = String(requested.seller || '').trim();
  if (!Number.isInteger(index) || !Number.isInteger(quantity) || quantity < 0) return response.status(400).json({ ok: false, message: 'Índice ou quantidade inválidos.' });

  const candidates = quantity === 0
    ? [
        { orderItems: [{ index, quantity: 0 }] },
        { orderItems: [{ index, quantity: 0, ...(seller ? { seller } : {}) }] },
        { orderItems: [{ index, quantity: 0, ...(seller ? { seller } : {}) }], noSplitItem: true },
      ]
    : [{ orderItems: [{ index, quantity, ...(seller ? { seller } : {}) }], noSplitItem: true }];

  let lastResult = null;
  let lastBody = null;
  for (const candidate of candidates) {
    const result = await fetch(`${vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(orderFormId)}/items/update?allowedOutdatedData=paymentData`, {
      method: 'POST',
      // A edição dos itens é vinculada ao orderFormId. Não encaminhamos a
      // sessão do VTEX ID aqui: misturá-la com um orderForm criado pela sessão
      // pública pode fazer o Checkout rejeitar a chamada com HTTP 401.
      headers: { ...vtexHeaders(), 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      body: JSON.stringify(candidate),
    }).catch(() => null);
    if (!result) continue;
    const body = await result.json().catch(() => null);
    const code = body?.error?.code || body?.code || '';
    console.log(`[CART] index=${index} quantity=${quantity} seller=${seller || '-'} -> HTTP ${result.status}${code ? ` ${code}` : ''}`);
    lastResult = result;
    lastBody = body;
    if (result.ok) return response.json(body);
    if (!['CHK0023', 'CHK0024'].includes(code)) break;
  }

  return response.status(lastResult?.status || 502).json(lastBody || { ok: false, message: 'Não foi possível atualizar o carrinho VTEX.' });
});

app.post('/auth/login', async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase();
  const password = String(request.body?.password || '');
  if (!email || !password) return response.status(400).json({ ok: false, message: 'E-mail e senha são obrigatórios.' });
  try {
    const start = await fetch(`${vtexBaseUrl}/api/vtexid/pub/authentication/start?scope=${encodeURIComponent(account)}&fingerprint=lojahr-${Date.now()}`);
    const startBody = await start.json().catch(() => ({}));
    if (!start.ok || !startBody.authenticationToken) throw new Error('Não foi possível iniciar a autenticação VTEX.');
    const form = new FormData();
    form.append('login', email);
    form.append('password', password);
    form.append('authenticationToken', startBody.authenticationToken);
    const result = await fetch(`${vtexBaseUrl}/api/vtexid/pub/authentication/classic/validate`, { method: 'POST', headers: { Cookie: `_vss=${startBody.authenticationToken}` }, body: form });
    const body = await result.json().catch(() => ({}));
    const cookieHeader = normalizeCookieHeader(extractSetCookie(result));
    const authToken = body?.authCookie?.Value || body?.token || tokenFromCookie(cookieHeader);
    if (!result.ok || (!authToken && !cookieHeader)) throw new Error(body?.message || 'E-mail ou senha inválidos.');
    customerVtexSessions.set(email, { authToken, cookieHeader, updatedAt: Date.now() });
    console.log(`[AUTH] ${email} -> password session cookie=${Boolean(cookieHeader)} token=${Boolean(authToken)}`);
    return response.json({ ok: true, authCookie: { Value: authToken } });
  } catch (error) {
    return response.status(401).json({ ok: false, message: error instanceof Error ? error.message : 'Falha no login.' });
  }
});

app.post('/auth/access-key/validate', async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase();
  const accessKey = String(request.body?.accessKey || '').trim();
  const authenticationToken = String(request.body?.authenticationToken || '').trim();
  if (!email || !accessKey || !authenticationToken) return response.status(400).json({ ok: false, message: 'Dados de autenticação incompletos.' });
  try {
    const form = new FormData();
    form.append('accesskey', accessKey);
    form.append('login', email);
    const result = await fetch(`${vtexBaseUrl}/api/vtexid/pub/authentication/accesskey/validate`, { method: 'POST', headers: { Cookie: `_vss=${authenticationToken}` }, body: form });
    const body = await result.json().catch(() => ({}));
    const cookieHeader = normalizeCookieHeader(extractSetCookie(result));
    const authToken = body?.authCookie?.Value || body?.token || tokenFromCookie(cookieHeader);
    if (!result.ok || (!authToken && !cookieHeader)) throw new Error('Código de acesso inválido.');
    customerVtexSessions.set(email, { authToken, cookieHeader, updatedAt: Date.now() });
    console.log(`[AUTH] ${email} -> access-key session cookie=${Boolean(cookieHeader)} token=${Boolean(authToken)}`);
    return response.json({ ok: true, authCookie: { Value: authToken } });
  } catch (error) {
    return response.status(401).json({ ok: false, message: error instanceof Error ? error.message : 'Falha ao validar o código.' });
  }
});

app.get('/customer/profile', async (request, response) => {
  const email = String(request.query.email || '').trim().toLowerCase();
  if (!email) return response.status(400).json({ ok: false, message: 'Informe o e-mail do cliente.' });

  try {
    const profile = await searchCustomerByEmail(email);
    console.log(`[PROFILE] ${email} -> ${profile ? 'found' : 'not-found'}`);
    return response.json({ ok: true, profile });
  } catch (error) {
    console.error(`[PROFILE] ${email} -> error`);
    return response.status(502).json({ ok: false, message: error instanceof Error ? error.message : 'Falha ao consultar o perfil VTEX.' });
  }
});

app.get('/customer/addresses', async (request, response) => {
  const email = String(request.query.email || '').trim().toLowerCase();
  if (!email) return response.status(400).json({ ok: false, message: 'Informe o e-mail do cliente.' });
  try {
    const addresses = await searchCustomerAddressesByEmail(email);
    console.log(`[ADDRESS] ${email} -> count=${addresses.length}`);
    return response.json({ ok: true, addresses });
  } catch (error) {
    console.error(`[ADDRESS] ${email} -> error`);
    return response.status(502).json({ ok: false, message: error instanceof Error ? error.message : 'Falha ao consultar endereços.' });
  }
});

app.get('/customer/wishlist', async (request, response) => {
  const email = String(request.query.email || '').trim().toLowerCase();
  if (!email) return response.status(400).json({ ok: false, message: 'Informe o e-mail do cliente.' });
  try {
    const token = String(request.headers.vtexidclientautcookie || '').trim();
    const result = await getWishlistByEmail(email, token);
    console.log(`[WISHLIST] ${email} -> token=${Boolean(token)}`);
    console.log(`[WISHLIST] ${email} -> read source=${result.source || result.entity} count=${result.wishlist?.length || 0}`);
    return response.json({ ok: true, ...result });
  }
  catch (error) { console.error(`[WISHLIST] ${email} -> read-error: ${error instanceof Error ? error.message : 'unknown'}`); return response.status(502).json({ ok: false, message: error instanceof Error ? error.message : 'Falha ao carregar favoritos.' }); }
});

app.post('/customer/wishlist/toggle', async (request, response) => {
  const email = String(request.body?.email || '').trim().toLowerCase();
  const productId = String(request.body?.productId || '').trim();
  if (!email || !productId) return response.status(400).json({ ok: false, message: 'E-mail e produto são obrigatórios.' });
  try {
    const token = String(request.headers.vtexidclientautcookie || '').trim();
    const current = await getWishlistByEmail(email, token);
    const favorite = !current.wishlist.includes(productId);
    const wishlist = favorite ? [...current.wishlist, productId] : current.wishlist.filter((id) => id !== productId);
    const usesVtexIo = String(current.source || '').includes('/api/io/');
    const ioUpdated = usesVtexIo ? await mutateVtexIoWishlist(productId, favorite ? 'add' : 'remove', token, email) : false;
    if (!ioUpdated) await saveWishlistByEmail(email, wishlist, token, current);
    const source = ioUpdated ? 'vtex-io' : 'master-data';
    console.log(`[WISHLIST] ${email} -> ${favorite ? 'added' : 'removed'} source=${source} count=${wishlist.length}`);
    return response.json({ ok: true, favorite, wishlist, source });
  } catch (error) { console.error(`[WISHLIST] ${email} -> update-error: ${error instanceof Error ? error.message : 'unknown'}`); return response.status(502).json({ ok: false, message: error instanceof Error ? error.message : 'Falha ao salvar favorito.' }); }
});

app.patch('/customer/profile/:email', async (request, response) => {
  const email = String(request.params.email || '').trim().toLowerCase();
  if (!email) return response.status(400).json({ ok: false, message: 'Informe o e-mail do cliente.' });
  try {
    const profile = await updateCustomerByEmail(email, request.body || {});
    console.log(`[PROFILE] ${email} -> updated`);
    return response.json({ ok: true, profile });
  } catch (error) {
    console.error(`[PROFILE] ${email} -> update-error`);
    return response.status(502).json({ ok: false, message: error instanceof Error ? error.message : 'Falha ao salvar o perfil VTEX.' });
  }
});

function customerAuthHeaders(request) {
  const token = String(request.headers['vtexidclientautcookie'] || '').trim();
  return token ? { VtexIdclientAutCookie: token } : {};
}

async function enrichOrderList(orders) {
  const list = Array.isArray(orders) ? orders : [];
  return Promise.all(list.map(async (summary) => {
    const id = summary?.orderId || summary?.orderGroup;
    if (!id || Array.isArray(summary.items) && summary.items.length) return summary;
    const detail = await fetch(`${vtexBaseUrl}/api/oms/pvt/orders/${encodeURIComponent(id)}`, { headers: vtexHeaders() }).then(async (result) => result.ok ? result.json() : null).catch(() => null);
    return detail ? { ...summary, ...detail } : summary;
  }));
}

app.get('/customer/orders', async (request, response) => {
  try {
    const url = new URL(`${vtexBaseUrl}/api/oms/user/orders`);
    url.searchParams.set('page', String(request.query.page || '1'));
    url.searchParams.set('per_page', String(request.query.per_page || '50'));
    const result = await fetch(url, { headers: { ...vtexHeaders(), ...customerAuthHeaders(request) } });
    const body = await result.json().catch(() => ({}));
    console.log(`[ORDERS] list -> HTTP ${result.status}`);
    if (result.ok) {
      const orders = await enrichOrderList(Array.isArray(body) ? body : body.list || body.orders || []);
      return response.json({ ok: true, orders });
    }

    // Fallback server-side: some accounts do not expose /oms/user/orders to
    // the storefront token. The private OMS request remains protected here.
    const email = String(request.query.email || '').trim().toLowerCase();
    if (email) {
      const privateUrl = new URL(`${vtexBaseUrl}/api/oms/pvt/orders`);
      privateUrl.searchParams.set('q', email);
      privateUrl.searchParams.set('page', '1');
      privateUrl.searchParams.set('per_page', '50');
      const privateResult = await fetch(privateUrl, { headers: vtexHeaders() });
      const privateBody = await privateResult.json().catch(() => ({}));
      console.log(`[ORDERS] private fallback -> HTTP ${privateResult.status}`);
      if (privateResult.ok) {
        const orders = await enrichOrderList(Array.isArray(privateBody) ? privateBody : privateBody.list || privateBody.orders || []);
        return response.json({ ok: true, orders });
      }
    }
    throw new Error(`VTEX Orders retornou HTTP ${result.status}.`);
  } catch (error) {
    return response.status(502).json({ ok: false, message: error instanceof Error ? error.message : 'Falha ao carregar pedidos.' });
  }
});

app.get('/customer/orders/:orderId', async (request, response) => {
  try {
    const orderId = encodeURIComponent(request.params.orderId);
    const result = await fetch(`${vtexBaseUrl}/api/oms/user/orders/${orderId}`, { headers: { ...vtexHeaders(), ...customerAuthHeaders(request) } });
    const body = await result.json().catch(() => ({}));
    console.log(`[ORDERS] detail ${request.params.orderId} -> HTTP ${result.status}`);
    if (result.ok) return response.json({ ok: true, order: body });

    const privateResult = await fetch(`${vtexBaseUrl}/api/oms/pvt/orders/${orderId}`, { headers: vtexHeaders() });
    const privateBody = await privateResult.json().catch(() => ({}));
    console.log(`[ORDERS] detail private fallback ${request.params.orderId} -> HTTP ${privateResult.status}`);
    if (privateResult.ok) return response.json({ ok: true, order: privateBody });
    throw new Error(`VTEX Orders retornou HTTP ${result.status} / fallback ${privateResult.status}.`);
  } catch (error) {
    return response.status(502).json({ ok: false, message: error instanceof Error ? error.message : 'Falha ao carregar detalhes do pedido.' });
  }
});

app.listen(port, '0.0.0.0', () => console.log(`wml-backend running on port ${port}`));

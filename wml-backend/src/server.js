import 'dotenv/config';
import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 6001);
const account = process.env.VTEX_ACCOUNT || 'lojabl';
const domain = process.env.VTEX_STORE_DOMAIN || `${account}.myvtex.com`;
const vtexBaseUrl = `https://${domain}`;
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
const wishlistEntity = process.env.VTEX_WISHLIST_ENTITY || 'wishlist';
const wishlistSchema = process.env.VTEX_WISHLIST_SCHEMA || 'wishlist';
const wishlistEntities = [...new Set([wishlistEntity, 'wishlist', 'WL', 'wl', 'WI', 'wi'])];
const customerVtexSessions = new Map();

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '1mb' }));

function vtexHeaders() {
  const headers = { Accept: 'application/json' };
  if (process.env.VTEX_APP_KEY) headers['X-VTEX-API-AppKey'] = process.env.VTEX_APP_KEY;
  if (process.env.VTEX_APP_TOKEN) headers['X-VTEX-API-AppToken'] = process.env.VTEX_APP_TOKEN;
  return headers;
}

function extractSetCookie(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie().join(', ');
  return response.headers.get('set-cookie') || '';
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
  const endpoints = [
    '/api/io/wishlist/private/list',
    '/api/io/wishlist/private/products',
    '/api/io/wishlist/private/user/products',
    '/api/io/wishlist/products',
    '/api/io/_v/wishlist/products',
    '/api/io/wishlist/pub/products',
  ];
  const bases = [...new Set([vtexBaseUrl, 'https://www.lojabl.com.br'])];
  for (const base of bases) for (const endpoint of endpoints) {
    const url = new URL(`${base}${endpoint}`);
    url.searchParams.set('_nc', String(Date.now()));
    url.searchParams.set('email', email);
    const result = await fetch(url, { headers: wishlistSessionHeaders(email, token), redirect: 'manual' }).catch(() => null);
    console.log(`[WISHLIST] io ${new URL(base).host}${endpoint} -> HTTP ${result?.status || 0}`);
    if (!result?.ok) continue;
    const body = await result.json().catch(() => null);
    const ids = normalizeWishlistIds(body?.products ?? body?.items ?? body?.wishlist ?? body?.list ?? body);
    console.log(`[WISHLIST] io ${new URL(base).host}${endpoint} -> items=${ids.length}`);
    if (ids.length) return { wishlist: [...new Set(ids)], source: `${new URL(base).host}${endpoint}` };
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

async function saveWishlistByEmail(email, items, token = '') {
  const current = await getWishlistByEmail(email, token);
  const entity = current.entity || wishlistEntity;
  const url = current.id
    ? `${vtexBaseUrl}/api/dataentities/${entity}/documents/${encodeURIComponent(current.id)}`
    : `${vtexBaseUrl}/api/dataentities/${entity}/documents`;
  const listItems = items.map((productId, index) => ({ Id: index, ProductId: String(productId) }));
  const payload = { email, wishlist: items, ListItemsWrapper: [{ ListItems: listItems, IsPublic: false, Name: 'Wishlist' }] };
  const response = await fetch(url, { method: current.id ? 'PATCH' : 'POST', headers: { ...vtexHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`VTEX Wishlist (${entity}) retornou HTTP ${response.status} ao salvar.`);
  return { wishlist: items };
}

app.get('/health', (_request, response) => response.json({ ok: true, service: 'wml-backend' }));

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
    const start = await fetch(`${vtexBaseUrl}/api/vtexid/pub/authentication/start?scope=${encodeURIComponent(account)}&fingerprint=lojabl-${Date.now()}`);
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
    const ioUpdated = await mutateVtexIoWishlist(productId, favorite ? 'add' : 'remove', token, email);
    if (!ioUpdated) await saveWishlistByEmail(email, wishlist, token);
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

app.listen(port, () => console.log(`LojaBL backend running on http://localhost:${port}`));

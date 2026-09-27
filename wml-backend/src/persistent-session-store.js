import crypto from 'node:crypto';
import { createClient } from 'redis';

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;
const KEY_PREFIX = 'wml:session:v1';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function hashKey(value) {
  return crypto.createHash('sha256').update(normalizeValue(value)).digest('hex');
}

function sessionEmailKey(email) {
  return `${KEY_PREFIX}:email:${hashKey(normalizeEmail(email))}`;
}

function sessionTokenKey(token) {
  return `${KEY_PREFIX}:token:${hashKey(normalizeValue(token).replace(/^Bearer\s+/i, ''))}`;
}

function ownershipCookieKey(orderFormId) {
  return `${KEY_PREFIX}:order-form:${hashKey(orderFormId)}`;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizedSession(email, session) {
  return {
    email: normalizeEmail(email),
    authToken: normalizeValue(session?.authToken),
    shopperToken: normalizeValue(session?.shopperToken),
    cookieHeader: normalizeValue(session?.cookieHeader),
    updatedAt: Number(session?.updatedAt) || Date.now(),
  };
}

function sessionTokens(session) {
  const cookiePart = normalizeValue(session?.cookieHeader)
    .split(';')
    .map((part) => part.trim())
    .find((part) => /^VtexIdclientAutCookie(?:_[^=]+)?=/i.test(part)) || '';
  const cookieToken = cookiePart ? cookiePart.split('=').slice(1).join('=') : '';
  return [...new Set([
    session?.authToken,
    session?.shopperToken,
    cookieToken,
  ].map((value) => normalizeValue(value).replace(/^Bearer\s+/i, '')).filter(Boolean))];
}

function parseJson(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function createPersistentSessionStore({
  sessions = new Map(),
  ownershipCookies = new Map(),
  redisUrl = process.env.REDIS_URL,
  ttlSeconds = process.env.SESSION_STORE_TTL_SECONDS,
} = {}) {
  const connectionUrl = normalizeValue(redisUrl);
  const ttl = positiveInteger(ttlSeconds, DEFAULT_TTL_SECONDS);
  let client = null;
  let connectPromise = null;
  let redisWarningShown = false;

  function isExpired(updatedAt) {
    return Date.now() - Number(updatedAt || 0) > ttl * 1000;
  }

  function warnRedisFallback() {
    if (redisWarningShown) return;
    redisWarningShown = true;
    console.warn('[SESSION_STORE] armazenamento persistente indisponível; usando memória até a próxima reinicialização.');
  }

  async function withRedis(operation) {
    if (!connectionUrl) return null;
    try {
      if (!client) {
        client = createClient({
          url: connectionUrl,
          socket: {
            connectTimeout: 3000,
            reconnectStrategy: false,
          },
        });
        client.on('error', () => warnRedisFallback());
      }
      if (!client.isOpen) {
        if (!connectPromise) {
          connectPromise = client.connect().finally(() => { connectPromise = null; });
        }
        await connectPromise;
      }
      return await operation(client);
    } catch {
      warnRedisFallback();
      return null;
    }
  }

  function sessionFromMemoryByToken(token) {
    const requestedToken = normalizeValue(token).replace(/^Bearer\s+/i, '');
    if (!requestedToken) return null;
    for (const [email, stored] of sessions.entries()) {
      if (isExpired(stored?.updatedAt)) {
        sessions.delete(email);
        continue;
      }
      if (sessionTokens(stored).includes(requestedToken)) return stored;
    }
    return null;
  }

  function sessionFromMemoryByEmail(email) {
    const normalized = normalizeEmail(email);
    const stored = sessions.get(normalized);
    if (!stored) return null;
    if (isExpired(stored.updatedAt)) {
      sessions.delete(normalized);
      return null;
    }
    return stored;
  }

  async function saveCustomerSession(email, session) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;
    const stored = normalizedSession(normalizedEmail, session);
    sessions.set(normalizedEmail, stored);
    const serialized = JSON.stringify(stored);
    const keys = [
      sessionEmailKey(normalizedEmail),
      ...sessionTokens(stored).map(sessionTokenKey),
    ];
    await withRedis((redis) => Promise.all(keys.map((key) => redis.set(key, serialized, { EX: ttl }))));
    return stored;
  }

  async function hydrateCustomerSessionByToken(token) {
    const requestedToken = normalizeValue(token).replace(/^Bearer\s+/i, '');
    if (!requestedToken) return null;
    const local = sessionFromMemoryByToken(requestedToken);
    if (local) return local;
    const raw = await withRedis((redis) => redis.get(sessionTokenKey(requestedToken)));
    const stored = parseJson(raw);
    const email = normalizeEmail(stored?.email);
    if (!email || !stored) return null;
    const normalized = normalizedSession(email, stored);
    if (isExpired(normalized.updatedAt)) return null;
    sessions.set(email, normalized);
    return normalized;
  }

  async function hydrateCustomerSessionByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;
    const local = sessionFromMemoryByEmail(normalizedEmail);
    if (local) return local;
    const raw = await withRedis((redis) => redis.get(sessionEmailKey(normalizedEmail)));
    const stored = parseJson(raw);
    if (!stored) return null;
    const normalized = normalizedSession(normalizedEmail, stored);
    if (isExpired(normalized.updatedAt)) return null;
    sessions.set(normalizedEmail, normalized);
    return normalized;
  }

  async function saveOwnershipCookie(orderFormId, entry) {
    const normalizedOrderFormId = normalizeValue(orderFormId);
    const cookieHeader = normalizeValue(entry?.cookieHeader);
    if (!normalizedOrderFormId || !cookieHeader) return null;
    const stored = {
      cookieHeader,
      updatedAt: Number(entry?.updatedAt) || Date.now(),
    };
    ownershipCookies.set(normalizedOrderFormId, stored);
    await withRedis((redis) => redis.set(
      ownershipCookieKey(normalizedOrderFormId),
      JSON.stringify(stored),
      { EX: ttl },
    ));
    return stored;
  }

  async function hydrateOwnershipCookie(orderFormId) {
    const normalizedOrderFormId = normalizeValue(orderFormId);
    if (!normalizedOrderFormId) return null;
    const local = ownershipCookies.get(normalizedOrderFormId);
    if (local) {
      if (!isExpired(local.updatedAt)) return local;
      ownershipCookies.delete(normalizedOrderFormId);
    }
    const raw = await withRedis((redis) => redis.get(ownershipCookieKey(normalizedOrderFormId)));
    const stored = parseJson(raw);
    if (!stored?.cookieHeader || isExpired(stored.updatedAt)) return null;
    const normalized = {
      cookieHeader: normalizeValue(stored.cookieHeader),
      updatedAt: Number(stored.updatedAt) || Date.now(),
    };
    ownershipCookies.set(normalizedOrderFormId, normalized);
    return normalized;
  }

  return {
    configured: Boolean(connectionUrl),
    ttlSeconds: ttl,
    saveCustomerSession,
    hydrateCustomerSessionByToken,
    hydrateCustomerSessionByEmail,
    saveOwnershipCookie,
    hydrateOwnershipCookie,
  };
}

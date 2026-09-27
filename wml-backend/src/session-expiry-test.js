import { timingSafeEqual } from 'node:crypto';

const allowedEnvironments = new Set(['development', 'test', 'testing', 'staging', 'homolog', 'homologacao']);

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

function configuration(environment = process.env) {
  return {
    appEnvironment: normalized(environment.APP_ENV || environment.NODE_ENV),
    enabled: normalized(environment.SESSION_EXPIRY_TEST_ENABLED) === 'true',
    key: String(environment.SESSION_EXPIRY_TEST_KEY || '').trim(),
  };
}

export function isSessionExpiryTestEnabled(environment = process.env) {
  const config = configuration(environment);
  return config.enabled && Boolean(config.key) && allowedEnvironments.has(config.appEnvironment);
}

function sameSecret(provided, expected) {
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length
    && timingSafeEqual(providedBytes, expectedBytes);
}

export function isSessionExpiryTestAuthorized(request, environment = process.env) {
  const config = configuration(environment);
  if (!isSessionExpiryTestEnabled(environment)) return false;

  const providedKey = typeof request?.get === 'function'
    ? String(request.get('x-session-expiry-test-key') || '').trim()
    : String(request?.headers?.['x-session-expiry-test-key'] || '').trim();

  return Boolean(providedKey) && sameSecret(providedKey, config.key);
}

export const SESSION_EXPIRY_TEST_RESPONSE = Object.freeze({
  ok: false,
  code: 'SESSION_EXPIRED_TEST',
  message: 'Sessão expirada para teste.',
});

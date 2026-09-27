import assert from 'node:assert/strict';
import test from 'node:test';
import { isSessionExpiryTestAuthorized, isSessionExpiryTestEnabled, SESSION_EXPIRY_TEST_RESPONSE } from '../src/session-expiry-test.js';

const homologEnvironment = {
  APP_ENV: 'homolog',
  NODE_ENV: 'production',
  SESSION_EXPIRY_TEST_ENABLED: 'true',
  SESSION_EXPIRY_TEST_KEY: 'local-homolog-secret',
};

test('keeps the session-expiry route disabled outside an approved environment', () => {
  assert.equal(isSessionExpiryTestEnabled({ ...homologEnvironment, APP_ENV: 'production' }), false);
  assert.equal(isSessionExpiryTestEnabled({ ...homologEnvironment, SESSION_EXPIRY_TEST_ENABLED: 'false' }), false);
  assert.equal(isSessionExpiryTestEnabled({ ...homologEnvironment, SESSION_EXPIRY_TEST_KEY: '' }), false);
});

test('enables the session-expiry route only with the explicit homolog configuration', () => {
  assert.equal(isSessionExpiryTestEnabled(homologEnvironment), true);
});

test('requires the configured test key before authorizing the 401 response', () => {
  assert.equal(isSessionExpiryTestAuthorized({ headers: {} }, homologEnvironment), false);
  assert.equal(isSessionExpiryTestAuthorized({ headers: { 'x-session-expiry-test-key': 'wrong' } }, homologEnvironment), false);
  assert.equal(
    isSessionExpiryTestAuthorized({ headers: { 'x-session-expiry-test-key': 'local-homolog-secret' } }, homologEnvironment),
    true,
  );
});

test('uses a stable response marker for the app session-expiry test', () => {
  assert.deepEqual(SESSION_EXPIRY_TEST_RESPONSE, {
    ok: false,
    code: 'SESSION_EXPIRED_TEST',
    message: 'Sessão expirada para teste.',
  });
});

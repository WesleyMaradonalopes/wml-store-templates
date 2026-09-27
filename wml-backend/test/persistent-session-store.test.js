import assert from 'node:assert/strict';
import test from 'node:test';
import { createPersistentSessionStore } from '../src/persistent-session-store.js';

test('mantém a sessão VTEX em memória quando Redis não está configurado', async () => {
  const sessions = new Map();
  const ownershipCookies = new Map();
  const store = createPersistentSessionStore({
    sessions,
    ownershipCookies,
    redisUrl: '',
  });

  assert.equal(store.configured, false);
  const saved = await store.saveCustomerSession('Cliente@EXEMPLO.com', {
    authToken: 'auth-token',
    shopperToken: 'shopper-token',
    cookieHeader: 'VtexIdclientAutCookie=auth-token',
  });

  assert.equal(saved.email, 'cliente@exemplo.com');
  assert.equal((await store.hydrateCustomerSessionByToken('auth-token')).email, 'cliente@exemplo.com');
  assert.equal((await store.hydrateCustomerSessionByEmail('CLIENTE@EXEMPLO.COM')).shopperToken, 'shopper-token');
});

test('mantém o cookie de propriedade do orderForm com prazo de atualização', async () => {
  const ownershipCookies = new Map();
  const store = createPersistentSessionStore({
    sessions: new Map(),
    ownershipCookies,
    redisUrl: '',
  });

  await store.saveOwnershipCookie('order-form-123', {
    cookieHeader: 'CheckoutOrderFormOwnership=ownership-token',
  });

  const stored = await store.hydrateOwnershipCookie('order-form-123');
  assert.equal(stored.cookieHeader, 'CheckoutOrderFormOwnership=ownership-token');
  assert.ok(stored.updatedAt > 0);
});

test('não reidrata sessões expiradas do cache local', async () => {
  const sessions = new Map();
  const store = createPersistentSessionStore({
    sessions,
    ownershipCookies: new Map(),
    redisUrl: '',
    ttlSeconds: 60,
  });

  sessions.set('cliente@exemplo.com', {
    email: 'cliente@exemplo.com',
    authToken: 'expired-token',
    shopperToken: '',
    cookieHeader: '',
    updatedAt: Date.now() - 61_000,
  });

  assert.equal(await store.hydrateCustomerSessionByToken('expired-token'), null);
  assert.equal(sessions.size, 0);
});

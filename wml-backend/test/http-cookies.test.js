import assert from 'node:assert/strict';
import test from 'node:test';

import { extractCookieValue, normalizeCookieHeader } from '../src/http-cookies.js';

test('keeps every cookie returned by Headers.getSetCookie()', () => {
  const raw = [
    'checkout.vtex.com=cart-id; Path=/; Secure; HttpOnly',
    'CheckoutOrderFormOwnership=owner-token; Path=/; Secure; HttpOnly',
  ];

  assert.equal(
    normalizeCookieHeader(raw),
    'checkout.vtex.com=cart-id; CheckoutOrderFormOwnership=owner-token',
  );
});

test('splits a combined header without splitting the comma in Expires', () => {
  const raw = 'checkout.vtex.com=cart-id; Expires=Wed, 21 Oct 2030 07:28:00 GMT; Path=/, CheckoutOrderFormOwnership=owner-token; Path=/';

  assert.equal(
    normalizeCookieHeader(raw),
    'checkout.vtex.com=cart-id; CheckoutOrderFormOwnership=owner-token',
  );
});

test('extracts an exact cookie value from multiple Set-Cookie headers', () => {
  const raw = [
    'CheckoutDataAccess=data-token; Path=/',
    'Vtex_CHKO_Auth=checkout-token==; Path=/; Secure',
  ];

  assert.equal(extractCookieValue(raw, 'Vtex_CHKO_Auth'), 'checkout-token==');
  assert.equal(extractCookieValue(raw, 'missing'), '');
});

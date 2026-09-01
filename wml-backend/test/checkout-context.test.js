import assert from 'node:assert/strict';
import test from 'node:test';

import { isGiftCardPaymentData, shopperTokenForPaymentData } from '../src/checkout-context.js';

test('gift card application without an authenticated account uses the guest profile', () => {
  const paymentData = {
    payments: [],
    giftCards: [{ redemptionCode: 'TEST-CODE', inUse: true }],
  };

  assert.equal(isGiftCardPaymentData(paymentData), true);
  assert.equal(shopperTokenForPaymentData(paymentData, ''), '');
});

test('gift card application keeps a session belonging to the checkout email', () => {
  const paymentData = { payments: [], giftCards: [{ redemptionCode: 'TEST-CODE', inUse: true }] };

  assert.equal(
    shopperTokenForPaymentData(paymentData, 'owner-token', 'Owner@Example.com', 'owner@example.com'),
    'owner-token',
  );
});

test('gift card application discards a session belonging to another email', () => {
  const paymentData = { payments: [], giftCards: [{ redemptionCode: 'TEST-CODE', inUse: true }] };

  assert.equal(
    shopperTokenForPaymentData(paymentData, 'other-token', 'owner@example.com', 'other@example.com'),
    '',
  );
});

test('gift card removal follows the same matching-account rule', () => {
  const paymentData = { payments: [], giftCards: [] };

  assert.equal(
    shopperTokenForPaymentData(paymentData, 'owner-token', 'owner@example.com', 'owner@example.com'),
    'owner-token',
  );
});

test('payment data without gift cards keeps the authenticated account context', () => {
  const paymentData = {
    payments: [{ paymentSystem: '1', value: 1000, installments: 1 }],
  };

  assert.equal(isGiftCardPaymentData(paymentData), false);
  assert.equal(shopperTokenForPaymentData(paymentData, ' logged-account-token '), 'logged-account-token');
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareGiftCardsNewestFirst,
  giftCardClientCandidates,
  giftCardLookupContainsCard,
  uniqueGiftCardSearchEntries,
} from '../src/gift-card-context.js';

test('uses only ownership identifiers documented by the Giftcard API', () => {
  const candidates = giftCardClientCandidates({
    email: ' Customer@Example.com ',
    orderForm: {
      userProfileId: 'profile-from-order-form',
      clientProfileData: { email: 'customer@example.com', document: '123.456.789-00' },
    },
    profile: {
      id: 'master-data-document-id',
      userId: 'master-data-user-id',
      email: 'customer@example.com',
      document: '123.456.789-00',
    },
  });

  assert.deepEqual(candidates.map(({ source }) => source), [
    'document',
    'master-data-user-id',
    'email',
  ]);
  assert.deepEqual(candidates[0].client, {
    id: '12345678900',
    email: 'customer@example.com',
    document: '12345678900',
  });
});

test('deduplicates equivalent profile identities', () => {
  const candidates = giftCardClientCandidates({
    email: 'customer@example.com',
    orderForm: {
      userProfileId: 'SAME-ID',
      clientProfileData: { email: 'customer@example.com', document: '12345678900' },
    },
    profile: {
      email: 'customer@example.com',
      id: 'same-id',
      userId: 'same-id',
    },
  });

  assert.deepEqual(candidates.map(({ source }) => source), [
    'document',
    'master-data-user-id',
    'email',
  ]);
});

test('prefers the document from the profile resolved by the same email', () => {
  const candidates = giftCardClientCandidates({
    email: 'customer@example.com',
    orderForm: {
      clientProfileData: { email: 'customer@example.com', document: '430.850.768-59' },
    },
    profile: {
      email: 'customer@example.com',
      document: '396.619.588-74',
      userId: 'customer-user-id',
    },
  });

  assert.equal(candidates[0].client.document, '39661958874');
  assert.equal(candidates.some(({ client }) => client.id === '43085076859'), false);
});

test('does not use a profile or partial CPF from another email', () => {
  const candidates = giftCardClientCandidates({
    email: 'customer@example.com',
    orderForm: {
      clientProfileData: { email: 'customer@example.com', document: '***.***.588-74' },
    },
    profile: {
      email: 'other@example.com',
      document: '430.850.768-59',
      userId: 'other-user-id',
    },
  });

  assert.deepEqual(candidates.map(({ source }) => source), ['email']);
});

test('orders usable cards by newest emission date', () => {
  const cards = [
    { id: 'opaque-id_1', emissionDate: '2024-09-05T10:00:00Z' },
    { id: '92de2449-0e02-4ca9-a4aa-a09cc9d8f7ff_74', emissionDate: '2026-08-24T18:36:05Z' },
    { id: 'opaque-id_2', emissionDate: '2025-01-10T10:00:00Z' },
  ];

  assert.deepEqual(cards.sort(compareGiftCardsNewestFirst).map(({ id }) => id), [
    '92de2449-0e02-4ca9-a4aa-a09cc9d8f7ff_74',
    'opaque-id_2',
    'opaque-id_1',
  ]);
});

test('keeps opaque card ids returned for a confirmed client identity', () => {
  const cpfClient = {
    id: '39661958874',
    email: 'customer@example.com',
    document: '39661958874',
  };
  const searches = [
    {
      source: 'document',
      client: cpfClient,
      result: {
        items: [
          { id: '92de2449-0e02-4ca9-a4aa-a09cc9d8f7ff_74', balance: 500 },
          { id: 'legacy-opaque-id', balance: 125.62 },
        ],
      },
    },
    {
      source: 'email',
      client: { id: 'customer@example.com' },
      result: {
        items: [{ id: 'LEGACY-OPAQUE-ID', balance: 125.62 }],
      },
    },
  ];

  const entries = uniqueGiftCardSearchEntries(searches);

  assert.deepEqual(entries.map(({ summary }) => summary.id), [
    '92de2449-0e02-4ca9-a4aa-a09cc9d8f7ff_74',
    'legacy-opaque-id',
  ]);
  assert.equal(entries[0].client, cpfClient);
  assert.equal(entries[0].source, 'document');
});

test('validates a targeted lookup by id or redemption code', () => {
  const card = { id: 'card-id', redemptionCode: 'ABCD-EFGH' };

  assert.equal(giftCardLookupContainsCard(card, [{ id: 'CARD-ID' }]), true);
  assert.equal(giftCardLookupContainsCard(card, [{ redemptionCode: 'abcdefgh' }]), true);
  assert.equal(giftCardLookupContainsCard(card, [{ id: 'another-card' }]), false);
  assert.equal(giftCardLookupContainsCard(card, []), false);
});

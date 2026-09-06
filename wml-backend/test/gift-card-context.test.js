import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareGiftCardsNewestFirst,
  giftCardBelongsToClient,
  giftCardClientCandidates,
  giftCardOwnerIdentifier,
  giftCardLookupContainsCard,
  uniqueGiftCardSearchEntries,
} from '../src/gift-card-context.js';

// Synthetic documents keep the ownership tests representative without
// embedding a real customer's CPF in the repository.
const PRIMARY_DOCUMENT = '1'.repeat(11);
const OTHER_DOCUMENT = '2'.repeat(11);

function formatDocument(document) {
  return `${document.slice(0, 3)}.${document.slice(3, 6)}.${document.slice(6, 9)}-${document.slice(9)}`;
}

function maskedDocument(document) {
  return `***.***.${document.slice(6, 9)}-${document.slice(9)}`;
}

test('uses only ownership identifiers documented by the Giftcard API', () => {
  const candidates = giftCardClientCandidates({
    email: ' Customer@Example.com ',
    orderForm: {
      userProfileId: 'profile-from-order-form',
      clientProfileData: { email: 'customer@example.com', document: formatDocument(PRIMARY_DOCUMENT) },
    },
    profile: {
      id: 'master-data-document-id',
      userId: 'master-data-user-id',
      email: 'customer@example.com',
      document: formatDocument(PRIMARY_DOCUMENT),
    },
  });

  assert.deepEqual(candidates.map(({ source }) => source), [
    'document',
    'master-data-user-id',
    'email',
    'master-data-id',
  ]);
  assert.deepEqual(candidates[0].client, {
    id: PRIMARY_DOCUMENT,
    email: 'customer@example.com',
    document: PRIMARY_DOCUMENT,
  });
});

test('deduplicates equivalent profile identities', () => {
  const candidates = giftCardClientCandidates({
    email: 'customer@example.com',
    orderForm: {
      userProfileId: 'SAME-ID',
      clientProfileData: { email: 'customer@example.com', document: PRIMARY_DOCUMENT },
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
      clientProfileData: { email: 'customer@example.com', document: formatDocument(OTHER_DOCUMENT) },
    },
    profile: {
      email: 'customer@example.com',
      document: formatDocument(PRIMARY_DOCUMENT),
      userId: 'customer-user-id',
    },
  });

  assert.equal(candidates[0].client.document, PRIMARY_DOCUMENT);
  assert.equal(candidates.some(({ client }) => client.id === OTHER_DOCUMENT), false);
});

test('does not use a profile or partial CPF from another email', () => {
  const candidates = giftCardClientCandidates({
    email: 'customer@example.com',
    orderForm: {
      clientProfileData: { email: 'customer@example.com', document: maskedDocument(OTHER_DOCUMENT) },
    },
    profile: {
      email: 'other@example.com',
      document: formatDocument(OTHER_DOCUMENT),
      userId: 'other-user-id',
    },
  });

  assert.deepEqual(candidates.map(({ source }) => source), ['email']);
});

test('does not reuse an order form profile from another customer', () => {
  const candidates = giftCardClientCandidates({
    email: 'customer@example.com',
    orderForm: {
      userProfileId: 'other-profile-id',
      clientProfileData: { email: 'customer@example.com', document: PRIMARY_DOCUMENT },
    },
    profile: {
      id: 'customer-document-id',
      userId: 'customer-profile-id',
      email: 'customer@example.com',
      document: PRIMARY_DOCUMENT,
    },
  });

  assert.equal(candidates.some(({ source }) => source === 'order-form-profile-id'), false);
  assert.equal(candidates.some(({ client }) => client.id === 'other-profile-id'), false);
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

test('deduplicates cards returned for a confirmed client identity', () => {
  const cpfClient = {
    id: PRIMARY_DOCUMENT,
    email: 'customer@example.com',
    document: PRIMARY_DOCUMENT,
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

test('requires a card owner to match the confirmed customer', () => {
  const candidates = [{ client: { id: PRIMARY_DOCUMENT, email: 'customer@example.com', document: PRIMARY_DOCUMENT } }];

  assert.equal(giftCardOwnerIdentifier({ id: `${PRIMARY_DOCUMENT}_7364` }), PRIMARY_DOCUMENT);
  assert.equal(giftCardBelongsToClient({ id: `${PRIMARY_DOCUMENT}_7364` }, candidates), true);
  assert.equal(giftCardBelongsToClient({ id: `${OTHER_DOCUMENT}_1234` }, candidates), false);
  assert.equal(giftCardBelongsToClient({ id: '_6896' }, candidates), false);
  assert.equal(giftCardBelongsToClient({ id: 'opaque-id', profileId: 'customer@example.com' }, candidates), true);
});

test('validates a targeted lookup by id or redemption code', () => {
  const card = { id: 'card-id', redemptionCode: 'ABCD-EFGH' };

  assert.equal(giftCardLookupContainsCard(card, [{ id: 'CARD-ID' }]), true);
  assert.equal(giftCardLookupContainsCard(card, [{ redemptionCode: 'abcdefgh' }]), true);
  assert.equal(giftCardLookupContainsCard(card, [{ id: 'another-card' }]), false);
  assert.equal(giftCardLookupContainsCard(card, []), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareGiftCardsNewestFirst,
  giftCardBelongsToClient,
  giftCardClientCandidates,
  giftCardLookupContainsCard,
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

test('rejects a broad-search result belonging to another CPF', () => {
  const candidates = giftCardClientCandidates({
    email: 'customer@example.com',
    orderForm: { clientProfileData: { email: 'customer@example.com' } },
    profile: {
      email: 'customer@example.com',
      document: '396.619.588-74',
      userId: 'customer-user-id',
    },
  });

  assert.equal(giftCardBelongsToClient({ id: '39661958874_7364' }, candidates), true);
  assert.equal(giftCardBelongsToClient({ id: 'customer-user-id_42' }, candidates), true);
  assert.equal(giftCardBelongsToClient({ id: 'customer@example.com_9' }, candidates), true);
  assert.equal(giftCardBelongsToClient({ id: '43085076859_1234' }, candidates), false);
  assert.equal(giftCardBelongsToClient({ id: 'legacy-numeric-id' }, candidates), false);
});

test('orders usable cards by newest emission date', () => {
  const cards = [
    { id: 'owner_1', emissionDate: '2024-09-05T10:00:00Z' },
    { id: 'owner_3', emissionDate: '2026-08-24T18:36:05Z' },
    { id: 'owner_2', emissionDate: '2025-01-10T10:00:00Z' },
  ];

  assert.deepEqual(cards.sort(compareGiftCardsNewestFirst).map(({ id }) => id), [
    'owner_3',
    'owner_2',
    'owner_1',
  ]);
});

test('validates a targeted lookup by id or redemption code', () => {
  const card = { id: 'card-id', redemptionCode: 'ABCD-EFGH' };

  assert.equal(giftCardLookupContainsCard(card, [{ id: 'CARD-ID' }]), true);
  assert.equal(giftCardLookupContainsCard(card, [{ redemptionCode: 'abcdefgh' }]), true);
  assert.equal(giftCardLookupContainsCard(card, [{ id: 'another-card' }]), false);
  assert.equal(giftCardLookupContainsCard(card, []), false);
});

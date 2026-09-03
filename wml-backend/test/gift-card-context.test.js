import assert from 'node:assert/strict';
import test from 'node:test';

import {
  giftCardClientCandidates,
  giftCardLookupContainsCard,
} from '../src/gift-card-context.js';

test('prioritizes CPF for Admin gift cards and keeps API profile fallbacks', () => {
  const candidates = giftCardClientCandidates({
    email: ' Customer@Example.com ',
    orderForm: {
      userProfileId: 'profile-from-order-form',
      clientProfileData: { document: '123.456.789-00' },
    },
    profile: {
      id: 'master-data-document-id',
      userId: 'master-data-user-id',
    },
  });

  assert.deepEqual(candidates.map(({ source }) => source), [
    'document',
    'master-data-user-id',
    'order-form-profile-id',
    'email',
    'master-data-id',
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
      clientProfileData: { document: '12345678900' },
    },
    profile: {
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

test('validates a targeted lookup by id or redemption code', () => {
  const card = { id: 'card-id', redemptionCode: 'ABCD-EFGH' };

  assert.equal(giftCardLookupContainsCard(card, [{ id: 'CARD-ID' }]), true);
  assert.equal(giftCardLookupContainsCard(card, [{ redemptionCode: 'abcdefgh' }]), true);
  assert.equal(giftCardLookupContainsCard(card, [{ id: 'another-card' }]), false);
  assert.equal(giftCardLookupContainsCard(card, []), false);
});

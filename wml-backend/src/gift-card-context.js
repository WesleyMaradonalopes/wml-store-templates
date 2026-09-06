function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDocument(value) {
  return String(value || '').replace(/\D/g, '');
}

function validDocument(value) {
  const document = normalizeDocument(value);
  return document.length === 11 || document.length === 14 ? document : '';
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRedemptionCode(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function giftCardClientCandidates({ orderForm, email, profile }) {
  const normalizedEmail = normalizeEmail(email);
  const profileEmailMatches = normalizeEmail(profile?.email) === normalizedEmail;
  const orderFormEmailMatches = normalizeEmail(orderForm?.clientProfileData?.email) === normalizedEmail;
  // Master Data is authoritative for the document tied to the submitted
  // email. Only fall back to the orderForm when that profile is unavailable.
  // This also rejects masked/partial documents instead of treating their
  // visible suffix as a different CPF.
  const profileDocument = profileEmailMatches ? validDocument(profile?.document) : '';
  const orderFormDocument = orderFormEmailMatches
    ? validDocument(orderForm?.clientProfileData?.document)
    : '';
  const document = profileDocument || orderFormDocument;
  const rawCandidates = [
    // Vales criados pelo Admin são vinculados ao Customer ID (CPF/CNPJ).
    ['document', document],
    // Conforme a Giftcard API, vales criados pela API usam profileId, que
    // pode ser o userId do Master Data ou o e-mail cadastrado.
    ['master-data-user-id', profileEmailMatches ? profile?.userId : ''],
    ['email', normalizedEmail],
  ];
  const seen = new Set();

  return rawCandidates.flatMap(([source, value]) => {
    const id = String(value || '').trim();
    const identity = normalizeIdentifier(id);
    if (!identity || seen.has(identity)) return [];
    seen.add(identity);
    return [{
      source,
      client: {
        id,
        email: normalizedEmail,
        document,
      },
    }];
  });
}

export function compareGiftCardsNewestFirst(left, right) {
  const time = (card) => {
    const parsed = Date.parse(String(card?.emissionDate || ''));
    return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
  };
  const leftTime = time(left);
  const rightTime = time(right);
  if (leftTime === rightTime) {
    return String(left?.id || '').localeCompare(String(right?.id || ''));
  }
  return rightTime - leftTime;
}

export function uniqueGiftCardSearchEntries(searches) {
  const entries = [];
  const seenCardIds = new Set();

  for (const search of Array.isArray(searches) ? searches : []) {
    const items = Array.isArray(search?.result?.items) ? search.result.items : [];
    for (const summary of items) {
      const id = String(summary?.id || '').trim();
      const normalizedId = normalizeIdentifier(id);
      if (!normalizedId || seenCardIds.has(normalizedId)) continue;
      seenCardIds.add(normalizedId);
      entries.push({
        summary,
        client: search.client,
        source: search.source,
      });
    }
  }

  return entries;
}

export function giftCardLookupContainsCard(card, items) {
  const cardId = normalizeIdentifier(card?.id);
  const cardCode = normalizeRedemptionCode(card?.redemptionCode);

  return (Array.isArray(items) ? items : []).some((item) => {
    const itemId = normalizeIdentifier(item?.id);
    const itemCode = normalizeRedemptionCode(item?.redemptionCode);
    return Boolean(
      (cardId && itemId === cardId)
      || (cardCode && itemCode === cardCode),
    );
  });
}

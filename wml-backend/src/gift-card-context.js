function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeDocument(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRedemptionCode(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function giftCardClientCandidates({ orderForm, email, profile }) {
  const normalizedEmail = normalizeEmail(email);
  const document = normalizeDocument(
    orderForm?.clientProfileData?.document || profile?.document,
  );
  const rawCandidates = [
    // Vales criados pelo Admin são vinculados ao Customer ID (CPF/CNPJ).
    ['document', document],
    // Vales criados pela API usam profileId, que pode ser userId ou e-mail.
    ['master-data-user-id', profile?.userId],
    ['order-form-profile-id', orderForm?.userProfileId],
    ['email', normalizedEmail],
    // Mantém compatibilidade com integrações antigas que gravaram o id do CL.
    ['master-data-id', profile?.id],
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

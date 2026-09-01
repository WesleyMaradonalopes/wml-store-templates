export function isGiftCardPaymentData(paymentData) {
  return Boolean(
    paymentData
    && typeof paymentData === 'object'
    && Object.prototype.hasOwnProperty.call(paymentData, 'giftCards'),
  );
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function shopperTokenForPaymentData(
  paymentData,
  userToken = '',
  checkoutProfileEmail = '',
  accountEmail = '',
) {
  const token = String(userToken || '').trim();
  if (!isGiftCardPaymentData(paymentData) || !token) return token;

  // Um vale restrito pode precisar da autenticação do titular, mas nunca deve
  // receber a sessão de outra conta que esteja logada no aparelho.
  const profileEmail = normalizeEmail(checkoutProfileEmail);
  const authenticatedEmail = normalizeEmail(accountEmail);
  return profileEmail && authenticatedEmail === profileEmail ? token : '';
}

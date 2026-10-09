function digits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function formatCpf(value: string) {
  const valueDigits = digits(value).slice(0, 11);
  if (valueDigits.length <= 3) return valueDigits;
  if (valueDigits.length <= 6) return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3)}`;
  if (valueDigits.length <= 9) return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3, 6)}.${valueDigits.slice(6)}`;
  return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3, 6)}.${valueDigits.slice(6, 9)}-${valueDigits.slice(9)}`;
}

export function cpfToApi(value: string) {
  return digits(value).slice(0, 11);
}

export function formatPhoneInput(value: string) {
  const rawValue = String(value || '').trim();
  const valueDigits = digits(rawValue);
  const hasExplicitCountryCode = /^\+55/.test(rawValue);
  const hasCompleteCountryCode = valueDigits.startsWith('55') && valueDigits.length > 11;
  const withoutCountryCode = hasExplicitCountryCode || hasCompleteCountryCode
    ? valueDigits.slice(2)
    : valueDigits;
  if (withoutCountryCode.startsWith('0') && withoutCountryCode.length > 11) return withoutCountryCode.slice(1, 12);
  return withoutCountryCode.slice(0, 11);
}

export function formatPhoneWithoutCountryCode(value: string) {
  const localDigits = formatPhoneInput(value);
  if (localDigits.length <= 2) return localDigits;

  const areaCode = localDigits.slice(0, 2);
  const subscriberNumber = localDigits.slice(2);
  const prefixLength = subscriberNumber.startsWith('9') ? 5 : 4;
  const prefix = subscriberNumber.slice(0, prefixLength);
  const suffix = subscriberNumber.slice(prefixLength, prefixLength + 4);
  return `${areaCode} ${prefix}${suffix ? `-${suffix}` : ''}`;
}

export function phoneToApi(value: string) {
  const localDigits = formatPhoneInput(value);
  return localDigits ? `55${localDigits}` : '';
}

export function formatBirthDate(value: string) {
  const normalized = String(value || '').trim();
  const isoMatch = normalized.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  const brazilianMatch = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (brazilianMatch) return `${brazilianMatch[1]}/${brazilianMatch[2]}/${brazilianMatch[3]}`;
  return normalized;
}

export function formatBirthDateInput(value: string) {
  const valueDigits = digits(value).slice(0, 8);
  if (valueDigits.length <= 2) return valueDigits;
  if (valueDigits.length <= 4) return `${valueDigits.slice(0, 2)}/${valueDigits.slice(2)}`;
  return `${valueDigits.slice(0, 2)}/${valueDigits.slice(2, 4)}/${valueDigits.slice(4)}`;
}

export function birthDateToApi(value: string) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  const brazilianMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilianMatch) return `${brazilianMatch[3]}-${brazilianMatch[2]}-${brazilianMatch[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

export function formatGenderLabel(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['male', 'masculino'].includes(normalized)) return 'Masculino';
  if (['female', 'feminino'].includes(normalized)) return 'Feminino';
  if (['other', 'outro', 'outros'].includes(normalized)) return 'Outros';
  if (['prefer_not_to_say', 'prefer not to say', 'prefiro não informar', 'prefiro nao informar', 'not informed', 'nao informado'].includes(normalized)) return 'Prefiro não informar';
  return value || '';
}

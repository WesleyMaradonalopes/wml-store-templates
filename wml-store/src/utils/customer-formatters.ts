function digits(value: string) {
  return String(value || '').replace(/\D/g, '');
}

export function formatPhoneWithoutCountryCode(value: string) {
  const valueDigits = digits(value);
  if (valueDigits.startsWith('55') && valueDigits.length > 11) return valueDigits.slice(2);
  if (valueDigits.startsWith('0') && valueDigits.length > 11) return valueDigits.slice(1);
  return valueDigits;
}

export function phoneToApi(value: string) {
  const localDigits = formatPhoneWithoutCountryCode(value);
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
  const brazilianMatch = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return brazilianMatch ? `${brazilianMatch[3]}-${brazilianMatch[2]}-${brazilianMatch[1]}` : String(value || '').trim();
}

export function formatGenderLabel(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['male', 'masculino'].includes(normalized)) return 'Masculino';
  if (['female', 'feminino'].includes(normalized)) return 'Feminino';
  if (['other', 'outro'].includes(normalized)) return 'Outro';
  if (['prefer not to say', 'prefiro não informar', 'prefiro nao informar', 'not informed', 'nao informado'].includes(normalized)) return 'Prefiro não informar';
  return value || '';
}

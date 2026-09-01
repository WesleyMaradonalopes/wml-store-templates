function splitSetCookieHeaders(raw) {
  const values = Array.isArray(raw) ? raw : [raw];
  return values.flatMap((value) => String(value || '')
    // A comma inside Expires is followed by a date, not by another cookie name.
    .split(/,\s*(?=[A-Za-z0-9_.-]+=)/)
    .map((part) => part.trim())
    .filter(Boolean));
}

export function normalizeCookieHeader(raw) {
  return splitSetCookieHeaders(raw)
    .map((header) => header.split(';', 1)[0].trim())
    .filter(Boolean)
    .join('; ');
}

export function extractCookieValue(raw, name) {
  const expectedName = String(name || '').trim().toLowerCase();
  if (!expectedName) return '';

  for (const pair of normalizeCookieHeader(raw).split(';')) {
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    const cookieName = pair.slice(0, separator).trim().toLowerCase();
    if (cookieName === expectedName) return pair.slice(separator + 1).trim();
  }
  return '';
}

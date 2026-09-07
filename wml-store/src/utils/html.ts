const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '©',
  gt: '>',
  hellip: '…',
  ldquo: '“',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  rdquo: '”',
  reg: '®',
  rsquo: '’',
  lsquo: '‘',
  quot: '"',
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/gi, (entity, code: string) => {
    const normalizedCode = code.toLowerCase();
    if (normalizedCode.startsWith('#x')) {
      const codePoint = Number.parseInt(normalizedCode.slice(2), 16);
      return Number.isNaN(codePoint) || codePoint > 0x10ffff ? entity : String.fromCodePoint(codePoint);
    }
    if (normalizedCode.startsWith('#')) {
      const codePoint = Number.parseInt(normalizedCode.slice(1), 10);
      return Number.isNaN(codePoint) || codePoint > 0x10ffff ? entity : String.fromCodePoint(codePoint);
    }
    return HTML_ENTITIES[normalizedCode] ?? entity;
  });
}

export function htmlToPlainText(value: string) {
  let plainText = decodeHtmlEntities(value);

  plainText = plainText
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  // A second pass also handles content that arrived with the HTML escaped,
  // such as "&lt;span&gt;texto&lt;/span&gt;".
  plainText = decodeHtmlEntities(plainText)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  return plainText
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

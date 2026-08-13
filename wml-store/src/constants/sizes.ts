export const SIZE_ORDER = [
  'PP',
  'P',
  'M',
  'G',
  'GG',
  'EG',
  'EXG',
  'EXGG',
  'SG',
  'XGG',
  'XP',
  '4',
  '6',
  '8',
  '10',
  '30',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '50',
  '52',
  '54',
  '56',
  '127V',
  '220V',
  'TU',
  'UN',
  'UNICO',
  'M= 33 AO 38',
  'G= 39 AO 43',
] as const;

function normalizeSize(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

const normalizedSizeOrder = new Map(
  SIZE_ORDER.map((size, index) => [normalizeSize(size), index]),
);

export function isSizeVariationName(name: string) {
  const normalizedName = normalizeSize(name);
  return normalizedName.includes('TAMANHO') || normalizedName.includes('SIZE');
}

export function compareSizes(left: string, right: string) {
  const leftIndex = normalizedSizeOrder.get(normalizeSize(left)) ?? SIZE_ORDER.length;
  const rightIndex = normalizedSizeOrder.get(normalizeSize(right)) ?? SIZE_ORDER.length;

  if (leftIndex !== rightIndex) return leftIndex - rightIndex;
  if (leftIndex < SIZE_ORDER.length) return 0;

  return left.localeCompare(right, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export function sortSizeValues(values: readonly string[]) {
  return [...values].sort(compareSizes);
}

export function sortVariationValues(variationName: string, values: readonly string[]) {
  return isSizeVariationName(variationName) ? sortSizeValues(values) : [...values];
}

import { sortVariationValues } from '@/constants/sizes';
import type { Product } from '@/services/catalog';

export function buildVariationGroups(product: Product | null | undefined) {
  const groups = product?.variants.reduce<Record<string, string[]>>((result, variant) => {
    Object.entries(variant.variations).forEach(([name, value]) => {
      result[name] = result[name] ? Array.from(new Set([...result[name], value])) : [value];
    });
    return result;
  }, {}) ?? {};

  return Object.entries(groups).reduce<Record<string, string[]>>((result, [name, values]) => {
    result[name] = sortVariationValues(name, values);
    return result;
  }, {});
}

import { storeConfig } from '@/config/store';
import { compareSizes, isSizeVariationName } from '@/constants/sizes';

import { getJson } from './http';

export type ProductVariant = {
  itemId: string;
  sellerId: string;
  images: string[];
  price: number | null;
  listPrice: number | null;
  available: boolean;
  variations: Record<string, string>;
};

export type ProductKitItem = ProductVariant & {
  productId: string;
  productName: string;
  amount: number;
};

export type ProductKitGroup = {
  productId: string;
  productName: string;
  items: ProductKitItem[];
};

export type Product = {
  id: string;
  name: string;
  linkText: string;
  productReference: string;
  description: string;
  brand: string;
  color: string;
  composition: string;
  care: string;
  images: string[];
  itemId: string;
  sellerId: string;
  imageUrl: string;
  price: number | null;
  listPrice: number | null;
  collection: string;
  gender: string;
  isKit: boolean;
  kitGroups: ProductKitGroup[];
  raw?: Record<string, unknown>;
  variants: ProductVariant[];
};

type SearchResponse = {
  products?: ProductPayload[];
  recordsFiltered?: number;
};

type FacetsResponse = {
  facets?: FacetPayload[];
};

type FacetPayload = {
  name?: string;
  type?: string;
  key?: string;
  hidden?: boolean;
  quantity?: number;
  values?: Array<{
    id?: string;
    quantity?: number;
    name?: string;
    key?: string;
    value?: string;
    selected?: boolean;
    range?: { from?: number; to?: number };
  }>;
};

type ProductItemPayload = {
  itemId?: string;
  name?: string;
  nameComplete?: string;
  images?: Array<{ imageUrl?: string }>;
  // A busca inteligente retorna objetos; a API pública de catálogo retorna
  // apenas os nomes e publica os valores em campos como `Tamanho: ['P']`.
  variations?: Array<{ name?: string; values?: string[] } | string>;
  isKit?: boolean;
  kitItems?: Array<{ itemId?: string; amount?: number }>;
  sellers?: Array<{
    sellerId?: string;
    commertialOffer?: { Price?: number; ListPrice?: number; AvailableQuantity?: number; IsAvailable?: boolean };
  }>;
  [key: string]: unknown;
};

type ProductPayload = {
    productId?: string;
    productName?: string;
    productReference?: string;
    description?: string;
    brand?: string;
    linkText?: string;
    properties?: Array<{ name?: string; values?: string[] }>;
    specificationGroups?: unknown;
    allSpecificationsValues?: Record<string, unknown>;
    items?: ProductItemPayload[];
    [key: string]: unknown;
};

export type SelectedFacet = { key: string; value: string };

export type CatalogFacetValue = {
  id: string;
  quantity: number;
  name: string;
  key: string;
  value: string;
  selected: boolean;
};

export type CatalogFacet = {
  name: string;
  type: string;
  key: string;
  hidden: boolean;
  quantity: number;
  values: CatalogFacetValue[];
};

export type ProductSearchResult = {
  products: Product[];
  recordsFiltered: number;
};

export type SearchParams = {
  query?: string;
  page?: number;
  count?: number;
  facets?: SelectedFacet[];
  sort?: string;
  hideUnavailableItems?: boolean;
  fq?: string[];
};

type CategoryTreeNode = {
  name?: unknown;
  url?: unknown;
  children?: unknown;
};

let categoryPathsRequest: Promise<string[][]> | null = null;

function categoryPathSegments(value: string) {
  const withoutQuery = value.split('?')[0].replace(/^https?:\/\/[^/]+/i, '');
  return withoutQuery
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

function normalizedCategorySegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function categoryDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    for (let column = 0; column <= right.length; column += 1) previous[column] = current[column];
  }
  return previous[right.length];
}

function collectCategoryPaths(payload: unknown) {
  const paths: string[][] = [];

  function visit(node: unknown, parentPath: string[]) {
    if (!node || typeof node !== 'object') return;
    const candidate = node as CategoryTreeNode;
    const url = typeof candidate.url === 'string' ? candidate.url : '';
    const name = typeof candidate.name === 'string' ? candidate.name : '';
    const path = url ? categoryPathSegments(url) : name ? [...parentPath, name] : parentPath;
    if (path.length > 0) paths.push(path);

    if (Array.isArray(candidate.children)) {
      candidate.children.forEach((child) => visit(child, path));
    }
  }

  if (Array.isArray(payload)) payload.forEach((item) => visit(item, []));
  return paths;
}

function loadCategoryPaths() {
  if (!categoryPathsRequest) {
    categoryPathsRequest = getJson<unknown>(`${storeConfig.vtexBaseUrl}/api/catalog_system/pub/category/tree/3`)
      .then(collectCategoryPaths)
      .catch((error) => {
        categoryPathsRequest = null;
        throw error;
      });
  }
  return categoryPathsRequest;
}

function closestCategoryPath(values: string[], paths: string[][]) {
  let best: { path: string[]; score: number } | null = null;

  for (const path of paths) {
    if (path.length !== values.length) continue;
    let score = 0;
    let valid = true;

    for (let index = 0; index < values.length; index += 1) {
      const input = normalizedCategorySegment(values[index]);
      const candidate = normalizedCategorySegment(path[index]);
      const distance = categoryDistance(input, candidate);
      const allowedDistance = Math.max(1, Math.floor(Math.min(input.length, candidate.length) * 0.35));
      if (distance > allowedDistance) {
        valid = false;
        break;
      }
      score += distance;
    }

    if (valid && (!best || score < best.score)) best = { path, score };
  }

  return best?.path ?? null;
}

/**
 * Corrects a category slug only after an empty catalog response, using the
 * category tree published by VTEX as the source of truth.
 */
export async function resolveCategoryFacets(facets: SelectedFacet[]) {
  const categoryFacets = facets.filter((facet) => facet.key === 'c' || /^category-\d+$/i.test(facet.key));
  if (categoryFacets.length === 0) return facets;

  try {
    const paths = await loadCategoryPaths();
    const resolvedPath = closestCategoryPath(categoryFacets.map((facet) => facet.value), paths);
    if (!resolvedPath) return facets;

    let categoryIndex = 0;
    return facets.map((facet) => {
      if (facet.key !== 'c' && !/^category-\d+$/i.test(facet.key)) return facet;
      const value = resolvedPath[categoryIndex] ?? facet.value;
      categoryIndex += 1;
      return { ...facet, value };
    });
  } catch {
    return facets;
  }
}

function facetPath(facets: SelectedFacet[]) {
  return facets
    .filter((facet) => facet.key && facet.value)
    .flatMap((facet) => [facet.key, facet.value])
    .map(encodeURIComponent)
    .join('/');
}

function intelligentSearchUrl(endpoint: 'product-search' | 'facets', facets: SelectedFacet[]) {
  const path = facetPath(facets);
  return new URL(`${storeConfig.vtexBaseUrl}/api/intelligent-search/v1/${endpoint}${path ? `/${path}` : '/'}`);
}

function rangeLabel(from: number, to: number) {
  const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
  return `${money(from)} a ${money(to)}`;
}

function specificationValues(product: ProductPayload, name: string) {
  const direct = product[name];
  if (Array.isArray(direct)) return direct.map(String).filter(Boolean);
  const property = product.properties?.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return (property?.values ?? []).map(String).filter(Boolean);
}

function normalizedSpecificationText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function rawProduct(product: ProductPayload) {
  return product as unknown as Record<string, unknown>;
}

function firstSpecificationValue(field: Record<string, unknown>) {
  const values = field.values;
  if (Array.isArray(values) && values.length > 0) return String(values[0]).trim();
  const value = field.value ?? field.Value;
  return value ? String(value).trim() : '';
}

function readSpecGroupValue(raw: Record<string, unknown>, names: Set<string>) {
  const map = raw.specificationGroups ?? raw.properties;
  if (!Array.isArray(map)) return '';

  for (const group of map) {
    if (!group || typeof group !== 'object') continue;
    const candidate = group as Record<string, unknown>;
    const nested = candidate.specifications ?? candidate.properties ?? candidate.items;
    const fields = Array.isArray(nested) ? nested : [candidate];
    for (const field of fields) {
      if (!field || typeof field !== 'object') continue;
      const value = field as Record<string, unknown>;
      const key = normalizedSpecificationText(value.name ?? value.originalName ?? value.fieldName);
      if (names.has(key)) {
        const result = firstSpecificationValue(value);
        if (result) return result;
      }
    }
  }

  return '';
}

function readAllSpecificationsValue(raw: Record<string, unknown>, names: Set<string>) {
  const valuesMap = raw.allSpecificationsValues;
  if (!valuesMap || typeof valuesMap !== 'object') return '';
  for (const [key, value] of Object.entries(valuesMap as Record<string, unknown>)) {
    if (!names.has(normalizedSpecificationText(key))) continue;
    if (Array.isArray(value) && value.length > 0) return String(value[0]).trim();
    if (value) return String(value).trim();
  }
  return '';
}

function readRawObjectValue(raw: Record<string, unknown>, names: Set<string>) {
  for (const [key, value] of Object.entries(raw)) {
    if (!names.has(normalizedSpecificationText(key))) continue;
    if (Array.isArray(value) && value.length > 0) return String(value[0]).trim();
    if (value) return String(value).trim();
  }
  return '';
}

function getSpecificationValue(product: ProductPayload, names: string[], fieldId: number) {
  const raw = rawProduct(product);
  const targetNames = new Set([
    ...names,
    `specificationFilter_${fieldId}`,
    `field_${fieldId}`,
    String(fieldId),
  ].map(normalizedSpecificationText));
  return readSpecGroupValue(raw, targetNames) || readAllSpecificationsValue(raw, targetNames) || readRawObjectValue(raw, targetNames) || '';
}

function getSizeValue(variant: ProductVariant) {
  return Object.entries(variant.variations).find(([name]) => isSizeVariationName(name))?.[1] ?? '';
}

function kitGroupPriority(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/(top|sutia|regata|cropped|blusa|camisa|body)/.test(normalized)) return 0;
  if (/(calcinha|calca|bermuda|short|saia)/.test(normalized)) return 1;
  return 2;
}

function directVariationValue(variant: ProductItemPayload, name: string) {
  const value = variant[name];
  if (Array.isArray(value)) return value[0] ? String(value[0]).trim() : '';
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeVariantVariations(variant: ProductItemPayload) {
  const entries = (variant.variations ?? []).flatMap((variation) => {
    if (typeof variation === 'string') {
      const value = directVariationValue(variant, variation);
      return value ? [[variation, value] as const] : [];
    }
    const value = variation.values?.[0] || (variation.name ? directVariationValue(variant, variation.name) : '');
    return variation.name && value ? [[variation.name, value] as const] : [];
  });

  // Mantém a leitura resiliente caso a VTEX omita o array `variations`, mas
  // ainda envie os campos de especificação do SKU diretamente no item.
  if (entries.length > 0) return Object.fromEntries(entries);
  return Object.fromEntries(Object.entries(variant)
    .filter(([name, value]) => isSizeVariationName(name) && (typeof value === 'string' || Array.isArray(value)))
    .map(([name]) => [name, directVariationValue(variant, name)])
    .filter(([, value]) => value));
}

function normalizeProduct(product: ProductPayload): Product {
  const variants = (product.items ?? []).map((variant) => {
    const seller = variant.sellers?.find((item) => item.commertialOffer?.IsAvailable !== false && (item.commertialOffer?.AvailableQuantity ?? 1) > 0) ?? variant.sellers?.[0];
    const variantOffer = seller?.commertialOffer;
    const variantImages = (variant.images ?? []).map((image) => image.imageUrl ?? '').filter(Boolean);
    const variations = normalizeVariantVariations(variant);
    return {
      itemId: variant.itemId ?? '',
      sellerId: seller?.sellerId ?? '1',
      images: variantImages,
      price: typeof variantOffer?.Price === 'number' ? variantOffer.Price : null,
      listPrice: typeof variantOffer?.ListPrice === 'number' ? variantOffer.ListPrice : null,
      available: variantOffer?.IsAvailable !== false && (variantOffer?.AvailableQuantity ?? 1) > 0,
      variations,
    };
  }).filter((variant) => variant.itemId);

  const defaultVariant = variants.find((variant) => variant.available) ?? variants[0];
  const images = defaultVariant?.images ?? [];
  const color = getSpecificationValue(product, ['cor', 'cor principal', 'Cor em Atributo de Produto', 'color'], 261) || specificationValues(product, 'Cor em Atributo de Produto')[0] || '';
  const collection = getSpecificationValue(product, ['colecao', 'coleção', 'collection'], 269) || specificationValues(product, 'Coleção')[0] || '';
  const gender = getSpecificationValue(product, ['genero', 'gênero', 'gender'], 289) || specificationValues(product, 'Gênero')[0] || '';
  const isKit = product.items?.some((item) => Boolean(item.isKit || item.kitItems?.length)) ?? false;

  return {
    id: product.productId ?? '',
    name: product.productName ?? '',
    linkText: product.linkText ?? '',
    productReference: product.productReference ?? '',
    description: product.description ?? '',
    brand: product.brand ?? '',
    color,
    composition: specificationValues(product, 'Composição').join(' · '),
    care: specificationValues(product, 'Cuidados').join(' · '),
    images,
    itemId: defaultVariant?.itemId ?? '',
    sellerId: defaultVariant?.sellerId ?? '1',
    imageUrl: images[0] ?? '',
    price: defaultVariant?.price ?? null,
    listPrice: defaultVariant?.listPrice ?? null,
    collection,
    gender,
    isKit,
    kitGroups: [],
    raw: rawProduct(product),
    variants,
  };
}

async function getProductPayloadBySkuId(itemId: string) {
  const url = new URL(`${storeConfig.vtexBaseUrl}/api/catalog_system/pub/products/search/`);
  url.searchParams.set('fq', `skuId:${itemId}`);
  url.searchParams.set('_from', '0');
  url.searchParams.set('_to', '1');
  url.searchParams.set('sc', storeConfig.salesChannel);
  const products = await getJson<ProductPayload[]>(url.toString());
  return products.find((item) => item.items?.some((variant) => variant.itemId === itemId)) ?? products[0];
}

async function hydrateKitGroups(product: ProductPayload): Promise<ProductKitGroup[]> {
  const references = (product.items ?? []).flatMap((item) => item.kitItems ?? [])
    .map((item) => ({ itemId: item.itemId ?? '', amount: item.amount ?? 1 }))
    .filter((item) => item.itemId);
  if (references.length === 0) return [];

  const uniqueReferences = Array.from(references.reduce((result, reference) => {
    const current = result.get(reference.itemId);
    result.set(reference.itemId, { itemId: reference.itemId, amount: (current?.amount ?? 0) + reference.amount });
    return result;
  }, new Map<string, { itemId: string; amount: number }>()).values());

  const resolvedReferences = await Promise.allSettled(uniqueReferences.map(async (reference) => {
    const componentPayload = await getProductPayloadBySkuId(reference.itemId);
    if (!componentPayload) return null;
    const component = normalizeProduct(componentPayload);
    const variant = component.variants.find((item) => item.itemId === reference.itemId);
    if (!variant) return null;
    return {
      ...variant,
      productId: component.id,
      productName: component.name,
      amount: reference.amount,
    } satisfies ProductKitItem;
  }));

  const groups = new Map<string, ProductKitGroup>();
  resolvedReferences.forEach((result) => {
    if (result.status !== 'fulfilled' || !result.value) return;
    const item = result.value;
    const group = groups.get(item.productId) ?? {
      productId: item.productId,
      productName: item.productName,
      items: [],
    };
    if (!group.items.some((current) => current.itemId === item.itemId)) group.items.push(item);
    groups.set(item.productId, group);
  });

  return Array.from(groups.values())
    .sort((left, right) => kitGroupPriority(left.productName) - kitGroupPriority(right.productName))
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => compareSizes(getSizeValue(left), getSizeValue(right))),
    }));
}

async function loadProduct(productId: string): Promise<Product> {
  const url = new URL(`${storeConfig.vtexBaseUrl}/api/intelligent-search/v1/products`);
  url.searchParams.set('field', 'id');
  url.searchParams.set('value', productId);
  url.searchParams.set('sc', storeConfig.salesChannel);

  const product = await getJson<ProductPayload>(url.toString());
  const normalized = normalizeProduct(product);
  if (!normalized.isKit) return normalized;
  return { ...normalized, kitGroups: await hydrateKitGroups(product) };
}

// Evita que cards, favoritos e recomendações baixem os mesmos detalhes de
// produto simultaneamente. Não mantém resultado antigo: a deduplicação dura
// somente enquanto a requisição atual está em andamento.
const productReadsInFlight = new Map<string, Promise<Product>>();

export function getProduct(productId: string): Promise<Product> {
  const existing = productReadsInFlight.get(productId);
  if (existing) return existing;
  const request = loadProduct(productId);
  productReadsInFlight.set(productId, request);
  return request.finally(() => {
    if (productReadsInFlight.get(productId) === request) productReadsInFlight.delete(productId);
  });
}

export async function searchProductListing({
  query = '',
  page = 1,
  count = 12,
  facets = [],
  sort,
  hideUnavailableItems = true,
  fq = [],
}: SearchParams = {}): Promise<ProductSearchResult> {
  const url = intelligentSearchUrl('product-search', facets);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('count', String(count));
  url.searchParams.set('hideUnavailableItems', String(hideUnavailableItems));
  url.searchParams.set('sc', storeConfig.salesChannel);
  if (sort) url.searchParams.set('sort', sort);
  fq.filter(Boolean).forEach((filter) => url.searchParams.append('fq', filter));

  const result = await getJson<SearchResponse>(url.toString());
  const products = (result.products ?? []).map(normalizeProduct).filter((product) => product.id);
  return { products, recordsFiltered: result.recordsFiltered ?? products.length };
}

export async function searchProducts(params: SearchParams = {}): Promise<Product[]> {
  return (await searchProductListing(params)).products;
}

export async function getProductFacets({ query = '', facets = [], hideUnavailableItems = true }: Pick<SearchParams, 'query' | 'facets' | 'hideUnavailableItems'> = {}): Promise<CatalogFacet[]> {
  const url = intelligentSearchUrl('facets', facets);
  url.searchParams.set('query', query);
  url.searchParams.set('hideUnavailableItems', String(hideUnavailableItems));
  url.searchParams.set('sc', storeConfig.salesChannel);
  const result = await getJson<FacetsResponse>(url.toString());

  return (result.facets ?? []).map((facet) => {
    const key = facet.key ?? '';
    const values = (facet.values ?? []).flatMap((value, index) => {
      const from = value.range?.from;
      const to = value.range?.to;
      const normalizedValue = value.value ?? (typeof from === 'number' && typeof to === 'number' ? `${from}:${to}` : '');
      if (!normalizedValue || !(value.key ?? key)) return [];
      return [{
        id: value.id ?? `${key}-${normalizedValue}-${index}`,
        quantity: value.quantity ?? 0,
        name: value.name || (typeof from === 'number' && typeof to === 'number' ? rangeLabel(from, to) : normalizedValue),
        key: value.key ?? key,
        value: normalizedValue,
        selected: Boolean(value.selected),
      }];
    });
    const name = facet.name ?? key;
    const orderedValues = isSizeVariationName(name) || isSizeVariationName(key)
      ? values.sort((left, right) => compareSizes(left.name, right.name))
      : values;
    return {
      name,
      type: facet.type ?? 'TEXT',
      key,
      hidden: Boolean(facet.hidden),
      quantity: facet.quantity ?? orderedValues.length,
      values: orderedValues,
    };
  }).filter((facet) => facet.key && facet.values.length > 0 && !facet.hidden);
}

export async function getProductColorOptions(product: Product): Promise<Product[]> {
  const familyCode = product.linkText.split('-').filter(Boolean).at(-1)?.toLowerCase() ?? '';
  const options: Product[] = [product];

  if (familyCode) {
    try {
      const family = await searchProducts({ query: familyCode, count: 50, hideUnavailableItems: false });
      options.push(...family.filter((item) => item.linkText.toLowerCase().endsWith(`-${familyCode}`) || item.linkText.toLowerCase() === familyCode));
    } catch {
      // Mantém ao menos a cor atual quando a busca por família não responder.
    }
  }

  try {
    const url = new URL(`${storeConfig.vtexBaseUrl}/api/catalog_system/pub/products/crossselling/similars/${encodeURIComponent(product.id)}`);
    url.searchParams.set('sc', storeConfig.salesChannel);
    const similars = await getJson<ProductPayload[]>(url.toString());
    options.push(...similars.map(normalizeProduct));
  } catch {
    // Produtos alternativos são opcionais no catálogo.
  }

  return Array.from(new Map(options.filter((item) => item.id).map((item) => [item.id, item])).values());
}

export async function getSimilarProducts(productOrId: Product | string, count = 12): Promise<Product[]> {
  const productId = typeof productOrId === 'string' ? productOrId : productOrId.id;
  const relationships = ['similars', 'suggestions', 'whosawalsosaw'];

  for (const relationship of relationships) {
    try {
      const url = new URL(`${storeConfig.vtexBaseUrl}/api/catalog_system/pub/products/crossselling/${relationship}/${encodeURIComponent(productId)}`);
      url.searchParams.set('sc', storeConfig.salesChannel);
      const result = await getJson<ProductPayload[]>(url.toString());
      const products = Array.from(new Map(result
        .map(normalizeProduct)
        .filter((product) => product.id && product.id !== productId)
        .map((product) => [product.id, product])).values());
      if (products.length > 0) return products.slice(0, count);
    } catch {
      // Tenta a próxima relação de catálogo configurada para o produto.
    }
  }

  try {
    const current = typeof productOrId === 'string' ? await getProduct(productId) : productOrId;
    const products = await searchProducts({ query: current.brand || current.name, count: count + 1 });
    return products.filter((product) => product.id !== productId).slice(0, count);
  } catch {
    return [];
  }
}

export async function getCompleteLookProducts(product: Product, count = 2): Promise<Product[]> {
  const buildSpecFilter = (fieldId: number, value: string) => value.trim() ? `specificationFilter_${fieldId}:${value.trim()}` : '';
  const collectionFilter = buildSpecFilter(269, product.collection);
  const colorFilter = buildSpecFilter(261, product.color);
  const genderFilter = buildSpecFilter(289, product.gender);
  const strategies = [
    [collectionFilter, colorFilter, genderFilter],
    [collectionFilter, colorFilter],
    [collectionFilter, genderFilter],
    [colorFilter, genderFilter],
    [collectionFilter],
    [colorFilter],
    [genderFilter],
  ].map((filters) => filters.filter(Boolean)).filter((filters) => filters.length > 0);

  const relationships = ['showtogether', 'buytogether', 'accessories', 'suggestions', 'similars'];

  async function hydrate(products: Product[]) {
    return Promise.all(products.map(async (item) => {
      try {
        return await getProduct(item.id);
      } catch {
        return item;
      }
    }));
  }

  function dedupe(products: Product[]) {
    return Array.from(new Map(products
      .filter((item) => item.id && item.id !== product.id)
      .map((item) => [item.id, item])).values());
  }

  async function validate(products: Product[]) {
    const validated: Product[] = [];
    for (const candidate of await hydrate(dedupe(products).slice(0, count * 4))) {
      if (validated.length >= count) break;
      // Conjuntos devem completar o look com outro conjunto; não misture as
      // peças avulsas que a mesma coleção também costuma retornar.
      if (product.isKit && !candidate.isKit) continue;
      if (candidate.variants.length === 0 || candidate.variants.some((variant) => variant.available)) validated.push(candidate);
    }
    return validated;
  }

  for (const fq of strategies) {
    try {
      const result = await searchProductListing({ fq, count: 24, hideUnavailableItems: true, sort: 'orders:desc' });
      const validated = await validate(result.products);
      if (validated.length > 0) return validated;
    } catch {
      // Tenta a combinação seguinte de coleção, cor e gênero.
    }
  }

  for (const relationship of relationships) {
    try {
      const url = new URL(`${storeConfig.vtexBaseUrl}/api/catalog_system/pub/products/crossselling/${relationship}/${encodeURIComponent(product.id)}`);
      url.searchParams.set('sc', storeConfig.salesChannel);
      const result = await getJson<ProductPayload[]>(url.toString());
      const products = Array.from(new Map(result
        .map(normalizeProduct)
        .filter((item) => item.id && item.id !== product.id)
        .map((item) => [item.id, item])).values());
      if (products.length > 0) {
        const validated = await validate(products);
        if (validated.length > 0) return validated;
      }
    } catch {
      // Continua tentando as demais relações configuradas no catálogo VTEX.
    }
  }

  try {
    const fallback = await getSimilarProducts(product, count + 1);
    if (fallback.length > 0) {
      const validated = await validate(fallback);
      if (validated.length > 0) return validated;
    }
  } catch {
    // A busca de fallback é opcional para a seção.
  }

  try {
    const query = product.color || product.brand || product.name;
    const fallback = await searchProducts({ query, count: count + 1 });
    return validate(fallback);
  } catch {
    return [];
  }
}

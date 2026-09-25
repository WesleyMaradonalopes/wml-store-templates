import { storeConfig } from '@/config/store';

const APP_SCHEME = 'lojahr';

const APP_ROUTE_NAMES = new Set([
  'account',
  'checkout',
  'coupons',
  'favorites',
  'orders',
  'privacy-policy',
  'returns',
  'search',
  'stores',
]);

const PRODUCT_ROUTE_NAMES = new Set(['p', 'product', 'produto']);
const PAGE_ROUTE_NAMES = new Set(['page', 'landing', 'landing-page']);
const CAMPAIGN_ROUTE_NAMES = new Set(['campaign', 'campaigns', 'campanha', 'campanhas']);
const CATEGORY_ROUTE_NAMES = new Set(['category', 'categories', 'categoria', 'categorias']);
const COLLECTION_ROUTE_NAMES = new Set(['collection', 'collections', 'colecao', 'colecoes']);

export type DeepLinkResolution =
  | { type: 'route'; route: string }
  | { type: 'external'; url: string }
  | { type: 'none' };

type ParsedTarget = {
  url: URL;
  isCustomScheme: boolean;
  isWebUrl: boolean;
  isRelativePath: boolean;
};

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanSegment(value: string) {
  return decode(value).trim();
}

function encodedSegment(value: string) {
  return encodeURIComponent(value.trim());
}

function normalizedHost(value: string) {
  return value.trim().toLowerCase().replace(/^www\./, '');
}

function configuredHost(value: string) {
  try {
    return normalizedHost(new URL(value).hostname);
  } catch {
    return normalizedHost(value.replace(/^https?:\/\//i, '').split('/')[0]);
  }
}

function allowedWebHosts() {
  return new Set([
    configuredHost(storeConfig.publicStoreUrl),
    configuredHost(storeConfig.vtexBaseUrl),
    configuredHost(storeConfig.domain),
    normalizedHost(storeConfig.host),
  ].filter(Boolean));
}

function isAllowedWebHost(host: string) {
  return allowedWebHosts().has(normalizedHost(host));
}

function parseTarget(value: string): ParsedTarget | null {
  const target = value.trim();
  if (!target) return null;

  const isRelativePath = !/^[a-z][a-z\d+.-]*:/i.test(target) && !target.startsWith('//');
  const normalizedTarget = target.startsWith('//') ? `https:${target}` : target;

  try {
    const url = isRelativePath
      ? new URL(target.startsWith('/') ? target : `/${target}`, `${APP_SCHEME}://app`)
      : new URL(normalizedTarget);
    const protocol = url.protocol.toLowerCase();
    return {
      url,
      isCustomScheme: protocol === `${APP_SCHEME}:`,
      isWebUrl: protocol === 'http:' || protocol === 'https:',
      isRelativePath,
    };
  } catch {
    return null;
  }
}

function pathSegments(parsed: ParsedTarget) {
  const segments = parsed.url.pathname.split('/').filter(Boolean).map(cleanSegment).filter(Boolean);
  if (parsed.isCustomScheme && parsed.url.hostname && parsed.url.hostname !== 'app' && parsed.url.hostname !== APP_SCHEME) {
    segments.unshift(cleanSegment(parsed.url.hostname));
  }
  return segments;
}

function safeRoutePath(segments: string[], search: string) {
  const path = `/${segments.map(encodedSegment).join('/')}`;
  return `${path}${search}`;
}

function routeParam(params: URLSearchParams, key: string, value: string) {
  const normalized = value.trim();
  if (normalized) params.set(key, normalized);
}

function buildSearchRoute({ query, facets, title, sort }: { query?: string; facets?: Array<{ key: string; value: string }>; title?: string; sort?: string }) {
  const params = new URLSearchParams();
  routeParam(params, 'q', query ?? '');
  if (facets && facets.length > 0) params.set('facets', JSON.stringify(facets));
  routeParam(params, 'title', title ?? '');
  routeParam(params, 'sort', sort ?? '');
  const queryString = params.toString();
  return `/search${queryString ? `?${queryString}` : ''}`;
}

function humanizeSlug(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function searchRouteFromParams(url: URL, fallbackQuery = '') {
  const query = url.searchParams.get('q')
    || url.searchParams.get('query')
    || url.searchParams.get('ft')
    || fallbackQuery;
  const title = url.searchParams.get('collectionCatalogTitle') || url.searchParams.get('title') || '';
  const sort = url.searchParams.get('sort') || '';
  const rawFacets = url.searchParams.get('facets');

  if (rawFacets) {
    try {
      const parsed = JSON.parse(rawFacets) as unknown;
      if (Array.isArray(parsed)) {
        const facets = parsed.flatMap((facet) => {
          if (!facet || typeof facet !== 'object') return [];
          const candidate = facet as Record<string, unknown>;
          const key = typeof candidate.key === 'string' ? candidate.key.trim() : '';
          const value = typeof candidate.value === 'string' ? candidate.value.trim() : '';
          return key && value ? [{ key, value }] : [];
        });
        return buildSearchRoute({ query, facets, title, sort });
      }
    } catch {
      // Ignore malformed route state and keep the searchable query.
    }
  }

  return buildSearchRoute({ query, title, sort });
}

function categoryRoute(segments: string[], url: URL) {
  if (segments.length === 0) return null;

  const mapKeys = (url.searchParams.get('map') || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  let query = '';
  const facets: Array<{ key: string; value: string }> = [];

  segments.forEach((segment, index) => {
    const key = mapKeys[index];
    if (key === 'ft') {
      query = segment;
      return;
    }
    facets.push({ key: key || `category-${index + 1}`, value: segment });
  });

  return buildSearchRoute({ query, facets, title: url.searchParams.get('title') || humanizeSlug(segments.at(-1) || '') });
}

function collectionRoute(slug: string, url: URL) {
  if (!slug) return null;

  if (/^\d+$/.test(slug)) {
    return buildSearchRoute({
      facets: [{ key: 'productClusterIds', value: slug }],
      title: url.searchParams.get('title') || '',
    });
  }

  // A public collection URL normally contains a slug, while the app's search
  // screen can resolve a collection name to its VTEX cluster id.
  return buildSearchRoute({
    query: slug.replace(/[-_]+/g, ' '),
    title: url.searchParams.get('title') || humanizeSlug(slug),
  });
}

function routeFromPath(parsed: ParsedTarget): string | null {
  const segments = pathSegments(parsed);
  const first = segments[0]?.toLowerCase() || '';
  const second = segments[1] || '';

  if (segments.length === 0) return '/';

  if (PRODUCT_ROUTE_NAMES.has(first) && second) {
    return `/product/${encodedSegment(second)}`;
  }

  if (PAGE_ROUTE_NAMES.has(first) && second) {
    return `/page/${encodedSegment(second)}`;
  }

  if (CAMPAIGN_ROUTE_NAMES.has(first) && second) {
    return `/page/${encodedSegment(second)}`;
  }

  if (CATEGORY_ROUTE_NAMES.has(first)) {
    return categoryRoute(segments.slice(1), parsed.url);
  }

  if (COLLECTION_ROUTE_NAMES.has(first) && second) {
    return collectionRoute(second, parsed.url);
  }

  if (first === 'search' || first === 'busca') {
    return searchRouteFromParams(parsed.url);
  }

  // VTEX product URLs conventionally end in /p, for example
  // /conjunto-exemplo/p. Keep this after explicit routes so /product/p...
  // is never interpreted as a public product URL.
  if (segments.length >= 2 && segments.at(-1)?.toLowerCase() === 'p') {
    return `/product/${encodedSegment(segments.at(-2) || '')}`;
  }

  const mapKeys = (parsed.url.searchParams.get('map') || '').trim();
  if (mapKeys && segments.length > 0) {
    return categoryRoute(segments, parsed.url);
  }

  if (APP_ROUTE_NAMES.has(first)) {
    return safeRoutePath(segments, parsed.url.search);
  }

  if (first === 'home') return '/';

  return null;
}

export function resolveDeepLink(value: string): DeepLinkResolution {
  const parsed = parseTarget(value);
  if (!parsed) return { type: 'none' };

  if (parsed.isWebUrl && !isAllowedWebHost(parsed.url.hostname)) {
    return { type: 'external', url: value.trim() };
  }

  if (!parsed.isCustomScheme && !parsed.isWebUrl && !parsed.isRelativePath) {
    return { type: 'external', url: value.trim() };
  }

  const route = routeFromPath(parsed);
  if (route) return { type: 'route', route };
  if (parsed.isWebUrl) return { type: 'external', url: value.trim() };
  return { type: 'none' };
}

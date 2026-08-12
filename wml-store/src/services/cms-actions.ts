import type { SelectedFacet } from './catalog';

export type CmsAction = {
  type?: string;
  value?: string;
  title?: string;
  sort?: string;
  banner?: string;
  facets?: unknown;
};

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function readCmsAction(value: unknown): CmsAction {
  if (!value || typeof value !== 'object') return {};
  const action = value as Record<string, unknown>;
  return {
    type: text(action.type),
    value: text(action.value),
    title: text(action.title),
    sort: text(action.sort),
    banner: text(action.banner),
    facets: action.facets,
  };
}

function configuredFacets(value: unknown): SelectedFacet[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((facet) => {
    if (!facet || typeof facet !== 'object') return [];
    const candidate = facet as Record<string, unknown>;
    const key = text(candidate.key);
    const facetValue = text(candidate.value);
    return key && facetValue ? [{ key, value: facetValue }] : [];
  });
}

function decode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeCmsCatalogPath(value: string): { query?: string; facets: SelectedFacet[] } {
  const decoded = decode(value.trim());
  const [pathname, rawQuery = ''] = decoded.split('?');
  const segments = pathname.split('/').filter(Boolean);
  const queryParams = new URLSearchParams(rawQuery);
  const mapKeys = queryParams.get('map')?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  let query = '';
  const facets: SelectedFacet[] = [];

  segments.forEach((segment, index) => {
    const key = mapKeys[index];
    if (key === 'ft') {
      query = segment;
      return;
    }
    facets.push({ key: key || `category-${index + 1}`, value: segment });
  });

  return { query: query || undefined, facets };
}

function routeParam(key: string, value: string, params: string[]) {
  if (value) params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
}

function catalogRoute({
  query,
  facets,
  action,
}: {
  query?: string;
  facets: SelectedFacet[];
  action: CmsAction;
}) {
  const params: string[] = [];
  routeParam('q', query ?? '', params);
  if (facets.length > 0) routeParam('facets', JSON.stringify(facets), params);
  routeParam('sort', action.sort ?? '', params);
  routeParam('title', action.title ?? '', params);
  routeParam('banner', action.banner ?? '', params);
  return `/search${params.length > 0 ? `?${params.join('&')}` : ''}`;
}

export function buildCmsActionRoute(value: unknown): string | null {
  const action = readCmsAction(value);
  const type = action.type?.trim();
  const target = action.value?.trim() ?? '';
  if (!type || type === 'none' || !target) return null;

  if (type === 'product') return `/product/${target}`;
  if (type === 'page') return `/page/${target}`;
  if (type === 'search') return catalogRoute({ query: target, facets: configuredFacets(action.facets), action });

  if (type === 'category') {
    const normalized = normalizeCmsCatalogPath(target);
    return catalogRoute({ query: normalized.query, facets: [...normalized.facets, ...configuredFacets(action.facets)], action });
  }

  if (type === 'collection') {
    return catalogRoute({
      facets: [{ key: 'productClusterIds', value: target }, ...configuredFacets(action.facets)],
      action,
    });
  }

  if (type === 'brand') {
    return catalogRoute({
      facets: [{ key: 'brand', value: target }, ...configuredFacets(action.facets)],
      action,
    });
  }

  if (type === 'facets') {
    return catalogRoute({ facets: configuredFacets(action.facets), action });
  }

  if (type === 'path') {
    if (/^\/(product|page|search)(\/|\?|$)/i.test(target)) return target;
    const normalized = normalizeCmsCatalogPath(target);
    if (normalized.facets.length > 0 || normalized.query) {
      return catalogRoute({ query: normalized.query, facets: normalized.facets, action });
    }
    return target.startsWith('/') ? target : `/${target}`;
  }

  return null;
}

export function parseCmsRouteFacets(value: unknown): SelectedFacet[] {
  if (typeof value !== 'string' || !value) return [];
  try {
    return configuredFacets(JSON.parse(value));
  } catch {
    try {
      return configuredFacets(JSON.parse(decode(value)));
    } catch {
      return [];
    }
  }
}

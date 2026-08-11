import { storeConfig } from '@/config/store';

import { getJson } from './http';
import { getStoredJson, setStoredJson } from './storage';

export type CmsSection = {
  name: string;
  data?: Record<string, unknown>;
};

export type CmsPage = {
  id?: string;
  name?: string;
  sections: CmsSection[];
  settings?: Record<string, unknown>;
};

const cacheTtl = 24 * 60 * 60 * 1000;

type CachedPage = CmsPage & { cachedAt: number };

function normalizePage(payload: unknown): CmsPage | null {
  const candidate = Array.isArray(payload)
    ? payload[0]
    : (payload as { data?: unknown })?.data && Array.isArray((payload as { data: unknown }).data)
      ? ((payload as { data: unknown[] }).data[0] as Record<string, unknown>)
      : payload;

  if (!candidate || typeof candidate !== 'object') return null;

  const page = candidate as { sections?: unknown; settings?: unknown; id?: string; name?: string };
  return {
    id: page.id,
    name: page.name,
    sections: Array.isArray(page.sections)
      ? page.sections.filter((section): section is CmsSection => {
          return Boolean(section && typeof section === 'object' && 'name' in section);
        })
      : [],
    settings:
      page.settings && typeof page.settings === 'object'
        ? (page.settings as Record<string, unknown>)
        : undefined,
  };
}

async function fetchPage(contentType: string, documentId: string): Promise<CmsPage | null> {
  const base = `${storeConfig.vtexCmsUrl}/_v/cms/api/${storeConfig.cmsProjectId}/${contentType}`;

  try {
    const document = await getJson<unknown>(`${base}/${encodeURIComponent(documentId)}`);
    const page = normalizePage(document);
    if (page) return page;
  } catch {
    // Some CMS workspaces expose only the collection endpoint.
  }

  const collection = await getJson<unknown>(base);
  const pages = Array.isArray(collection)
    ? collection
    : ((collection as { data?: unknown[] })?.data ?? []);
  const match = pages.find((item) => {
    if (!item || typeof item !== 'object') return false;
    const value = item as { id?: string; name?: string; slug?: string };
    return value.id === documentId || value.name === documentId || value.slug === documentId;
  });

  return normalizePage(match);
}

export async function getCmsPage(contentType = 'home', documentId = 'home'): Promise<CmsPage | null> {
  const cacheKey = `cms:${storeConfig.cmsProjectId}:${contentType}:${documentId}`;
  const cached = await getStoredJson<CachedPage>(cacheKey);

  if (cached && Date.now() - cached.cachedAt < cacheTtl) {
    fetchPage(contentType, documentId)
      .then((page) => page && setStoredJson(cacheKey, { ...page, cachedAt: Date.now() }))
      .catch(() => undefined);
    return cached;
  }

  const page = await fetchPage(contentType, documentId);
  if (page) await setStoredJson(cacheKey, { ...page, cachedAt: Date.now() });
  return page;
}

import { storeConfig } from '@/config/store';

import { getStoredJson, setStoredJson } from './storage';

const SIZEBAY_API_BASE_URL = 'https://vfr-v3-production.sizebay.technology';
const SIZEBAY_SESSION_ID_KEY = `${storeConfig.account}_sizebay_session_id`;
const MAX_SESSION_RETRIES = 3;

export type SizebayProductInformation = {
  id: string;
  accessory?: boolean;
  shoe?: boolean;
  linkChart: string;
  linkVFR: string;
  [key: string]: unknown;
};

export type SizebayRecommendation = {
  recommendedSize?: string;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sizebayHeaders(storeId: string) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-szb-country': 'BR',
    'x-szb-device': 'mobile',
    'x-szb-tenant-id': storeId,
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function resolveProductUrl(permalink: string) {
  if (/^https?:\/\//i.test(permalink)) return permalink;
  const path = permalink.startsWith('/') ? permalink : `/${permalink}`;
  return `${storeConfig.sizebayDomain}${path}`;
}

function buildFrameUrl(mode: 'vfr' | 'chart', productId: string, sessionId: string, storeId: string, sizesInStock: string[]) {
  const url = new URL(`${SIZEBAY_API_BASE_URL}/V4/`);
  url.search = new URLSearchParams({
    mode,
    id: productId,
    sid: sessionId,
    tenantId: storeId,
    watchOpeningEvents: 'true',
    lang: 'br',
    countryValue: 'BR',
    disableCloseApp: 'true',
    sizesInStock: sizesInStock.join(','),
  }).toString();
  return url.toString();
}

export async function getSession(): Promise<string | null> {
  try {
    const storedSession = await getStoredJson<unknown>(SIZEBAY_SESSION_ID_KEY);
    if (typeof storedSession === 'string' && storedSession.trim()) return storedSession.trim();
  } catch {
    // A stale or malformed local value should not prevent a new session.
  }

  return getNewSession();
}

export async function getNewSession(attempt = 0): Promise<string | null> {
  try {
    const response = await fetch(`${SIZEBAY_API_BASE_URL}/api/me/session-id`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`SizeBay session request failed with status ${response.status}`);

    const payload = await readJson(response);
    const sessionId = typeof payload === 'string'
      ? payload
      : isRecord(payload) && typeof payload.data === 'string'
        ? payload.data
        : '';

    if (!sessionId.trim()) return null;
    await setStoredJson(SIZEBAY_SESSION_ID_KEY, sessionId.trim());
    return sessionId.trim();
  } catch {
    if (attempt >= MAX_SESSION_RETRIES) return null;
    await delay(1000);
    return getNewSession(attempt + 1);
  }
}

export async function getProductInformation(permalink: string, sizesInStock: string[] = []): Promise<SizebayProductInformation | null> {
  const storeId = storeConfig.sizebayStoreId.trim();
  if (!storeId || !permalink.trim()) return null;

  const sessionId = await getSession();
  if (!sessionId) return null;

  const productUrl = resolveProductUrl(permalink.trim());
  const productUrlRequest = new URL(`${SIZEBAY_API_BASE_URL}/plugin/my-product-id`);
  productUrlRequest.searchParams.set('sid', sessionId);
  productUrlRequest.searchParams.set('permalink', productUrl);

  const response = await fetch(productUrlRequest.toString(), {
    headers: sizebayHeaders(storeId),
  });
  if (!response.ok) throw new Error(`SizeBay product request failed with status ${response.status}`);

  const payload = await readJson(response);
  const info = isRecord(payload) && isRecord(payload.data) && !payload.id ? payload.data : payload;
  if (!isRecord(info) || !info.id) return null;

  const productId = String(info.id);
  const normalizedSizes = Array.from(new Set(
    sizesInStock.map((size) => String(size).trim()).filter(Boolean),
  ));
  const linkChart = buildFrameUrl('chart', productId, sessionId, storeId, normalizedSizes);
  const linkVFR = !info.accessory && !info.shoe
    ? buildFrameUrl('vfr', productId, sessionId, storeId, normalizedSizes)
    : '';

  return {
    ...info,
    id: productId,
    linkChart,
    linkVFR,
  };
}

/** Fetches the recommended size after the SizeBay VFR flow completes. */
export async function getRecommendationAnalysis(sizebayProductId: string): Promise<SizebayRecommendation | null> {
  if (!sizebayProductId.trim()) return null;

  const storeId = storeConfig.sizebayStoreId.trim();
  if (!storeId) return null;

  const sessionId = await getSession();
  if (!sessionId) return null;

  const query = new URLSearchParams({
    sid: sessionId,
    tenant: storeId,
    'page-recommendation': 'false',
    sizeHint: 'false',
  });
  const url = `${SIZEBAY_API_BASE_URL}/api/me/analysis/${encodeURIComponent(sizebayProductId.trim())}?${query.toString()}`;
  const response = await fetch(url, { headers: sizebayHeaders(storeId) });
  if (!response.ok) return null;

  const payload = await readJson(response);
  return isRecord(payload) ? payload as SizebayRecommendation : null;
}

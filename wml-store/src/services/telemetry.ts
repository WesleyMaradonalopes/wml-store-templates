import { getStoredJson, removeStoredValue, setStoredJson } from './storage';

const CONSENT_STORAGE_KEY = 'lojahr:tracking-consent';

export type TrackingConsent = 'unknown' | 'granted' | 'denied';

export type TrackingItem = {
  item_id: string;
  item_name?: string;
  item_variant?: string;
  item_category?: string;
  price?: number;
  quantity: number;
};

export type TrackingEvent =
  | { name: 'screen_view'; screen_name: string }
  | { name: 'search'; search_length: number }
  | {
    name: 'purchase';
    transaction_id: string;
    currency: 'BRL';
    value?: number;
    items: TrackingItem[];
  }
  | {
    name: 'view_item' | 'view_cart' | 'add_to_cart' | 'begin_checkout';
    currency: 'BRL';
    value?: number;
    items: TrackingItem[];
  };

export type TrackingProvider = {
  id: string;
  setConsent?: (consent: TrackingConsent) => void | Promise<void>;
  track: (event: TrackingEvent) => void | Promise<void>;
};

const providers = new Map<string, TrackingProvider>();
// Analytics is enabled by default for new installs; a saved denial always wins.
let consent: TrackingConsent = 'granted';
let consentWasChangedInSession = false;
let initialization: Promise<TrackingConsent> | undefined;

async function notifyProvider(provider: TrackingProvider, value: TrackingConsent) {
  try {
    await provider.setConsent?.(value);
  } catch {
    // Telemetry integrations must never interrupt shopping flows.
  }
}

async function notifyProviders(value: TrackingConsent) {
  await Promise.all(Array.from(providers.values(), (provider) => notifyProvider(provider, value)));
}

export function registerTrackingProvider(provider: TrackingProvider) {
  providers.set(provider.id, provider);
  if (initialization) {
    void initialization.then((resolvedConsent) => notifyProvider(provider, resolvedConsent));
  }

  return () => {
    if (providers.get(provider.id) === provider) providers.delete(provider.id);
  };
}

export async function initializeTracking(): Promise<TrackingConsent> {
  if (!initialization) {
    initialization = (async () => {
      try {
        const savedConsent = await getStoredJson<TrackingConsent>(CONSENT_STORAGE_KEY);
        if (!consentWasChangedInSession && (savedConsent === 'granted' || savedConsent === 'denied')) {
          consent = savedConsent;
        }
      } catch {
        // Keep the configured automatic-collection default if storage is unavailable.
      }
      await notifyProviders(consent);
      return consent;
    })();
  }

  return initialization;
}

export async function getTrackingConsent(): Promise<TrackingConsent> {
  return initializeTracking();
}

export async function setTrackingConsent(value: TrackingConsent): Promise<void> {
  consentWasChangedInSession = true;
  consent = value;
  initialization = Promise.resolve(value);

  try {
    if (value === 'unknown') await removeStoredValue(CONSENT_STORAGE_KEY);
    else await setStoredJson(CONSENT_STORAGE_KEY, value);
  } catch {
    // Keep the in-memory choice for this session if local persistence is unavailable.
  }

  await notifyProviders(value);
}

export async function trackEvent(event: TrackingEvent): Promise<void> {
  const currentConsent = await initializeTracking();
  if (currentConsent !== 'granted' || providers.size === 0) return;

  await Promise.all(Array.from(providers.values(), async (provider) => {
    try {
      await provider.track(event);
    } catch {
      // A provider outage must not affect the user-facing app.
    }
  }));
}

/** Map router paths to stable names without sending path parameters such as IDs or slugs. */
export function screenNameForPath(path: string): string {
  const segments = path.split('?')[0].split('/').filter(Boolean);
  const routeSegments = segments.filter((segment) => !/^\([^/]+\)$/.test(segment));
  const first = routeSegments[0] || 'home';

  if (first === 'product') return 'product_detail';
  if (first === 'page') return 'content_page';
  if (first === 'orders') return routeSegments.length > 1 ? 'order_detail' : 'orders';
  if (first === 'index') return 'home';

  const knownScreens = new Set([
    'home', 'search', 'assistant', 'favorites', 'account', 'checkout', 'stores',
    'returns', 'privacy-policy', 'coupons', 'cart', 'explore',
  ]);
  return knownScreens.has(first) ? first.replaceAll('-', '_') : 'other';
}

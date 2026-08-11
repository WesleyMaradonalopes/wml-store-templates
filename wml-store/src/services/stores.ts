import { storeConfig } from '@/config/store';

import { getJson } from './http';

export type Store = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  isFranchise: boolean;
  phone: string;
  whatsappLink: string;
  mapUrl: string;
};

type VtexStore = Record<string, unknown> & {
  id?: string;
  storeId?: string;
  pickupPointId?: string;
  name?: string;
  friendlyName?: string;
  title?: string;
  address?: string | { city?: string; state?: string; country?: string };
  street?: string;
  formattedAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  is_franchise?: boolean;
  phone?: string;
  telephone?: string;
  whatsapp_link?: string;
  mapUrl?: string;
  url?: string;
  mapsUrl?: string;
};

const storesPath =
  '/api/dataentities/OS/search?_fields=phone,city,name,address,state,country,is_franchise,whatsapp_link';

const cache = new Map<string, { expiresAt: number; value: Store[] }>();
const cacheTtl = 24 * 60 * 60 * 1000;

function getText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeStore(store: VtexStore, index: number): Store {
  const addressObject = typeof store.address === 'object' && store.address ? store.address : {};

  return {
    id: getText(store.id || store.storeId || store.pickupPointId) || `store-${index + 1}`,
    name: getText(store.name || store.friendlyName || store.title),
    address:
      getText(store.address) || getText(store.street) || getText(store.formattedAddress),
    city: getText(store.city || addressObject.city),
    state: getText(store.state || addressObject.state),
    country: getText(store.country || addressObject.country),
    isFranchise: Boolean(store.is_franchise),
    phone: getText(store.phone || store.telephone),
    whatsappLink: getText(store.whatsapp_link),
    mapUrl: getText(store.mapUrl || store.url || store.mapsUrl),
  };
}

export async function getStores(): Promise<Store[]> {
  const cached = cache.get('all');
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const payload = await getJson<VtexStore[]>(`${storeConfig.vtexBaseUrl}${storesPath}`);
  const stores = (Array.isArray(payload) ? payload : [])
    .map(normalizeStore)
    .filter((store) => store.name || store.address);

  cache.set('all', { expiresAt: Date.now() + cacheTtl, value: stores });
  return stores;
}

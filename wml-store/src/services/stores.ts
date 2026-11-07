import { storeConfig } from '@/config/store';

import { getJson } from './http';
import { getCmsPage, type CmsPage } from './cms';

export type StoreAddress = {
  street?: string;
  number?: string | number;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type StoreHours = string | Record<string, unknown>;

export type Store = {
  id: string;
  __editorItemTitle?: string;
  name?: string;
  brand?: string;
  address?: string | StoreAddress;
  street?: string;
  number?: string | number;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isFranchise?: boolean;
  phone?: string;
  whatsapp?: string;
  whatsappLink?: string;
  hours?: StoreHours;
  latitude?: number | string;
  longitude?: number | string;
  mapsUrl?: string;
  mapUrl?: string;
};

export type StoreCoordinates = {
  latitude: number;
  longitude: number;
};

export type HoursRow = {
  key: string;
  label?: string;
  value: string;
};

export type HoursLayout = 'stacked' | 'inline';

export type HoursDisplay = {
  rows: HoursRow[];
  layout: HoursLayout;
};

export type StoreLocatorData = {
  stores: Store[];
  title?: string;
  subtitle?: string;
};

type StorePayload = Record<string, unknown>;

type GetStoresOptions = {
  onRefresh?: (data: StoreLocatorData) => void;
};

const legacyStoresPath =
  '/api/dataentities/OS/search?_fields=phone,city,name,address,state,country,is_franchise,whatsapp_link';
const cmsStoreSectionNames = new Set(['findastore', 'findastorelocator', 'storelocator']);
const cmsPageIds = Array.from(new Set([
  storeConfig.storesCmsPageId,
  'find-a-store',
  'nossas-lojas',
]));
const cacheTtl = 24 * 60 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: StoreLocatorData }>();

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseStores(value: unknown): StorePayload[] {
  if (Array.isArray(value)) {
    return value.flatMap((item): StorePayload[] => {
      const parsed = record(item);
      return parsed ? [parsed] : [];
    });
  }

  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    return parseStores(JSON.parse(value));
  } catch {
    return [];
  }
}

function addressObject(store: Store): StoreAddress {
  const nestedAddress =
    typeof store.address === 'object' && store.address !== null
      ? store.address
      : {};

  return {
    ...nestedAddress,
    street:
      nestedAddress.street ||
      (typeof store.address === 'string' ? store.address : store.street),
    number: nestedAddress.number || store.number,
    complement: nestedAddress.complement || store.complement,
    neighborhood: nestedAddress.neighborhood || store.neighborhood,
    city: nestedAddress.city || store.city,
    state: nestedAddress.state || store.state,
    postalCode: nestedAddress.postalCode || store.postalCode,
    country: nestedAddress.country || store.country,
  };
}

export function getStoreName(store: Store) {
  return store.name || store.__editorItemTitle || 'Loja sem nome';
}

export function getAddressLines(store: Store) {
  const address = addressObject(store);
  const primaryLine = [address.street, address.number]
    .filter(Boolean)
    .join(', ');
  const cityState = [address.city, address.state].filter(Boolean).join(' - ');
  const locality = [address.neighborhood, cityState].filter(Boolean).join(', ');
  const secondaryLine = [address.complement, locality, address.postalCode]
    .filter(Boolean)
    .join(', ');

  return { primaryLine, secondaryLine };
}

export function getFullAddress(store: Store) {
  const lines = getAddressLines(store);
  return [lines.primaryLine, lines.secondaryLine].filter(Boolean).join(' - ');
}

export function getStoreCity(store: Store) {
  return addressObject(store).city || '';
}

export function getStoreState(store: Store) {
  return addressObject(store).state || '';
}

export function getStoreSearchText(store: Store) {
  return normalizeText(
    [getStoreName(store), store.brand, getFullAddress(store)]
      .filter(Boolean)
      .join(' '),
  );
}

function coordinatesFromMapUrl(mapsUrl?: string): StoreCoordinates | null {
  if (!mapsUrl) return null;

  const coordinatePatterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of coordinatePatterns) {
    const match = mapsUrl.match(pattern);
    if (!match) continue;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}

export function getCoordinates(store: Store): StoreCoordinates | null {
  if (
    store.latitude !== undefined &&
    store.latitude !== null &&
    String(store.latitude).trim() !== '' &&
    store.longitude !== undefined &&
    store.longitude !== null &&
    String(store.longitude).trim() !== ''
  ) {
    const latitude = Number(store.latitude);
    const longitude = Number(store.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return coordinatesFromMapUrl(store.mapsUrl || store.mapUrl);
}

export function calculateDistanceInKm(
  origin: StoreCoordinates,
  destination: StoreCoordinates,
) {
  const earthRadiusInKm = 6371;
  const latitudeDelta = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const longitudeDelta = ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const originLatitude = (origin.latitude * Math.PI) / 180;
  const destinationLatitude = (destination.latitude * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2) *
      Math.cos(originLatitude) *
      Math.cos(destinationLatitude);

  return earthRadiusInKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(distanceKm?: number) {
  if (typeof distanceKm !== 'number') return '';
  return `${distanceKm.toFixed(1).replace('.', ',')} km`;
}

export function getWhatsAppUrl(whatsapp?: string) {
  if (!whatsapp) return '';
  if (/^https?:\/\//i.test(whatsapp)) return whatsapp;

  const digits = whatsapp.replace(/\D/g, '');
  const phoneNumber =
    digits.startsWith('55') || (digits.length !== 10 && digits.length !== 11)
      ? digits
      : `55${digits}`;

  return phoneNumber ? `https://wa.me/${phoneNumber}` : '';
}

export function getMapsUrl(store: Store) {
  const configuredUrl = store.mapsUrl || store.mapUrl;
  if (configuredUrl) return configuredUrl;

  const query = getFullAddress(store) || getStoreName(store);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getMapEmbedUrl(store?: Store | null) {
  const coordinates = store ? getCoordinates(store) : null;
  if (coordinates) {
    const mapDelta = 0.03;
    const boundingBox = [
      coordinates.longitude - mapDelta,
      coordinates.latitude - mapDelta,
      coordinates.longitude + mapDelta,
      coordinates.latitude + mapDelta,
    ].map(String).join(',');

    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
      boundingBox,
    )}&layer=mapnik&marker=${coordinates.latitude}%2C${coordinates.longitude}`;
  }

  const query = store ? getFullAddress(store) || getStoreName(store) : 'Brasil';
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

const hoursDayFields = [
  { key: 'monday', label: 'Segunda', aliases: ['monday', 'segunda', 'segunda-feira'] },
  { key: 'tuesday', label: 'Terça', aliases: ['tuesday', 'terca', 'terça', 'terça-feira'] },
  { key: 'wednesday', label: 'Quarta', aliases: ['wednesday', 'quarta', 'quarta-feira'] },
  { key: 'thursday', label: 'Quinta', aliases: ['thursday', 'quinta', 'quinta-feira'] },
  { key: 'friday', label: 'Sexta', aliases: ['friday', 'sexta', 'sexta-feira'] },
  { key: 'saturday', label: 'Sábado', aliases: ['saturday', 'sabado', 'sábado', 'sábado-feira'] },
  { key: 'sunday', label: 'Domingo', aliases: ['sunday', 'domingo', 'domingo-feira'] },
  { key: 'holidays', label: 'Feriados', aliases: ['holidays', 'feriados', 'feriado'] },
] as const;

function normalizeHoursKey(key: string) {
  return normalizeText(key).replace(/[^a-z0-9]/g, '');
}

function splitHoursValue(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return String(value || '')
    .split(/\r?\n|\||;|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getHoursLayout(value: unknown): HoursLayout {
  const normalizedValue = normalizeHoursKey(String(value || ''));
  return ['inline', 'same-line', 'samalinha', 'linha'].some((option) =>
    normalizedValue.includes(normalizeHoursKey(option)),
  ) ? 'inline' : 'stacked';
}

export function getHoursDisplay(hours?: StoreHours): HoursDisplay {
  if (!hours) return { rows: [], layout: 'stacked' };

  if (typeof hours === 'string') {
    return {
      rows: hours.trim() ? [{ key: 'hours', value: hours.trim() }] : [],
      layout: 'inline',
    };
  }

  const entries = Object.entries(hours).filter(([, value]) => String(value || '').trim());
  const layoutEntry = entries.find(([key]) => ['layout', 'exibicao', 'formato'].includes(normalizeHoursKey(key)));
  const layout = getHoursLayout(layoutEntry?.[1]);
  const weekEntry = entries.find(([key]) => ['week', 'semana', 'days', 'dias'].includes(normalizeHoursKey(key)));
  const scheduleEntry = entries.find(([key]) => ['schedule', 'horario', 'horarios', 'hours', 'time', 'times'].includes(normalizeHoursKey(key)));

  if (weekEntry || scheduleEntry) {
    const days = splitHoursValue(weekEntry?.[1]);
    const schedules = splitHoursValue(scheduleEntry?.[1]);
    const totalRows = Math.max(days.length, schedules.length);
    const rows: HoursRow[] = [];

    for (let index = 0; index < totalRows; index += 1) {
      const label = days[index] || (days.length === 1 ? days[0] : '');
      const value = schedules[index] || (schedules.length === 1 ? schedules[0] : '');
      if (label || value) rows.push({ key: `hour-${index}`, label: label || undefined, value });
    }

    return { rows, layout };
  }

  const usedKeys = new Set<string>();
  if (layoutEntry) usedKeys.add(layoutEntry[0]);
  const orderedRows = hoursDayFields.reduce<HoursRow[]>((rows, { aliases, key, label }) => {
    const entry = entries.find(([entryKey]) => aliases.some((alias) => normalizeHoursKey(alias) === normalizeHoursKey(entryKey)));
    if (entry) {
      usedKeys.add(entry[0]);
      rows.push({ key, label, value: String(entry[1]).trim() });
    }
    return rows;
  }, []);
  const extraRows = entries
    .filter(([entryKey]) => !usedKeys.has(entryKey))
    .map(([key, value]) => ({ key, label: key, value: String(value).trim() }));

  return { rows: [...orderedRows, ...extraRows], layout };
}

function normalizeStore(store: StorePayload, index: number): Store {
  const nestedAddress = record(store.address);
  const id = text(store.id || store.storeId || store.pickupPointId) || `store-${index + 1}`;

  return {
    id,
    __editorItemTitle: text(store.__editorItemTitle),
    name: text(store.name || store.friendlyName || store.title),
    brand: text(store.brand),
    address: typeof store.address === 'string' ? store.address : undefined,
    street: text(store.street || nestedAddress?.street || store.formattedAddress),
    number: typeof store.number === 'number' || typeof store.number === 'string' ? store.number : undefined,
    complement: text(store.complement || nestedAddress?.complement),
    neighborhood: text(store.neighborhood || nestedAddress?.neighborhood),
    city: text(store.city || nestedAddress?.city),
    state: text(store.state || nestedAddress?.state),
    postalCode: text(store.postalCode || nestedAddress?.postalCode),
    country: text(store.country || nestedAddress?.country),
    isFranchise: Boolean(store.isFranchise ?? store.is_franchise),
    phone: text(store.phone || store.telephone),
    whatsapp: text(store.whatsapp || store.whatsapp_link),
    whatsappLink: text(store.whatsappLink || store.whatsapp_link),
    hours: record(store.hours) || text(store.hours) || undefined,
    latitude: typeof store.latitude === 'number' || typeof store.latitude === 'string' ? store.latitude : undefined,
    longitude: typeof store.longitude === 'number' || typeof store.longitude === 'string' ? store.longitude : undefined,
    mapsUrl: text(store.mapsUrl || store.mapUrl || store.url),
    mapUrl: text(store.mapUrl || store.mapsUrl || store.url),
  };
}

function validStores(value: unknown) {
  return parseStores(value)
    .map(normalizeStore)
    .filter((store) => Boolean(
      store.name ||
      store.__editorItemTitle ||
      getFullAddress(store),
    ));
}

function storesFromCmsPage(page: CmsPage | null): StoreLocatorData | null {
  if (!page) return null;

  const section = page.sections.find((item) => cmsStoreSectionNames.has(normalizeText(item.name).replace(/[^a-z0-9]/g, '')));
  if (!section) return null;

  const data = section.data || {};
  return {
    stores: validStores(data.stores ?? data.locations ?? data.content),
    title: text(data.title) || undefined,
    subtitle: text(data.subtitle) || undefined,
  };
}

async function getCmsStores(options: GetStoresOptions): Promise<StoreLocatorData | null> {
  for (const documentId of cmsPageIds) {
    const page = await getCmsPage('landingPage', documentId, {
      onRefresh: (refreshedPage) => {
        const refreshedData = storesFromCmsPage(refreshedPage);
        if (refreshedData) options.onRefresh?.(refreshedData);
      },
    }).catch(() => null);

    const stores = storesFromCmsPage(page);
    if (stores) return stores;
  }

  return null;
}

type LegacyStore = StorePayload & {
  id?: string;
  storeId?: string;
  pickupPointId?: string;
};

async function getLegacyStores(): Promise<StoreLocatorData> {
  const cached = cache.get('legacy');
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const payload = await getJson<LegacyStore[]>(`${storeConfig.vtexBaseUrl}${legacyStoresPath}`);
  const data = { stores: validStores(Array.isArray(payload) ? payload : []) };
  cache.set('legacy', { expiresAt: Date.now() + cacheTtl, value: data });
  return data;
}

export async function getStoreLocator(options: GetStoresOptions = {}): Promise<StoreLocatorData> {
  const cmsStores = await getCmsStores(options);
  if (cmsStores) {
    cache.set('cms', { expiresAt: Date.now() + cacheTtl, value: cmsStores });
    return cmsStores;
  }

  const cachedCms = cache.get('cms');
  if (cachedCms && cachedCms.expiresAt > Date.now()) return cachedCms.value;

  return getLegacyStores();
}

export async function getStores(options: { onRefresh?: (stores: Store[]) => void } = {}): Promise<Store[]> {
  const data = await getStoreLocator({
    onRefresh: (refreshedData) => options.onRefresh?.(refreshedData.stores),
  });
  return data.stores;
}

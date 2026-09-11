import { Product, getProduct } from './catalog';
import { getAccountSession, getCachedAccountSession, getCachedVtexUserToken, getVtexUserToken } from './auth';
import { getStoredJson, setStoredJson } from './storage';
import { storeConfig } from '@/config/store';

const SHARED_FAVORITES_REQUEST_TIMEOUT_MS = 4000;

function cacheKey(email: string) {
  return `lojahr:favorites:${email.toLowerCase()}`;
}

export async function createSharedFavoritesUrl(
  products: Pick<Product, 'id' | 'linkText'>[],
  email?: string | null,
) {
  // O backend mantém o nome `productIds`, mas o `link-share` do site envia
  // os linkTexts (slugs). O costumer-wishlist usa esses valores para buscar
  // cada produto publicamente pelo endpoint `/.../{linkText}/p`.
  const productSlugs = Array.from(new Set(
    products
      .map((product) => product.linkText.trim())
      .filter((slug) => slug.length > 5),
  ));
  if (productSlugs.length === 0) {
    throw new Error('Adicione um item aos favoritos para compartilhar.');
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SHARED_FAVORITES_REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${storeConfig.publicStoreUrl}/_v/share-wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: productSlugs,
          email: email?.trim().toLowerCase() || null,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const payload = await response.json().catch(() => ({})) as {
      token?: string;
      message?: string;
      error?: string;
    };

    if (!response.ok || !payload.token) {
      throw new Error(payload.message || payload.error || `Não foi possível criar o link de favoritos (HTTP ${response.status}).`);
    }

    return `${storeConfig.publicStoreUrl}/favoritos/${encodeURIComponent(payload.token)}`;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      error = new Error('O serviço de compartilhamento está indisponível.');
    }

    return `${storeConfig.publicStoreUrl}/favoritos?productSlugs=${encodeURIComponent(productSlugs.join(','))}`;
  }
}

export type FavoriteChange = {
  email: string;
  wishlist: string[];
};

type FavoriteChangeListener = (change: FavoriteChange) => void;

const favoriteChangeListeners = new Set<FavoriteChangeListener>();

export function subscribeFavoriteChanges(listener: FavoriteChangeListener) {
  favoriteChangeListeners.add(listener);
  return () => favoriteChangeListeners.delete(listener);
}

function notifyFavoriteChanges(email: string, wishlist: string[]) {
  const change = { email: email.trim().toLowerCase(), wishlist: Array.from(new Set(wishlist)) };
  favoriteChangeListeners.forEach((listener) => {
    try {
      listener(change);
    } catch {
      // Um card não deve interromper a atualização dos demais.
    }
  });
}

async function getCachedIds(email: string) {
  return (await getStoredJson<string[]>(cacheKey(email))) ?? [];
}

async function saveCachedIds(email: string, ids: string[]) {
  await setStoredJson(cacheKey(email), Array.from(new Set(ids)));
}

async function productsFromIds(ids: string[]) {
  const products = await Promise.all(ids.map((id) => getProduct(id).catch(() => null)));
  return products.filter((product): product is Product => Boolean(product));
}

async function loadFavorites(): Promise<Product[]> {
  const session = await getAccountSession();
  const token = await getVtexUserToken();
  if (!session?.email || !token) return [];
  const cachedIds = await getCachedIds(session.email);
  try {
    const response = await fetch(`${storeConfig.backendUrl}/customer/wishlist?email=${encodeURIComponent(session.email)}`, { headers: { VtexIdclientAutCookie: token } });
    if (response.ok) {
      const payload = await response.json() as { wishlist?: string[] };
      const serverIds = Array.from(new Set((payload.wishlist ?? []).map((id) => String(id).trim()).filter(Boolean)));
      await saveCachedIds(session.email, serverIds);
      notifyFavoriteChanges(session.email, serverIds);
      return productsFromIds(serverIds);
    }
  } catch {
    // Usa o último estado confirmado localmente enquanto a API estiver indisponível.
  }
  return productsFromIds(cachedIds);
}

// Reaproveita apenas chamadas concorrentes. Assim o app continua sincronizado
// com o site, mas a aba, o cabeçalho e a tela não fazem a mesma consulta em
// paralelo quando são montados juntos.
let favoritesReadInFlight: Promise<Product[]> | null = null;

export function getFavorites(): Promise<Product[]> {
  if (favoritesReadInFlight) return favoritesReadInFlight;
  const request = loadFavorites();
  favoritesReadInFlight = request;
  return request.finally(() => {
    if (favoritesReadInFlight === request) favoritesReadInFlight = null;
  });
}

// Permite mostrar imediatamente o último estado confirmado localmente. A
// chamada getFavorites continua rodando em seguida para atualizar a tela com
// o estado real da VTEX.
export async function getCachedFavorites(): Promise<Product[]> {
  const session = await getAccountSession();
  if (!session?.email) return [];
  return productsFromIds(await getCachedIds(session.email));
}

export async function canSaveFavorites() {
  const [session, token] = await Promise.all([getAccountSession(), getVtexUserToken()]);
  return Boolean(session?.email && token);
}

export type FavoriteAuthState = 'authenticated' | 'anonymous' | 'unknown';

export function getKnownFavoriteAuthState(): FavoriteAuthState {
  const session = getCachedAccountSession();
  const token = getCachedVtexUserToken();
  if (session === null || token === null) return 'anonymous';
  if (session?.email && token) return 'authenticated';
  return 'unknown';
}

export async function isFavorite(productId: string) {
  const session = await getAccountSession();
  const token = await getVtexUserToken();
  if (!session?.email || !token) return false;
  const cachedIds = await getCachedIds(session.email);
  if (cachedIds.includes(productId)) return true;
  return (await getFavorites()).some((product) => product.id === productId);
}

export async function toggleFavorite(product: Product, options: { hydrate?: boolean } = {}) {
  const session = await getAccountSession();
  const token = await getVtexUserToken();
  if (!session?.email || !token) throw new Error('Entre na sua conta para salvar favoritos.');
  const response = await fetch(`${storeConfig.backendUrl}/customer/wishlist/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', VtexIdclientAutCookie: token }, body: JSON.stringify({ email: session.email, productId: product.id, title: product.name, sku: product.itemId }) });
  const payload = await response.json().catch(() => ({})) as { favorite?: boolean; wishlist?: string[]; message?: string };
  if (!response.ok) throw new Error(payload.message || `Não foi possível atualizar os favoritos (HTTP ${response.status}).`);
  const cachedIds = await getCachedIds(session.email);
  const ids = Array.from(new Set(payload.wishlist ?? (payload.favorite ? [...cachedIds, product.id] : cachedIds.filter((id) => id !== product.id))));
  await saveCachedIds(session.email, ids);
  notifyFavoriteChanges(session.email, ids);
  return {
    favorite: Boolean(payload.favorite),
    favorites: options.hydrate === false ? [] : await productsFromIds(ids),
  };
}

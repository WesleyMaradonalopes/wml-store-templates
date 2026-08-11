import { Product, getProduct } from './catalog';
import { getAccountSession, getVtexUserToken } from './auth';
import { getStoredJson, setStoredJson } from './storage';
import { storeConfig } from '@/config/store';

function cacheKey(email: string) {
  return `lojabl:favorites:${email.toLowerCase()}`;
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
      const serverIds = payload.wishlist ?? [];
      await saveCachedIds(session.email, serverIds);
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

export async function isFavorite(productId: string) {
  const session = await getAccountSession();
  const token = await getVtexUserToken();
  if (!session?.email || !token) return false;
  const cachedIds = await getCachedIds(session.email);
  if (cachedIds.includes(productId)) return true;
  return (await getFavorites()).some((product) => product.id === productId);
}

export async function toggleFavorite(product: Product) {
  const session = await getAccountSession();
  const token = await getVtexUserToken();
  if (!session?.email || !token) throw new Error('Entre na sua conta para salvar favoritos.');
  const response = await fetch(`${storeConfig.backendUrl}/customer/wishlist/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json', VtexIdclientAutCookie: token }, body: JSON.stringify({ email: session.email, productId: product.id }) });
  const payload = await response.json().catch(() => ({})) as { favorite?: boolean; wishlist?: string[]; message?: string };
  if (!response.ok) throw new Error(payload.message || `Não foi possível atualizar os favoritos (HTTP ${response.status}).`);
  const cachedIds = await getCachedIds(session.email);
  const ids = payload.wishlist ?? (payload.favorite ? [...cachedIds, product.id] : cachedIds.filter((id) => id !== product.id));
  await saveCachedIds(session.email, ids);
  return { favorite: Boolean(payload.favorite), favorites: await productsFromIds(ids) };
}

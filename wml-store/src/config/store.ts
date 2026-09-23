const env: Record<string, string | undefined> =
  typeof process !== 'undefined' ? process.env : {};
const account = env.EXPO_PUBLIC_VTEX_ACCOUNT || 'lojahr';
const vtexBaseUrl = (env.EXPO_PUBLIC_VTEX_BASE_URL || `https://${account}.myvtex.com`).replace(/\/$/, '');
const vtexCmsUrl = (env.EXPO_PUBLIC_VTEX_CMS_URL || vtexBaseUrl).replace(/\/$/, '');
const domain = (env.EXPO_PUBLIC_STORE_DOMAIN || vtexBaseUrl).replace(/\/$/, '');
const host = env.EXPO_PUBLIC_STORE_HOST || domain.replace(/^https?:\/\//, '');
const publicStoreUrl = (env.EXPO_PUBLIC_PUBLIC_STORE_URL || 'https://www.hoperesort.com.br').replace(/\/$/, '');
const sizebayDomain = (env.EXPO_PUBLIC_SIZEBAY_DOMAIN || publicStoreUrl).replace(/\/$/, '');
const sizebayStoreId = (env.EXPO_PUBLIC_SIZEBAY_STORE_ID || '866').trim();
const widdeEnabled = !['0', 'false', 'no', 'off'].includes((env.EXPO_PUBLIC_WIDDE_ENABLED || 'true').trim().toLowerCase());
const widdeStoreUrl = (env.EXPO_PUBLIC_WIDDE_STORE_URL || publicStoreUrl).replace(/\/$/, '');
const widdeEcommerceToken = (env.EXPO_PUBLIC_WIDDE_ECOMMERCE_TOKEN || 'BR').trim();

export const storeConfig = {
  account,
  domain,
  host,
  sizebayDomain,
  sizebayStoreId,
  vtexBaseUrl,
  vtexCmsUrl,
  cmsProjectId: env.EXPO_PUBLIC_VTEX_CMS_PROJECT_ID || 'lojahr-mobile-app',
  salesChannel: env.EXPO_PUBLIC_VTEX_SALES_CHANNEL || '1',
  backendUrl: env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:6001',
  publicStoreUrl,
  widdeEnabled,
  widdeStoreUrl,
  widdeEcommerceToken,
} as const;

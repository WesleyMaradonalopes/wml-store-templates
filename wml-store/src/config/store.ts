const env: Record<string, string | undefined> =
  typeof process !== 'undefined' ? process.env : {};
const account = env.EXPO_PUBLIC_VTEX_ACCOUNT || 'lojabl';
const vtexBaseUrl = (env.EXPO_PUBLIC_VTEX_BASE_URL || `https://${account}.myvtex.com`).replace(/\/$/, '');
const vtexCmsUrl = (env.EXPO_PUBLIC_VTEX_CMS_URL || vtexBaseUrl).replace(/\/$/, '');
const domain = (env.EXPO_PUBLIC_STORE_DOMAIN || (account === 'lojabl' ? 'https://www.lojabl.com.br' : vtexBaseUrl)).replace(/\/$/, '');
const host = env.EXPO_PUBLIC_STORE_HOST || domain.replace(/^https?:\/\//, '');

export const storeConfig = {
  account,
  domain,
  host,
  vtexBaseUrl,
  vtexCmsUrl,
  cmsProjectId: env.EXPO_PUBLIC_VTEX_CMS_PROJECT_ID || 'appdev',
  salesChannel: env.EXPO_PUBLIC_VTEX_SALES_CHANNEL || '1',
  backendUrl: env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:6001',
} as const;

export const storeConfig = {
  account: 'lojabl',
  domain: 'https://www.lojabl.com.br',
  host: 'www.lojabl.com.br',
  vtexBaseUrl: 'https://lojabl.myvtex.com',
  vtexCmsUrl: 'https://lojabl.myvtex.com',
  cmsProjectId: 'appdev',
  salesChannel: '1',
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:6001',
} as const;

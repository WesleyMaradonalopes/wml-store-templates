import { storeConfig } from '@/config/store';
import { getVtexUserToken } from './auth';

export type CustomerProfile = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  document?: string;
  homePhone?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  isNewsletterOptIn?: boolean;
};

export type CustomerAddress = {
  id?: string;
  addressName?: string;
  receiverName?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  reference?: string;
};

export async function getCustomerAddressesFromMasterData(email: string): Promise<CustomerAddress[]> {
  if (!email) return [];
  const backendResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || storeConfig.backendUrl}/customer/addresses?email=${encodeURIComponent(email)}`).catch(() => null);
  if (!backendResponse?.ok) return [];
  const payload = await backendResponse.json().catch(() => ({})) as { addresses?: CustomerAddress[] };
  return Array.isArray(payload.addresses) ? payload.addresses : [];
}

export async function getCustomerProfileFromMasterData(email: string): Promise<CustomerProfile | null> {
  const token = await getVtexUserToken();
  if (!token || !email) throw new Error('Sessão VTEX sem token de usuário. Saia e entre novamente.');

  const backendResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || storeConfig.backendUrl}/customer/profile?email=${encodeURIComponent(email)}`, {
    headers: { VtexIdclientAutCookie: token },
  }).catch(() => null);
  if (backendResponse?.ok) {
    const payload = await backendResponse.json() as { profile?: CustomerProfile | null };
    if (payload.profile) return payload.profile;
  }

  // Endpoint oficial para storefronts headless. O parâmetro permite perfis
  // incompletos, que também precisam aparecer na tela de dados pessoais.
  const profileResponse = await fetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/profiles?email=${encodeURIComponent(email)}&ensureComplete=false`,
    { headers: { VtexIdclientAutCookie: token } },
  );
  if (profileResponse.ok) {
    const profile = await profileResponse.json() as CustomerProfile | CustomerProfile[] | { profile?: CustomerProfile; data?: CustomerProfile };
    const result = (Array.isArray(profile) ? profile[0] : ('profile' in profile ? profile.profile : 'data' in profile ? profile.data : profile)) as CustomerProfile | undefined;
    if (result) return result;
  }

  // Compatibilidade com a rota personalizada que já era usada no projeto antigo.
  const legacyResponse = await fetch(
    `${storeConfig.vtexBaseUrl}/_v/api/masterdata/user/email=${encodeURIComponent(email)}`,
    { headers: { VtexIdclientAutCookie: token } },
  );
  if (!legacyResponse.ok) throw new Error(`A VTEX não retornou o perfil do cliente (oficial ${profileResponse.status}, Master Data ${legacyResponse.status}).`);
  const data = await legacyResponse.json() as CustomerProfile | CustomerProfile[] | { profile?: CustomerProfile; data?: CustomerProfile };
  const result = (Array.isArray(data) ? data[0] : ('profile' in data ? data.profile : 'data' in data ? data.data : data)) as CustomerProfile | undefined;
  return result ?? null;
}

export async function updateCustomerProfile(email: string, profile: CustomerProfile): Promise<CustomerProfile> {
  const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL || storeConfig.backendUrl}/customer/profile/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  const payload = await response.json().catch(() => ({})) as { profile?: CustomerProfile; message?: string };
  if (!response.ok || !payload.profile) throw new Error(payload.message || 'Não foi possível salvar o perfil.');
  return payload.profile;
}

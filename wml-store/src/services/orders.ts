import { storeConfig } from '@/config/store';
import { getAccountSession, getVtexUserToken } from './auth';

export type CustomerOrder = {
  orderId: string;
  creationDate?: string;
  status?: string;
  value?: number;
  items?: Array<{ name?: string; quantity?: number; imageUrl?: string; price?: number }>;
  shippingData?: unknown;
  clientProfileData?: unknown;
  paymentData?: unknown;
  [key: string]: any;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getVtexUserToken();
  return token ? { VtexIdclientAutCookie: token } : {};
}

export async function getCustomerOrders(): Promise<CustomerOrder[]> {
  const session = await getAccountSession();
  const query = session?.email ? `?email=${encodeURIComponent(session.email)}` : '';
  const response = await fetch(`${storeConfig.backendUrl}/customer/orders${query}`, { headers: await authHeaders() });
  if (!response.ok) throw new Error(`Não foi possível carregar os pedidos: ${response.status}`);
  const payload = await response.json() as { orders?: CustomerOrder[] };
  return payload.orders ?? [];
}

export async function getCustomerOrder(orderId: string): Promise<CustomerOrder> {
  const response = await fetch(`${storeConfig.backendUrl}/customer/orders/${encodeURIComponent(orderId)}`, { headers: await authHeaders() });
  if (!response.ok) throw new Error(`Não foi possível carregar o pedido: ${response.status}`);
  const payload = await response.json() as { order?: CustomerOrder };
  if (!payload.order) throw new Error('Pedido não encontrado.');
  return payload.order;
}

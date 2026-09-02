import { storeConfig } from '@/config/store';

import { getAccountSession, getVtexUserToken } from './auth';

export type CustomerOrderBundleItem = {
  id?: string | number;
  name?: string;
  quantity?: number;
  price?: number;
  priceDefinition?: { total?: number };
};

export type CustomerOrderItem = {
  id?: string | number;
  name?: string;
  quantity?: number;
  imageUrl?: string;
  price?: number;
  bundleItems?: CustomerOrderBundleItem[];
};

export type CustomerOrder = {
  orderId: string;
  creationDate?: string;
  status?: string;
  value?: number;
  items?: CustomerOrderItem[];
  shippingData?: unknown;
  clientProfileData?: unknown;
  paymentData?: unknown;
  [key: string]: any;
};

export function orderStatusLabel(status?: string) {
  const normalized = String(status || '').trim().toLowerCase();
  const labels: Record<string, string> = {
    invoiced: 'Faturado',
    processing: 'Processando',
    handling: 'Em preparação',
    'ready-for-handling': 'Em preparação',
    shipped: 'Enviado',
    delivered: 'Entregue',
    canceled: 'Cancelado',
    cancelled: 'Cancelado',
    'payment-pending': 'Aguardando pagamento',
    'waiting-for-seller-confirmation': 'Aguardando confirmação',
  };
  return labels[normalized] || status || 'Processando';
}

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

export type CardPaymentData = {
  cardNumber: string;
  holderName: string;
  validationCode: string;
  dueDate: string;
};

export type PaymentAddress = {
  receiverName: string;
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type PaymentAppData = {
  appName: string;
  appPayload: string;
};

export type CheckoutOrderStatus = 'completed' | 'pending_payment' | 'payment_failed';

export type CheckoutOrderResult = {
  ok: true;
  status: CheckoutOrderStatus;
  orderId: string;
  orderGroup: string;
  transactionId: string;
  paymentId?: string;
  paymentApp?: PaymentAppData | null;
  code?: string;
  message?: string;
};

export type PlaceOrderInput = {
  orderFormId: string;
  paymentSystem: string;
  paymentKind: 'card' | 'pix' | 'giftcard';
  document: string;
  address: PaymentAddress;
  card?: CardPaymentData;
  savePersonalData?: boolean;
  optinNewsLetter?: boolean;
  captchaToken?: string;
  captchaSiteKey?: string;
};

export type TransactionStatus = {
  ok: true;
  status: 'completed' | 'waiting' | 'failed';
  orderId: string;
  paymentId?: string;
};

export class CheckoutOrderError extends Error {
  code?: string;
  statusCode?: number;
  recaptchaKey?: string;

  constructor(message: string, code?: string, statusCode?: number, recaptchaKey?: string) {
    super(message);
    this.name = 'CheckoutOrderError';
    this.code = code;
    this.statusCode = statusCode;
    this.recaptchaKey = recaptchaKey;
  }
}

async function readJson(response: Response) {
  return await response.json().catch(() => ({})) as {
    ok?: boolean;
    code?: string;
    message?: string;
    status?: CheckoutOrderStatus | TransactionStatus['status'];
    orderId?: string;
    orderGroup?: string;
    transactionId?: string;
    paymentId?: string;
    paymentApp?: PaymentAppData | null;
    recaptchaKey?: string;
  };
}

export async function placeOrder(input: PlaceOrderInput): Promise<CheckoutOrderResult> {
  const userToken = await getVtexUserToken();
  const response = await fetch(`${storeConfig.backendUrl}/checkout/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userToken ? { VtexIdclientAutCookie: userToken } : {}),
    },
    body: JSON.stringify(input),
  }).catch(() => null);

  if (!response) throw new CheckoutOrderError('Não foi possível conectar ao serviço de checkout.');
  const payload = await readJson(response);
  if (!response.ok || payload.ok !== true) {
    throw new CheckoutOrderError(
      payload.message || 'Não foi possível finalizar o pedido.',
      payload.code,
      response.status,
      payload.recaptchaKey,
    );
  }

  return payload as CheckoutOrderResult;
}

export async function getTransactionStatus(transactionId: string, orderGroup: string, paymentId?: string): Promise<TransactionStatus> {
  const userToken = await getVtexUserToken();
  const query = new URLSearchParams({ orderGroup });
  if (paymentId) query.set('paymentId', paymentId);
  const response = await fetch(
    `${storeConfig.backendUrl}/checkout/transaction/${encodeURIComponent(transactionId)}/status?${query.toString()}`,
    { headers: userToken ? { VtexIdclientAutCookie: userToken } : {} },
  ).catch(() => null);

  if (!response) throw new CheckoutOrderError('Não foi possível consultar o pagamento.');
  const payload = await readJson(response);
  if (!response.ok || payload.ok !== true) {
    throw new CheckoutOrderError(
      payload.message || 'Não foi possível consultar o pagamento.',
      payload.code,
      response.status,
    );
  }
  return payload as TransactionStatus;
}

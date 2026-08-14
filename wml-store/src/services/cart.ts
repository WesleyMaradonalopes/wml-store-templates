import { storeConfig } from '@/config/store';

import { getStoredJson, removeStoredValue, setStoredJson } from './storage';
import { getVtexUserToken } from './auth';

export type CartItem = {
  index: number;
  id: string;
  seller: string;
  productId: string;
  name: string;
  quantity: number;
  imageUrl: string;
  price: number;
};

export type OrderForm = {
  orderFormId: string;
  value: number;
  items: CartItem[];
  clientProfileData?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    document?: string;
    phone?: string;
    gender?: string;
    birthDate?: string;
  };
  shippingData?: {
    selectedAddresses?: Array<{ receiverName?: string; postalCode?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string }>;
    logisticsInfo: Array<{
      itemIndex: number;
      selectedSla?: string;
      selectedDeliveryChannel?: string;
      slas: Array<{
        id: string;
        name: string;
        price: number;
        shippingEstimate: string;
        deliveryChannel?: string;
      }>;
    }>;
  };
  paymentData?: {
    paymentSystems: Array<{ id: string; name: string; group: string }>;
  };
};

type CartChangeListener = (orderForm: OrderForm) => void;
const cartChangeListeners = new Set<CartChangeListener>();

export function subscribeToCartChanges(listener: CartChangeListener) {
  cartChangeListeners.add(listener);
  return () => { cartChangeListeners.delete(listener); };
}

function publishCartChange(orderForm: OrderForm) {
  cartChangeListeners.forEach((listener) => listener(orderForm));
}

export type ShippingQuote = {
  id: string;
  name: string;
  price: number;
  shippingEstimate: string;
};

type VtexOrderForm = {
  orderFormId: string;
  value?: number;
  items?: Array<{
    seller?: string;
    id?: string;
    productId?: string;
    name?: string;
    quantity?: number;
    imageUrl?: string;
    price?: number;
  }>;
  clientProfileData?: OrderForm['clientProfileData'];
  shippingData?: {
    selectedAddresses?: Array<{ receiverName?: string; postalCode?: string; street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string }>;
    logisticsInfo?: Array<{
      itemIndex?: number;
      selectedSla?: string;
      selectedDeliveryChannel?: string;
      slas?: Array<{
        id?: string;
        name?: string;
        price?: number;
        shippingEstimate?: string;
        deliveryChannel?: string;
      }>;
    }>;
  };
  paymentData?: {
    paymentSystems?: Array<{ id?: string; name?: string; groupName?: string }>;
  };
};

const ORDER_FORM_ID_KEY = 'lojabl:orderFormId';

async function userTokenHeaders(): Promise<Record<string, string>> {
  const token = await getVtexUserToken();
  return token ? { VtexIdclientAutCookie: token } : {};
}

async function checkoutFetch(url: string, init: RequestInit = {}) {
  const baseHeaders = { 'Cache-Control': 'no-cache', Pragma: 'no-cache', ...(init.headers || {}) };
  // O Checkout da VTEX aceita o orderForm público mesmo quando o cliente está
  // logado. Essa primeira tentativa mantém o fluxo de convidado funcionando;
  // só enviamos o token se a VTEX exigir autenticação.
  const response = await fetch(url, { ...init, cache: 'no-store', headers: baseHeaders });
  if (![401, 403].includes(response.status)) return response;
  const authHeaders = await userTokenHeaders();
  if (Object.keys(authHeaders).length === 0) return response;
  return fetch(url, { ...init, cache: 'no-store', headers: { ...authHeaders, ...baseHeaders } });
}

function normalizeOrderForm(orderForm: VtexOrderForm): OrderForm {
  return {
    orderFormId: orderForm.orderFormId,
    value: (orderForm.value ?? 0) / 100,
    items: (orderForm.items ?? []).map((item, index) => ({
      index,
      id: item.id ?? '',
      seller: item.seller ?? '1',
      productId: item.productId ?? '',
      name: item.name ?? '',
      quantity: item.quantity ?? 0,
      imageUrl: item.imageUrl ?? '',
      price: (item.price ?? 0) / 100,
    })).filter((item) => item.quantity > 0),
    clientProfileData: orderForm.clientProfileData,
    shippingData: {
      selectedAddresses: (orderForm.shippingData?.selectedAddresses ?? []).map((address) => ({ ...address })),
      logisticsInfo: (orderForm.shippingData?.logisticsInfo ?? []).map((info) => ({
        itemIndex: info.itemIndex ?? 0,
        selectedSla: info.selectedSla,
        selectedDeliveryChannel: info.selectedDeliveryChannel,
        slas: (info.slas ?? []).map((sla) => ({
          id: sla.id ?? '',
          name: sla.name ?? '',
          price: (sla.price ?? 0) / 100,
          shippingEstimate: sla.shippingEstimate ?? '',
          deliveryChannel: sla.deliveryChannel,
        })),
      })),
    },
    paymentData: {
      paymentSystems: (orderForm.paymentData?.paymentSystems ?? []).map((system) => ({
        id: system.id ?? '',
        name: system.name ?? '',
        group: system.groupName ?? '',
      })),
    },
  };
}

export async function updateClientProfile({
  orderFormId,
  email,
  firstName,
  lastName,
  document,
  phone,
  gender,
  birthDate,
}: {
  orderFormId: string;
  email: string;
  firstName: string;
  lastName: string;
  document?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
}): Promise<OrderForm> {
  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/attachments/clientProfileData`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // A attachment clientProfileData recebe os campos diretamente. O
      // objeto aninhado funciona em algumas respostas, mas é rejeitado pelo
      // Checkout quando o cliente ainda não existe.
      body: JSON.stringify({
        email,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(document ? { document, documentType: 'cpf' } : {}),
        ...(phone ? { phone } : {}),
        ...(gender ? { gender } : {}),
        ...(birthDate ? { birthDate } : {}),
      }),
    },
  );

  if (!response.ok) throw new Error(`Unable to update client profile: ${response.status}`);
  const orderForm = (await response.json()) as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  const normalizedOrderForm = normalizeOrderForm(orderForm);
  publishCartChange(normalizedOrderForm);
  return normalizedOrderForm;
}

export async function updateShippingAddress({
  orderFormId,
  address,
}: {
  orderFormId: string;
  address: {
    receiverName: string;
    postalCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    country?: string;
  };
}): Promise<OrderForm> {
  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/attachments/shippingData`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: { ...address, country: address.country ?? 'BRA' },
        selectedAddresses: [{ ...address, country: address.country ?? 'BRA' }],
      }),
    },
  );

  if (!response.ok) throw new Error(`Unable to update shipping address: ${response.status}`);
  const orderForm = (await response.json()) as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  const normalizedOrderForm = normalizeOrderForm(orderForm);
  publishCartChange(normalizedOrderForm);
  return normalizedOrderForm;
}

export async function selectShippingOption({
  orderFormId,
  address,
  logisticsInfo,
  slaId,
}: {
  orderFormId: string;
  address: Parameters<typeof updateShippingAddress>[0]['address'];
  logisticsInfo: NonNullable<OrderForm['shippingData']>['logisticsInfo'];
  slaId: string;
}): Promise<OrderForm> {
  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/attachments/shippingData`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: { ...address, country: address.country ?? 'BRA' },
        selectedAddresses: [{ ...address, country: address.country ?? 'BRA' }],
        logisticsInfo: logisticsInfo.map((info) => {
          const selected = info.slas.find((sla) => sla.id === slaId || sla.name === slaId) ?? info.slas[0];
          return {
            itemIndex: info.itemIndex,
            selectedSla: selected?.id ?? slaId,
            deliveryChannel: selected?.deliveryChannel ?? 'delivery',
          };
        }),
      }),
    },
  );

  if (!response.ok) throw new Error(`Unable to select shipping option: ${response.status}`);
  const orderForm = (await response.json()) as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  const normalizedOrderForm = normalizeOrderForm(orderForm);
  publishCartChange(normalizedOrderForm);
  return normalizedOrderForm;
}

export async function selectPaymentMethod({
  orderFormId,
  paymentSystem,
  value,
}: {
  orderFormId: string;
  paymentSystem: string;
  value: number;
}): Promise<OrderForm> {
  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/attachments/paymentData`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payments: [{ paymentSystem, referenceValue: Math.round(value * 100), value: Math.round(value * 100), installments: 1 }],
      }),
    },
  );

  if (!response.ok) throw new Error(`Unable to select payment method: ${response.status}`);
  const orderForm = (await response.json()) as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  return normalizeOrderForm(orderForm);
}

async function loadOrderForm(orderFormId?: string): Promise<OrderForm> {
  const persistedOrderFormId = orderFormId ?? (await getStoredJson<string>(ORDER_FORM_ID_KEY));
  const path = persistedOrderFormId
    ? `/api/checkout/pub/orderform/${persistedOrderFormId}`
    : `/api/checkout/pub/orderform?sc=${encodeURIComponent(storeConfig.salesChannel)}`;
  const response = await checkoutFetch(`${storeConfig.vtexBaseUrl}${path}`);
  if (!response.ok && persistedOrderFormId) {
    await removeStoredValue(ORDER_FORM_ID_KEY);
    return loadOrderForm();
  }
  if (!response.ok) throw new Error(`Unable to get order form: ${response.status}`);
  const orderForm = await response.json() as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  return normalizeOrderForm(orderForm);
}

const orderFormReadsInFlight = new Map<string, Promise<OrderForm>>();

export function getOrderForm(orderFormId?: string): Promise<OrderForm> {
  const key = orderFormId ?? 'stored';
  const existing = orderFormReadsInFlight.get(key);
  if (existing) return existing;
  const request = loadOrderForm(orderFormId);
  orderFormReadsInFlight.set(key, request);
  return request.finally(() => {
    if (orderFormReadsInFlight.get(key) === request) orderFormReadsInFlight.delete(key);
  });
}

export async function addItemToCart({
  orderFormId,
  itemId,
  sellerId = '1',
  quantity = 1,
}: {
  orderFormId: string;
  itemId: string;
  sellerId?: string;
  quantity?: number;
}): Promise<OrderForm> {
  try {
    const currentOrderForm = await getOrderForm(orderFormId);
    const existingItem = currentOrderForm.items.find((item) => item.id === itemId && item.seller === sellerId);
    if (existingItem) {
      return updateCartItem({
        orderFormId: currentOrderForm.orderFormId,
        index: existingItem.index,
        itemId: existingItem.id,
        sellerId: existingItem.seller,
        quantity: existingItem.quantity + quantity,
      });
    }
  } catch {
    // Se a leitura falhar, mantém a tentativa normal de inclusão abaixo.
  }

  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/items`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderItems: [{ id: itemId, quantity, seller: sellerId }] }),
    },
  );

  if (!response.ok && [401, 403, 404].includes(response.status)) {
    await removeStoredValue(ORDER_FORM_ID_KEY);
    const freshOrderForm = await getOrderForm();
    if (freshOrderForm.orderFormId !== orderFormId) {
      return addItemToCart({ orderFormId: freshOrderForm.orderFormId, itemId, sellerId, quantity });
    }
  }
  if (!response.ok) throw new Error(`Unable to add item: ${response.status}`);
  const orderForm = (await response.json()) as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  const normalizedOrderForm = normalizeOrderForm(orderForm);
  publishCartChange(normalizedOrderForm);
  return normalizedOrderForm;
}

export async function updateCartItem({
  orderFormId,
  index,
  itemId,
  sellerId = '1',
  quantity,
  retry = true,
}: {
  orderFormId: string;
  index: number;
  itemId?: string;
  sellerId?: string;
  quantity: number;
  retry?: boolean;
}): Promise<OrderForm> {
  const normalizedQuantity = Math.max(0, quantity);
  const orderItems = [{ index, quantity: normalizedQuantity, seller: sellerId }];
  let response = await fetch(`${storeConfig.backendUrl}/checkout/order-form/${encodeURIComponent(orderFormId)}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // O orderFormId identifica o carrinho. O token do VTEX ID pertence à
    // conta do cliente e não deve ser misturado a esta operação pública do
    // Checkout, pois algumas lojas respondem 401 nessa combinação.
    body: JSON.stringify({ orderItems }),
  }).catch(() => null);

  // Mantém compatibilidade quando o backend local ainda não foi iniciado.
  if (!response || response.status === 404) {
    response = await checkoutFetch(
      `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/items/update?allowedOutdatedData=paymentData`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItems: normalizedQuantity === 0 ? [{ index, quantity: 0 }] : orderItems, noSplitItem: true }),
      },
    );
  }

  const errorBody = !response.ok ? await response.clone().json().catch(() => null) as { error?: { code?: string; message?: string }; message?: string } | null : null;
  const invalidOrderForm = errorBody?.error?.code === 'ORD002';
  if (!response.ok) console.warn('[CART] update item', { status: response.status, index, quantity, code: errorBody?.error?.code, message: errorBody?.error?.message || errorBody?.message });
  if (!response.ok && retry && ([401, 403, 404].includes(response.status) || invalidOrderForm)) {
    await removeStoredValue(ORDER_FORM_ID_KEY);
    const freshOrderForm = await getOrderForm();
    const freshItem = itemId ? freshOrderForm.items.find((item) => item.id === itemId) : undefined;
    return updateCartItem({
      orderFormId: freshOrderForm.orderFormId,
      index: freshItem?.index ?? index,
      itemId,
      sellerId: freshItem?.seller ?? sellerId,
      quantity,
      retry: false,
    });
  }
  if (!response.ok) throw new Error(errorBody?.error?.message || errorBody?.message || `Unable to update item: ${response.status}`);
  const orderForm = (await response.json()) as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  const normalizedOrderForm = normalizeOrderForm(orderForm);
  publishCartChange(normalizedOrderForm);
  return normalizedOrderForm;
}

export async function addCouponToCart(orderFormId: string, coupon: string): Promise<OrderForm> {
  const response = await checkoutFetch(`${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/coupons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: coupon }) });
  if (!response.ok) throw new Error('Não foi possível aplicar o cupom.');
  const orderForm = await response.json() as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  return normalizeOrderForm(orderForm);
}

export async function addGiftCardToCart(orderFormId: string, redemptionCode: string): Promise<OrderForm> {
  const response = await checkoutFetch(`${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/giftcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ giftCards: [{ redemptionCode, inUse: true }] }),
  });
  if (!response.ok) throw new Error('Não foi possível adicionar o vale-presente.');
  const orderForm = await response.json() as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  return normalizeOrderForm(orderForm);
}

export async function simulateProductShipping({
  itemId,
  sellerId = '1',
  quantity = 1,
  postalCode,
}: {
  itemId: string;
  sellerId?: string;
  quantity?: number;
  postalCode: string;
}): Promise<ShippingQuote[]> {
  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForms/simulation?sc=${encodeURIComponent(storeConfig.salesChannel)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: itemId, quantity, seller: sellerId }],
        country: 'BRA',
        postalCode: postalCode.replace(/\D/g, ''),
      }),
    },
  );
  if (!response.ok) throw new Error(`Não foi possível calcular o frete (HTTP ${response.status}).`);
  const payload = await response.json() as {
    logisticsInfo?: Array<{ slas?: Array<{ id?: string; name?: string; price?: number; shippingEstimate?: string }> }>;
  };
  return Array.from(new Map((payload.logisticsInfo ?? [])
    .flatMap((info) => info.slas ?? [])
    .map((sla) => ({
      id: sla.id ?? sla.name ?? '',
      name: sla.name ?? sla.id ?? 'Entrega',
      price: (sla.price ?? 0) / 100,
      shippingEstimate: sla.shippingEstimate ?? '',
    }))
    .filter((sla) => sla.id)
    .map((sla) => [sla.id, sla])).values());
}

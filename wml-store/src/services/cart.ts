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

export type ShippingAddress = {
  addressType?: string;
  addressId?: string;
  receiverName?: string;
  postalCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type PickupStoreInfo = {
  isPickupStore?: boolean;
  friendlyName?: string;
  additionalInfo?: string;
  address?: ShippingAddress;
};

export type InstallmentChoice = {
  count: number;
  hasInterestRate: boolean;
  interestRate: number;
  value: number;
  total: number;
};

export type InstallmentOption = {
  paymentSystem: string;
  value: number;
  installments: InstallmentChoice[];
};

export type PaymentDataPayment = {
  paymentSystem: string;
  referenceValue: number;
  value: number;
  installments: number;
  installmentsInterestRate: number;
};

export type GiftCard = {
  redemptionCode: string;
  value: number;
  balance: number;
  name?: string | null;
  caption?: string | null;
  id?: string | null;
  provider?: string | null;
  groupName?: string | null;
  inUse: boolean;
  isSpecialCard?: boolean;
};

export type OrderForm = {
  orderFormId: string;
  value: number;
  items: CartItem[];
  recaptchaKey?: string;
  recaptchaKeyV3?: string;
  marketingData?: {
    coupon?: string;
  };
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
    selectedAddresses?: ShippingAddress[];
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
        isPickupInPoint?: boolean;
        pickupPointId?: string;
        pickupStoreInfo?: PickupStoreInfo;
      }>;
    }>;
  };
  paymentData?: {
    paymentSystems: Array<{
      id: string;
      stringId: string;
      name: string;
      group: string;
      validator?: { regex?: string };
    }>;
    installmentOptions?: InstallmentOption[];
    payments?: PaymentDataPayment[];
    giftCards?: GiftCard[];
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
  deliveryChannel?: string;
  isPickupInPoint?: boolean;
};

function isPickupShippingName(name: string) {
  return /retirada|pickup/i.test(name);
}

function isTechnicalShippingId(value: string) {
  return /^\d{6,}$/.test(value)
    || /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
    || (/^[a-z0-9]{8,}$/i.test(value) && /\d/.test(value));
}

function normalizeShippingQuoteName(name: string, isPickup: boolean) {
  if (isPickup) return 'Retirada em loja';
  const normalizedName = name
    .replace(/\s*\((?:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|\d{6,}|[a-z0-9]{8,})\)\s*$/gi, '')
    .replace(/\s*[-–—]\s*[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\s*$/gi, '')
    .trim() || 'Entrega';
  return isTechnicalShippingId(normalizedName) ? 'Entrega' : normalizedName;
}

function shippingQuoteGroupKey(quote: ShippingQuote) {
  const label = quote.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  return `${quote.isPickupInPoint ? 'pickup' : quote.deliveryChannel || 'delivery'}|${label}`;
}

function estimateInMinutes(estimate: string) {
  const amount = Number(estimate.match(/\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
  if (estimate.includes('m')) return amount;
  if (estimate.includes('h')) return amount * 60;
  return amount * 24 * 60;
}

function isBetterShippingQuote(candidate: ShippingQuote, current: ShippingQuote) {
  if (candidate.price !== current.price) return candidate.price < current.price;
  return estimateInMinutes(candidate.shippingEstimate) < estimateInMinutes(current.shippingEstimate);
}

type VtexOrderForm = {
  orderFormId: string;
  message?: string;
  error?: { code?: string; message?: string };
  messages?: Array<{ text?: string | null; message?: string | null }>;
  giftCardMessages?: Array<{ text?: string | null; message?: string | null }>;
  value?: number;
  recaptchaKey?: string;
  recaptchaKeyV3?: string;
  marketingData?: {
    coupon?: string | null;
  };
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
    selectedAddresses?: VtexShippingAddress[];
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
        isPickupInPoint?: boolean;
        pickupPointId?: string;
        pickupStoreInfo?: VtexPickupStoreInfo;
      }>;
    }>;
  };
  paymentData?: {
    paymentSystems?: Array<{
      id?: string | number;
      stringId?: string | null;
      name?: string;
      groupName?: string;
      validator?: { regex?: string | null } | null;
    }>;
    installmentOptions?: VtexInstallmentOption[];
    payments?: Array<{
      paymentSystem?: string | number | null;
      referenceValue?: number | null;
      value?: number | null;
      installments?: number | null;
      installmentsInterestRate?: number | null;
    }>;
    giftCards?: Array<{
      redemptionCode?: string | null;
      value?: number | null;
      balance?: number | null;
      name?: string | null;
      caption?: string | null;
      id?: string | null;
      provider?: string | null;
      groupName?: string | null;
      inUse?: boolean | null;
      isSpecialCard?: boolean | null;
    }>;
    giftCardMessages?: Array<{ text?: string | null; message?: string | null }>;
  };
};

type VtexInstallment = {
  count?: number;
  hasInterestRate?: boolean;
  interestRate?: number;
  value?: number;
  total?: number;
};

type VtexInstallmentOption = {
  paymentSystem?: string | number | null;
  value?: number;
  installments?: VtexInstallment[];
};

type VtexShippingAddress = Omit<ShippingAddress, 'number'> & {
  number?: string | number | null;
};

type VtexPickupStoreInfo = {
  isPickupStore?: boolean;
  friendlyName?: string;
  additionalInfo?: string;
  address?: VtexShippingAddress;
};

const ORDER_FORM_ID_KEY = 'lojahr:orderFormId';

function normalizeShippingAddress(address?: VtexShippingAddress): ShippingAddress | undefined {
  if (!address) return undefined;
  return {
    ...address,
    number: address.number === undefined || address.number === null ? undefined : String(address.number),
  };
}

function normalizePickupStoreInfo(info?: VtexPickupStoreInfo): PickupStoreInfo | undefined {
  if (!info) return undefined;
  return {
    isPickupStore: info.isPickupStore,
    friendlyName: info.friendlyName,
    additionalInfo: info.additionalInfo,
    address: normalizeShippingAddress(info.address),
  };
}

function normalizeInstallmentOption(option?: VtexInstallmentOption | null): InstallmentOption {
  return {
    paymentSystem: String(option?.paymentSystem ?? '').trim(),
    value: (option?.value ?? 0) / 100,
    installments: (option?.installments ?? []).map((installment) => ({
      count: Number(installment.count ?? 1),
      hasInterestRate: Boolean(installment.hasInterestRate),
      interestRate: Number(installment.interestRate ?? 0),
      value: (installment.value ?? 0) / 100,
      total: (installment.total ?? installment.value ?? 0) / 100,
    })).filter((installment) => installment.count > 0 && installment.value > 0),
  };
}

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
    recaptchaKey: orderForm.recaptchaKey,
    recaptchaKeyV3: orderForm.recaptchaKeyV3,
    marketingData: orderForm.marketingData
      ? { coupon: orderForm.marketingData.coupon ?? undefined }
      : undefined,
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
      selectedAddresses: (orderForm.shippingData?.selectedAddresses ?? []).map((address) => normalizeShippingAddress(address) ?? {}),
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
          isPickupInPoint: sla.isPickupInPoint ?? sla.deliveryChannel === 'pickup-in-point',
          pickupPointId: sla.pickupPointId,
          pickupStoreInfo: normalizePickupStoreInfo(sla.pickupStoreInfo),
        })),
      })),
    },
    paymentData: {
      paymentSystems: (orderForm.paymentData?.paymentSystems ?? []).map((system) => ({
        id: String(system.stringId ?? system.id ?? '').trim(),
        stringId: String(system.stringId ?? '').trim(),
        name: system.name ?? '',
        group: system.groupName ?? '',
        validator: { regex: String(system.validator?.regex ?? '').trim() },
      })),
      installmentOptions: (orderForm.paymentData?.installmentOptions ?? []).map(normalizeInstallmentOption),
      payments: (orderForm.paymentData?.payments ?? []).map((payment) => ({
        paymentSystem: String(payment.paymentSystem ?? '').trim(),
        referenceValue: Number(payment.referenceValue ?? 0),
        value: Number(payment.value ?? 0),
        installments: Math.max(1, Number(payment.installments ?? 1)),
        installmentsInterestRate: Number(payment.installmentsInterestRate ?? 0),
      })).filter((payment) => payment.paymentSystem),
      giftCards: (orderForm.paymentData?.giftCards ?? []).map((giftCard) => ({
        redemptionCode: String(giftCard.redemptionCode ?? '').trim(),
        value: (giftCard.value ?? 0) / 100,
        balance: (giftCard.balance ?? 0) / 100,
        name: giftCard.name ?? null,
        caption: giftCard.caption ?? null,
        id: giftCard.id ?? null,
        provider: giftCard.provider ?? null,
        groupName: giftCard.groupName ?? null,
        inUse: giftCard.inUse === true,
        isSpecialCard: giftCard.isSpecialCard === true,
      })).filter((giftCard) => giftCard.redemptionCode || giftCard.id),
    },
  };
}

function giftCardResponseMessage(payload?: VtexOrderForm | null): string | undefined {
  const messages = [
    ...(payload?.paymentData?.giftCardMessages ?? []),
    ...(payload?.giftCardMessages ?? []),
    ...(payload?.messages ?? []),
  ];
  return messages
    .map((item) => (item.text ?? item.message ?? '').trim())
    .find(Boolean)
    ?? payload?.error?.message?.trim()
    ?? payload?.message?.trim();
}

function normalizeGiftCardCode(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
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
  // A attachment clientProfileData recebe os campos diretamente. O objeto
  // aninhado funciona em algumas respostas, mas é rejeitado quando o cliente
  // ainda não existe.
  const body = JSON.stringify({
    email,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(document ? { document, documentType: 'cpf' } : {}),
    ...(phone ? { phone } : {}),
    ...(gender ? { gender } : {}),
    ...(birthDate ? { birthDate } : {}),
  });
  const requestInit: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  };

  // O backend evita que diferenças de cookies/SecureStore entre Expo Go e o
  // development build bloqueiem esta etapa. A chamada pública direta continua
  // como fallback para desenvolvimento sem o backend.
  let response = await fetch(
    `${storeConfig.backendUrl}/checkout/order-form/${encodeURIComponent(orderFormId)}/client-profile`,
    requestInit,
  ).catch(() => null);
  if (!response?.ok) {
    response = await checkoutFetch(
      `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(orderFormId)}/attachments/clientProfileData`,
      requestInit,
    );
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(error.message || `Não foi possível atualizar os dados pessoais (HTTP ${response.status}).`);
  }
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
        clearAddressIfPostalCodeNotFound: false,
        address: { ...address, addressType: 'residential', country: address.country ?? 'BRA' },
        selectedAddresses: [{ ...address, addressType: 'residential', country: address.country ?? 'BRA' }],
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
        clearAddressIfPostalCodeNotFound: false,
        address: { ...address, addressType: 'residential', country: address.country ?? 'BRA' },
        selectedAddresses: [{ ...address, addressType: 'residential', country: address.country ?? 'BRA' }],
        logisticsInfo: logisticsInfo.map((info) => {
          const selected = info.slas.find((sla) => sla.id === slaId || sla.name === slaId) ?? info.slas[0];
          return {
            itemIndex: info.itemIndex,
            selectedSla: selected?.id ?? slaId,
            deliveryChannel: selected?.deliveryChannel ?? (selected?.isPickupInPoint ? 'pickup-in-point' : 'delivery'),
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
  installments = 1,
  installmentsInterestRate = 0,
  giftCards,
}: {
  orderFormId: string;
  paymentSystem: string;
  value: number;
  installments?: number;
  installmentsInterestRate?: number;
  giftCards?: GiftCard[];
}): Promise<OrderForm> {
  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${orderFormId}/attachments/paymentData`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payments: [{
          paymentSystem,
          referenceValue: Math.round(value * 100),
          value: Math.round(value * 100),
          installments: Math.max(1, Math.round(installments)),
          installmentsInterestRate: Number(installmentsInterestRate || 0),
        }],
        ...(giftCards
          ? {
              giftCards: giftCards
                .filter((giftCard) => giftCard.inUse && (giftCard.redemptionCode || giftCard.id))
                .map((giftCard) => giftCardAttachment(giftCard, true)),
            }
          : {}),
      }),
    },
  );

  if (!response.ok) throw new Error(`Unable to select payment method: ${response.status}`);
  const orderForm = (await response.json()) as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  return normalizeOrderForm(orderForm);
}

export async function getPaymentInstallments({ orderFormId, paymentSystem }: { orderFormId: string; paymentSystem: string }): Promise<InstallmentChoice[]> {
  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(orderFormId)}/installments?paymentSystem=${encodeURIComponent(paymentSystem)}`,
  );
  if (!response.ok) throw new Error(`Unable to load payment installments: ${response.status}`);
  const payload = await response.json() as VtexInstallmentOption | VtexInstallmentOption[];
  const options = Array.isArray(payload) ? payload : [payload];
  const normalizedOptions = options.map(normalizeInstallmentOption);
  return normalizedOptions.find((option) => option.paymentSystem === String(paymentSystem))?.installments
    ?? normalizedOptions[0]?.installments
    ?? [];
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

export async function clearCart(orderFormId?: string): Promise<OrderForm | null> {
  const id = orderFormId ?? await getStoredJson<string>(ORDER_FORM_ID_KEY);
  if (!id) return null;
  const response = await checkoutFetch(
    `${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(id)}/items/removeAll`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  );
  if (!response.ok) throw new Error(`Unable to clear cart: ${response.status}`);
  const orderForm = await response.json() as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  const normalizedOrderForm = normalizeOrderForm(orderForm);
  publishCartChange(normalizedOrderForm);
  return normalizedOrderForm;
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

export async function removeCouponFromCart(orderFormId: string): Promise<OrderForm> {
  return addCouponToCart(orderFormId, '');
}

type GiftCardAttachment = {
  redemptionCode?: string;
  id?: string;
  provider?: string;
  isSpecialCard: boolean;
  inUse: boolean;
};

function giftCardAttachment(
  giftCard: Pick<GiftCard, 'redemptionCode' | 'id' | 'provider' | 'isSpecialCard'>,
  inUse: boolean,
  providerOverride?: string | null,
): GiftCardAttachment {
  const provider = giftCard.provider || providerOverride || undefined;
  return {
    ...(giftCard.redemptionCode ? { redemptionCode: giftCard.redemptionCode } : {}),
    ...(giftCard.id ? { id: giftCard.id } : {}),
    ...(provider ? { provider } : {}),
    isSpecialCard: giftCard.isSpecialCard === true,
    inUse,
  };
}

export async function addGiftCardToCart(
  orderFormId: string,
  redemptionCode: string,
  existingGiftCards: Array<Pick<GiftCard, 'redemptionCode' | 'id' | 'provider' | 'isSpecialCard'>> = [],
  provider?: string | null,
  payments: PaymentDataPayment[] = [],
): Promise<OrderForm> {
  const giftCards = [
    ...existingGiftCards
      .filter((giftCard) => giftCard.redemptionCode || giftCard.id)
      .map((giftCard) => giftCardAttachment(giftCard, true)),
    giftCardAttachment({ redemptionCode: redemptionCode.trim() }, true, provider),
  ];
  const response = await checkoutFetch(`${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(orderFormId)}/attachments/paymentData`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payments, giftCards }),
  });
  const errorBody = !response.ok
    ? await response.clone().json().catch(() => null) as VtexOrderForm | null
    : null;
  if (!response.ok) {
    const message = giftCardResponseMessage(errorBody);
    console.warn('[GIFT CARD] add rejected', { status: response.status, code: errorBody?.error?.code, message });
    throw new Error(message || 'Não foi possível adicionar o vale-presente.');
  }
  const orderForm = await response.json() as VtexOrderForm;
  await setStoredJson(ORDER_FORM_ID_KEY, orderForm.orderFormId);
  const normalizedOrderForm = normalizeOrderForm(orderForm);
  const normalizedCode = normalizeGiftCardCode(redemptionCode);
  const applied = normalizedOrderForm.paymentData?.giftCards?.some((giftCard) => giftCard.inUse && normalizeGiftCardCode(giftCard.redemptionCode) === normalizedCode);
  if (!applied) {
    const message = giftCardResponseMessage(orderForm);
    const returnedGiftCards = normalizedOrderForm.paymentData?.giftCards ?? [];
    const providers = [...new Set(returnedGiftCards.map((giftCard) => giftCard.provider).filter(Boolean))];
    const paymentGroups = [...new Set((normalizedOrderForm.paymentData?.paymentSystems ?? []).map((system) => system.group).filter(Boolean))];
    console.warn('[GIFT CARD] add not reflected in orderForm', {
      message,
      inUseCount: returnedGiftCards.filter((giftCard) => giftCard.inUse).length,
      providers,
      paymentGroups,
    });
    throw new Error(message || 'Não foi possível adicionar o vale-presente.');
  }
  return normalizedOrderForm;
}

export async function removeGiftCardFromCart(
  orderFormId: string,
  redemptionCode: string,
  remainingGiftCards: Array<Pick<GiftCard, 'redemptionCode' | 'id' | 'provider' | 'isSpecialCard'>> = [],
  payments: PaymentDataPayment[] = [],
): Promise<OrderForm> {
  const giftCards = [
    ...remainingGiftCards
      .filter((giftCard) => giftCard.redemptionCode || giftCard.id)
      .map((giftCard) => giftCardAttachment(giftCard, true)),
    giftCardAttachment({ redemptionCode: redemptionCode.trim() }, false),
  ];
  const response = await checkoutFetch(`${storeConfig.vtexBaseUrl}/api/checkout/pub/orderForm/${encodeURIComponent(orderFormId)}/attachments/paymentData`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payments, giftCards }),
  });
  if (!response.ok) throw new Error('Não foi possível remover o vale-presente.');
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
    logisticsInfo?: Array<{ slas?: Array<{ id?: string; name?: string; price?: number; shippingEstimate?: string; deliveryChannel?: string; isPickupInPoint?: boolean }> }>;
  };
  const quotes = (payload.logisticsInfo ?? [])
    .flatMap((info) => info.slas ?? [])
    .map((sla) => {
      const rawName = sla.name ?? '';
      const isPickup = sla.isPickupInPoint === true || sla.deliveryChannel === 'pickup-in-point' || isPickupShippingName(rawName);
      return {
        id: sla.id ?? rawName,
        name: normalizeShippingQuoteName(rawName, isPickup),
        price: (sla.price ?? 0) / 100,
        shippingEstimate: sla.shippingEstimate ?? '',
        deliveryChannel: isPickup ? 'pickup-in-point' : sla.deliveryChannel || 'delivery',
        isPickupInPoint: isPickup,
      } satisfies ShippingQuote;
    })
    .filter((quote) => quote.id);

  const uniqueQuotes = new Map<string, ShippingQuote>();
  for (const quote of quotes) {
    const key = shippingQuoteGroupKey(quote);
    const current = uniqueQuotes.get(key);
    if (!current || isBetterShippingQuote(quote, current)) uniqueQuotes.set(key, quote);
  }
  return [...uniqueQuotes.values()];
}

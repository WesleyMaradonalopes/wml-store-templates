import { Platform } from 'react-native';
import { paymentBrandFromLabel, type PaymentBrand } from '@/components/payment-brand';
import { BEST_SELLING_PRODUCTS_SHELF, RECENT_PRODUCTS_SHELF } from '@/constants/product-shelves';
import { OrderForm, type CartItem, type CartOffering, type GiftCard } from '@/services/cart';
import { type CustomerAddress, type CustomerProfile } from '@/services/customer';
import { type PaymentAppData } from '@/services/orders';
import { formatPhoneInput } from '@/utils/customer-formatters';

export type Step = 'cart' | 'email' | 'customer' | 'address' | 'shipping' | 'payment' | 'card' | 'installments' | 'review';
export type CustomerCheckoutData = { profile: CustomerProfile | null; addresses: CustomerAddress[] };
export type ShippingOption = NonNullable<OrderForm['shippingData']>['logisticsInfo'][number]['slas'][number];
export type PaymentMethod = NonNullable<OrderForm['paymentData']>['paymentSystems'][number];
export type GiftCardAvailability = 'unknown' | 'loading' | 'available' | 'none';

export function mergeCustomerProfiles(primary: CustomerProfile | null, fallback: NonNullable<OrderForm['clientProfileData']> | null): CustomerProfile | null {
  if (!primary && !fallback) return null;
  return {
    email: primary?.email || fallback?.email || '',
    firstName: primary?.firstName || fallback?.firstName || '',
    lastName: primary?.lastName || fallback?.lastName || '',
    document: primary?.document || fallback?.document || '',
    phone: primary?.phone || primary?.homePhone || fallback?.phone || '',
    homePhone: primary?.homePhone || primary?.phone || fallback?.phone || '',
    birthDate: primary?.birthDate || fallback?.birthDate || '',
    gender: primary?.gender || fallback?.gender || '',
    ...(primary?.isNewsletterOptIn !== undefined ? { isNewsletterOptIn: primary.isNewsletterOptIn } : {}),
  };
}

export function isGiftCardOwnershipError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /um usuário por carrinho|um usuario por carrinho|remover e adicioná-lo novamente|remover e adiciona-lo novamente/i.test(message);
}

export function isGiftCardCartContextError(error: unknown) {
  return isGiftCardOwnershipError(error);
}

const DEFAULT_WEB_RECAPTCHA_SITE_KEY = '6LfYDiAqAAAAAPmcjgLXQkKD_sP131cQECisZO27';
const WEB_RECAPTCHA_SITE_KEY = String(
  process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_SITE_KEY || DEFAULT_WEB_RECAPTCHA_SITE_KEY,
).trim();
export const CONFIGURED_RECAPTCHA_SITE_KEY = Platform.OS === 'android'
  ? String(process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_ANDROID_SITE_KEY || WEB_RECAPTCHA_SITE_KEY).trim()
  : Platform.OS === 'ios'
    ? String(process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_IOS_SITE_KEY || WEB_RECAPTCHA_SITE_KEY).trim()
    : WEB_RECAPTCHA_SITE_KEY;

export const CART_BEST_SELLING_PRODUCTS_SHELF: Record<string, unknown> = {
  ...BEST_SELLING_PRODUCTS_SHELF,
  title: 'Mais vendidos',
  showSeeAll: false,
};

export const EMPTY_CART_RECENT_PRODUCTS_SHELF: Record<string, unknown> = {
  ...RECENT_PRODUCTS_SHELF,
  title: 'Mais recentes',
  showSeeAll: false,
};

export function digits(value: string) { return value.replace(/\D/g, ''); }
export function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
export function getRecaptchaSiteKey(orderForm?: OrderForm | null) {
  // Mobile uses the platform key registered in VTEX. Web keeps the existing
  // VTEX key. The backend must receive the key that generated the token.
  return CONFIGURED_RECAPTCHA_SITE_KEY
    || String(orderForm?.recaptchaKeyV3 || orderForm?.recaptchaKey || '').trim();
}
export function validPhone(value: string) {
  return /^\+55\d{10,11}$/.test(value.trim());
}
export function validCpf(value: string) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}
export function money(value: number) { return 'R$ ' + value.toFixed(2).replace('.', ','); }
export function formatOrderDate(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(',', ' às');
}
export function formatPhone(value: string) {
  const normalized = formatPhoneInput(value);
  return normalized ? '+55' + normalized : '';
}
export function formatCpf(value: string) {
  const valueDigits = digits(value).slice(0, 11);
  if (valueDigits.length <= 3) return valueDigits;
  if (valueDigits.length <= 6) return valueDigits.slice(0, 3) + '.' + valueDigits.slice(3);
  if (valueDigits.length <= 9) return valueDigits.slice(0, 3) + '.' + valueDigits.slice(3, 6) + '.' + valueDigits.slice(6);
  return valueDigits.slice(0, 3) + '.' + valueDigits.slice(3, 6) + '.' + valueDigits.slice(6, 9) + '-' + valueDigits.slice(9);
}
export function formatPostalCode(value: string) {
  const valueDigits = digits(value).slice(0, 8);
  return valueDigits.length > 5 ? valueDigits.slice(0, 5) + '-' + valueDigits.slice(5) : valueDigits;
}
export function formatCardNumber(value: string) {
  const valueDigits = digits(value).slice(0, 19);
  return valueDigits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
export function formatExpiry(value: string) {
  const valueDigits = digits(value).slice(0, 4);
  return valueDigits.length > 2 ? valueDigits.slice(0, 2) + '/' + valueDigits.slice(2) : valueDigits;
}
export function isShippingStep(step: Step) { return step === 'shipping'; }
export function isPickupOption(sla?: ShippingOption | null) { return sla?.deliveryChannel === 'pickup-in-point' || sla?.isPickupInPoint === true; }
export function shippingOptionId(sla?: ShippingOption | null) { return sla?.id || sla?.name || ''; }
export function shippingOptionKey(sla?: ShippingOption | null) {
  if (!sla) return '';
  const pickupKey = isPickupOption(sla)
    ? sla.pickupPointId || sla.pickupStoreInfo?.address?.addressId || ''
    : '';
  return [shippingOptionId(sla) || sla.shippingEstimate, sla.deliveryChannel || 'delivery', pickupKey].join('|');
}
export function pickupStoreName(option: ShippingOption) {
  const friendlyName = option.pickupStoreInfo?.friendlyName?.trim();
  if (friendlyName) return friendlyName;

  const receiverName = option.pickupStoreInfo?.address?.receiverName?.trim();
  if (receiverName && !/^retirada(?:\s+em\s+loja)?$/i.test(receiverName)) return receiverName;

  const cleanName = (option.name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (cleanName && !/^retirada(?:\s+em\s+loja)?$/i.test(cleanName)) return cleanName;
  return 'Retirada em loja';
}
export function pickupAddressLines(option: ShippingOption) {
  const address = option.pickupStoreInfo?.address;
  if (!address) return [];
  return [
    [address.street, address.number].filter(Boolean).join(', '),
    [address.neighborhood, address.city, address.state].filter(Boolean).join(' - '),
    address.postalCode ? 'CEP: ' + address.postalCode : '',
  ].filter(Boolean);
}
export function isGiftCardPayment(method: PaymentMethod) {
  const text = `${method.name} ${method.group}`.toLowerCase();
  return text.includes('giftcard') || text.includes('gift card') || text.includes('vale-presente') || text.includes('vale presente') || text.includes('voucher');
}
export function isCardPayment(method: PaymentMethod) {
  if (isGiftCardPayment(method)) return false;
  const text = `${method.name} ${method.group}`.toLowerCase();
  const group = method.group.toLowerCase().replace(/[\s_-]/g, '');
  return group.includes('creditcard') || text.includes('cartão de crédito') || text.includes('cartao de credito') || text.includes('credit card');
}
export function isPixPayment(method: PaymentMethod) {
  return (method.name + ' ' + method.group).toLowerCase().includes('pix');
}

export function giftCardAppliedValue(giftCard: GiftCard) {
  return giftCard.value > 0 ? giftCard.value : giftCard.balance;
}

export function giftCardDisplayCode(giftCard: GiftCard) {
  return (giftCard.redemptionCode?.trim() || giftCard.caption?.trim() || giftCard.id?.trim() || 'Vale-presente').toUpperCase();
}

export function giftCardCreditLabel(giftCard: GiftCard) {
  const label = (giftCard.caption?.trim() || giftCard.name?.trim() || 'Vale-presente')
    .replace(/(?:\s*[-–—|/]\s*)?\bERP\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-–—|/]\s*$/, '')
    .trim();
  return label || 'Vale-presente';
}

export function giftCardsTotal(giftCards: GiftCard[]) {
  return giftCards.reduce((total, giftCard) => total + giftCardAppliedValue(giftCard), 0);
}

export function giftCardsCoverOrder(giftCards: GiftCard[], orderValue: number) {
  return Math.round(giftCardsTotal(giftCards) * 100) >= Math.round(orderValue * 100);
}

export function activeGiftCards(orderForm?: OrderForm | null) {
  return (orderForm?.paymentData?.giftCards ?? []).filter((giftCard) => giftCard.inUse && (giftCard.redemptionCode || giftCard.id));
}

export function paymentAmountAfterGiftCards(orderForm: OrderForm) {
  return Math.max(0, orderForm.value - giftCardsTotal(activeGiftCards(orderForm)));
}

type CardBrand = Exclude<PaymentBrand, 'pix' | 'generic'>;

function cardBrandFromNumber(value: string): CardBrand | '' {
  const cardNumber = digits(value);
  if (/^4/.test(cardNumber)) return 'visa';
  if (/^5[1-5]/.test(cardNumber)) return 'mastercard';
  if (/^\d{4}$/.test(cardNumber.slice(0, 4))) {
    const prefix = Number(cardNumber.slice(0, 4));
    if (prefix >= 2221 && prefix <= 2720) return 'mastercard';
  }
  if (/^3[47]/.test(cardNumber)) return 'amex';
  if (/^(30[0-5]|36|38)/.test(cardNumber)) return 'diners';
  if (/^(606282|637095|637568|637599)/.test(cardNumber)) return 'hipercard';
  return '';
}

function paymentMethodMatchesBrand(method: PaymentMethod, brand: CardBrand) {
  const label = `${method.name} ${method.group}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (brand === 'visa') return label.includes('visa');
  if (brand === 'mastercard') return label.includes('mastercard') || label.includes('master card') || label.includes('master');
  if (brand === 'amex') return label.includes('american express') || label.includes('amex');
  if (brand === 'elo') return label.includes('elo');
  if (brand === 'diners') return label.includes('diners');
  return label.includes('hipercard') || label.includes('hiper card');
}

export function cardBrandFor(method?: PaymentMethod | null, cardNumber = ''): PaymentBrand {
  const brandFromNumber = cardBrandFromNumber(cardNumber);
  if (brandFromNumber) return brandFromNumber;
  return method ? paymentBrandFromLabel(method.name) : 'generic';
}

function paymentMethodMatchesValidator(method: PaymentMethod, cardNumber: string) {
  const expression = method.validator?.regex?.trim();
  if (!expression) return false;
  try {
    return new RegExp(expression).test(digits(cardNumber));
  } catch {
    return false;
  }
}

export function cardPaymentMethodForNumber(methods: PaymentMethod[], cardNumber: string) {
  const candidates = methods.filter(isCardPayment);
  if (candidates.length === 0) return null;
  if (!digits(cardNumber)) return candidates[0];

  const validatorMatch = candidates.find((method) => paymentMethodMatchesValidator(method, cardNumber));
  if (validatorMatch) return validatorMatch;

  const brand = cardBrandFromNumber(cardNumber);
  if (brand) return candidates.find((method) => paymentMethodMatchesBrand(method, brand)) || null;
  return candidates.length === 1 ? candidates[0] : null;
}
export type ParsedPixPayment = {
  code: string;
  paymentId: string;
  transactionId: string;
  imageUri: string;
};
export function parsePaymentAppPayload(paymentApp?: PaymentAppData | null) {
  if (!paymentApp?.appPayload) return null;
  const raw = paymentApp.appPayload;
  let parsed: Record<string, unknown> = {};
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object') parsed = value as Record<string, unknown>;
  } catch {
    const read = (key: string) => raw.match(new RegExp(key + '\\s*[:=]\\s*([^,}]+)', 'i'))?.[1]?.trim() || '';
    parsed = {
      code: read('code'),
      qrCodeBase64Image: read('qrCodeBase64Image'),
      paymentId: read('paymentId'),
      transactionId: read('transactionId'),
    };
  }
  const code = String(parsed.code || parsed.qrCode || parsed.qrCodeText || '').trim();
  const image = String(parsed.qrCodeBase64Image || parsed.qrCodeBase64 || parsed.qrCodeImage || '').trim();
  const paymentId = String(parsed.paymentId || '').trim();
  const transactionId = String(parsed.transactionId || '').trim();
  return {
    code,
    paymentId,
    transactionId,
    imageUri: image ? (image.startsWith('data:') ? image : 'data:image/png;base64,' + image) : '',
  } satisfies ParsedPixPayment;
}
export function formatPixTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
export function humanShippingEstimate(estimate: string) {
  const normalized = estimate.trim().toLowerCase();
  const match = normalized.match(/\d+/);
  if (!match) return estimate.trim() || 'Prazo a confirmar';
  const count = Number(match[0]);
  if (normalized.includes('bd')) return `${count} ${count === 1 ? 'dia útil' : 'dias úteis'}`;
  if (normalized.includes('h')) return `${count} ${count === 1 ? 'hora' : 'horas'}`;
  if (normalized.includes('m')) return `${count} ${count === 1 ? 'minuto' : 'minutos'}`;
  return `${count} ${count === 1 ? 'dia' : 'dias'}`;
}
export function shippingPriceAndEstimate(option: Pick<ShippingOption, 'price' | 'shippingEstimate'>) {
  const price = option.price === 0 ? 'Grátis' : money(option.price);
  return `${price} - ${humanShippingEstimate(option.shippingEstimate)}`;
}
export function deliveryEstimate(estimate: string) {
  const label = humanShippingEstimate(estimate);
  return label === 'Prazo a confirmar' ? label : 'Receba em até ' + label;
}

export function giftWrappingOffering(item: CartItem): CartOffering | null {
  return item.offerings?.find((offering) => /embalag/i.test(offering.name)) ?? null;
}

export function hasGiftWrapping(item: CartItem) {
  const offering = giftWrappingOffering(item);
  return Boolean(offering && item.bundleItems?.some((bundleItem) => bundleItem.id === offering.id));
}

export function allGiftWrappingApplied(items: CartItem[]) {
  const giftWrappingItems = items.filter((item) => giftWrappingOffering(item));
  return giftWrappingItems.length > 0 && giftWrappingItems.every(hasGiftWrapping);
}

export function getShippingOptions(orderForm: OrderForm): ShippingOption[] {
  const options = new Map<string, ShippingOption>();
  for (const info of orderForm.shippingData?.logisticsInfo ?? []) {
    for (const sla of info.slas ?? []) {
      if (!sla) continue;
      const key = shippingOptionKey(sla);
      const existing = options.get(key);
      if (existing) {
        existing.price += sla.price;
        if (!existing.shippingEstimate && sla.shippingEstimate) existing.shippingEstimate = sla.shippingEstimate;
        if (!existing.pickupStoreInfo && sla.pickupStoreInfo) existing.pickupStoreInfo = sla.pickupStoreInfo;
      } else {
        options.set(key, { ...sla });
      }
    }
  }
  return [...options.values()];
}

export function getDefaultShippingOptionId(orderForm: OrderForm, options = getShippingOptions(orderForm)) {
  const current = orderForm.shippingData?.logisticsInfo.find((info) => info.selectedSla)?.selectedSla;
  if (current && options.some((option) => shippingOptionId(option) === current)) return current;
  const firstDelivery = options.find((option) => !isPickupOption(option));
  return shippingOptionId(firstDelivery ?? options[0]);
}

export function getShippingSelectionId(orderForm: OrderForm, options: ShippingOption[], selectedId?: string | null) {
  if (selectedId && options.some((option) => shippingOptionId(option) === selectedId)) return selectedId;
  return getDefaultShippingOptionId(orderForm, options);
}

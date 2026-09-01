import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddToCartFeedback } from '@/components/add-to-cart-feedback';
import { ProductShelf } from '@/components/cms-section';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import CreditCardIcon from '@/components/icons/CreditCardIcon';
import ShoppingBagIcon from '@/components/icons/ShoppingBagIcon';
import StoreIcon from '@/components/icons/StoreIcon';
import TrashIcon from '@/components/icons/TrashIcon';
import TruckIcon from '@/components/icons/TruckIcon';
import UserIcon from '@/components/icons/UserIcon';
import { NewsletterOptIn } from '@/components/newsletter-opt-in';
import { paymentBrandFromLabel, PaymentBrandIcon, type PaymentBrand } from '@/components/payment-brand';
import Recaptcha, { type RecaptchaHandle } from '@/components/recaptcha';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BEST_SELLING_PRODUCTS_SHELF, RECENT_PRODUCTS_SHELF } from '@/constants/product-shelves';
import { Fonts, Spacing } from '@/constants/theme';
import { useTabBar } from '@/context/tab-bar-context';
import { getAccountSession } from '@/services/auth';
import { addCouponToCart, addGiftCardToCart, addItemOffering, clearCart, createFreshOrderForm, getOrderForm, getPaymentInstallments, identifyExistingCustomerByEmail, OrderForm, removeCouponFromCart, removeGiftCardFromCart, removeItemOffering, selectPaymentMethod, selectShippingOption, subscribeToCartChanges, updateCartItem, updateClientProfile, updateShippingAddress, type CartItem, type CartOffering, type GiftCard, type InstallmentChoice } from '@/services/cart';
import { getCustomerAddressesFromMasterData, getCustomerProfileFromMasterData, updateCustomerProfile, type CustomerAddress, type CustomerProfile } from '@/services/customer';
import { CheckoutOrderError, getTransactionStatus, placeOrder, type CheckoutOrderResult, type PaymentAppData } from '@/services/orders';
import { birthDateToApi, formatBirthDate, formatBirthDateInput, formatGenderLabel, formatPhoneInput, formatPhoneWithoutCountryCode } from '@/utils/customer-formatters';

type Step = 'cart' | 'email' | 'customer' | 'address' | 'shipping' | 'payment' | 'card' | 'installments' | 'review';
type CustomerCheckoutData = { profile: CustomerProfile | null; addresses: CustomerAddress[] };
type ShippingOption = NonNullable<OrderForm['shippingData']>['logisticsInfo'][number]['slas'][number];
type PaymentMethod = NonNullable<OrderForm['paymentData']>['paymentSystems'][number];

function mergeCustomerProfiles(primary: CustomerProfile | null, fallback: NonNullable<OrderForm['clientProfileData']> | null): CustomerProfile | null {
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

function isGiftCardOwnershipError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return /um usuário por carrinho|um usuario por carrinho|remover e adicioná-lo novamente|remover e adiciona-lo novamente/i.test(message);
}

function isGiftCardCartContextError(error: unknown) {
  return isGiftCardOwnershipError(error);
}

const DEFAULT_WEB_RECAPTCHA_SITE_KEY = '6LfYDiAqAAAAAPmcjgLXQkKD_sP131cQECisZO27';
const WEB_RECAPTCHA_SITE_KEY = String(
  process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_SITE_KEY || DEFAULT_WEB_RECAPTCHA_SITE_KEY,
).trim();
const CONFIGURED_RECAPTCHA_SITE_KEY = Platform.OS === 'android'
  ? String(process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_ANDROID_SITE_KEY || WEB_RECAPTCHA_SITE_KEY).trim()
  : Platform.OS === 'ios'
    ? String(process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_IOS_SITE_KEY || WEB_RECAPTCHA_SITE_KEY).trim()
    : WEB_RECAPTCHA_SITE_KEY;

const CART_BEST_SELLING_PRODUCTS_SHELF: Record<string, unknown> = {
  ...BEST_SELLING_PRODUCTS_SHELF,
  title: 'Mais vendidos',
  showSeeAll: false,
};

const EMPTY_CART_RECENT_PRODUCTS_SHELF: Record<string, unknown> = {
  ...RECENT_PRODUCTS_SHELF,
  title: 'Mais recentes',
};

function digits(value: string) { return value.replace(/\D/g, ''); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function getRecaptchaSiteKey(orderForm?: OrderForm | null) {
  // Mobile uses the platform key registered in VTEX. Web keeps the existing
  // VTEX key. The backend must receive the key that generated the token.
  return CONFIGURED_RECAPTCHA_SITE_KEY
    || String(orderForm?.recaptchaKeyV3 || orderForm?.recaptchaKey || '').trim();
}
function validPhone(value: string) {
  return /^\+55\d{10,11}$/.test(value.trim());
}
function validCpf(value: string) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    const sum = cpf.slice(0, length).split('').reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}
function money(value: number) { return 'R$ ' + value.toFixed(2).replace('.', ','); }
function formatPhone(value: string) {
  const normalized = formatPhoneInput(value);
  return normalized ? '+55' + normalized : '';
}
function formatCpf(value: string) {
  const valueDigits = digits(value).slice(0, 11);
  if (valueDigits.length <= 3) return valueDigits;
  if (valueDigits.length <= 6) return valueDigits.slice(0, 3) + '.' + valueDigits.slice(3);
  if (valueDigits.length <= 9) return valueDigits.slice(0, 3) + '.' + valueDigits.slice(3, 6) + '.' + valueDigits.slice(6);
  return valueDigits.slice(0, 3) + '.' + valueDigits.slice(3, 6) + '.' + valueDigits.slice(6, 9) + '-' + valueDigits.slice(9);
}
function formatPostalCode(value: string) {
  const valueDigits = digits(value).slice(0, 8);
  return valueDigits.length > 5 ? valueDigits.slice(0, 5) + '-' + valueDigits.slice(5) : valueDigits;
}
function formatCardNumber(value: string) {
  const valueDigits = digits(value).slice(0, 19);
  return valueDigits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
function formatExpiry(value: string) {
  const valueDigits = digits(value).slice(0, 4);
  return valueDigits.length > 2 ? valueDigits.slice(0, 2) + '/' + valueDigits.slice(2) : valueDigits;
}
function isShippingStep(step: Step) { return step === 'shipping'; }
function isPickupOption(sla?: ShippingOption | null) { return sla?.deliveryChannel === 'pickup-in-point' || sla?.isPickupInPoint === true; }
function shippingOptionId(sla?: ShippingOption | null) { return sla?.id || sla?.name || ''; }
function shippingOptionKey(sla?: ShippingOption | null) {
  if (!sla) return '';
  const pickupKey = isPickupOption(sla)
    ? sla.pickupPointId || sla.pickupStoreInfo?.address?.addressId || ''
    : '';
  return [shippingOptionId(sla) || sla.shippingEstimate, sla.deliveryChannel || 'delivery', pickupKey].join('|');
}
function pickupStoreName(option: ShippingOption) {
  const friendlyName = option.pickupStoreInfo?.friendlyName?.trim();
  if (friendlyName) return friendlyName;

  const receiverName = option.pickupStoreInfo?.address?.receiverName?.trim();
  if (receiverName && !/^retirada(?:\s+em\s+loja)?$/i.test(receiverName)) return receiverName;

  const cleanName = (option.name || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (cleanName && !/^retirada(?:\s+em\s+loja)?$/i.test(cleanName)) return cleanName;
  return 'Retirada em loja';
}
function pickupAddressLines(option: ShippingOption) {
  const address = option.pickupStoreInfo?.address;
  if (!address) return [];
  return [
    [address.street, address.number].filter(Boolean).join(', '),
    [address.neighborhood, address.city, address.state].filter(Boolean).join(' - '),
    address.postalCode ? 'CEP: ' + address.postalCode : '',
  ].filter(Boolean);
}
function isGiftCardPayment(method: PaymentMethod) {
  const text = `${method.name} ${method.group}`.toLowerCase();
  return text.includes('giftcard') || text.includes('gift card') || text.includes('vale-presente') || text.includes('vale presente') || text.includes('voucher');
}
function isCardPayment(method: PaymentMethod) {
  if (isGiftCardPayment(method)) return false;
  const text = `${method.name} ${method.group}`.toLowerCase();
  const group = method.group.toLowerCase().replace(/[\s_-]/g, '');
  return group.includes('creditcard') || text.includes('cartão de crédito') || text.includes('cartao de credito') || text.includes('credit card');
}
function isPixPayment(method: PaymentMethod) {
  return (method.name + ' ' + method.group).toLowerCase().includes('pix');
}

function giftCardAppliedValue(giftCard: GiftCard) {
  return giftCard.value > 0 ? giftCard.value : giftCard.balance;
}

function giftCardsTotal(giftCards: GiftCard[]) {
  return giftCards.reduce((total, giftCard) => total + giftCardAppliedValue(giftCard), 0);
}

function giftCardsCoverOrder(giftCards: GiftCard[], orderValue: number) {
  return Math.round(giftCardsTotal(giftCards) * 100) >= Math.round(orderValue * 100);
}

function activeGiftCards(orderForm?: OrderForm | null) {
  return (orderForm?.paymentData?.giftCards ?? []).filter((giftCard) => giftCard.inUse && (giftCard.redemptionCode || giftCard.id));
}

function paymentAmountAfterGiftCards(orderForm: OrderForm) {
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

function cardBrandFor(method?: PaymentMethod | null, cardNumber = ''): PaymentBrand {
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

function cardPaymentMethodForNumber(methods: PaymentMethod[], cardNumber: string) {
  const candidates = methods.filter(isCardPayment);
  if (candidates.length === 0) return null;
  if (!digits(cardNumber)) return candidates[0];

  const validatorMatch = candidates.find((method) => paymentMethodMatchesValidator(method, cardNumber));
  if (validatorMatch) return validatorMatch;

  const brand = cardBrandFromNumber(cardNumber);
  if (brand) return candidates.find((method) => paymentMethodMatchesBrand(method, brand)) || null;
  return candidates.length === 1 ? candidates[0] : null;
}
type ParsedPixPayment = {
  code: string;
  paymentId: string;
  transactionId: string;
  imageUri: string;
};
function parsePaymentAppPayload(paymentApp?: PaymentAppData | null) {
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
function formatPixTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
function humanShippingEstimate(estimate: string) {
  const normalized = estimate.trim().toLowerCase();
  const match = normalized.match(/\d+/);
  if (!match) return estimate.trim() || 'Prazo a confirmar';
  const count = Number(match[0]);
  if (normalized.includes('bd')) return `${count} ${count === 1 ? 'dia útil' : 'dias úteis'}`;
  if (normalized.includes('h')) return `${count} ${count === 1 ? 'hora' : 'horas'}`;
  if (normalized.includes('m')) return `${count} ${count === 1 ? 'minuto' : 'minutos'}`;
  return `${count} ${count === 1 ? 'dia' : 'dias'}`;
}
function shippingPriceAndEstimate(option: Pick<ShippingOption, 'price' | 'shippingEstimate'>) {
  const price = option.price === 0 ? 'Grátis' : money(option.price);
  return `${price} - ${humanShippingEstimate(option.shippingEstimate)}`;
}
function deliveryEstimate(estimate: string) {
  const label = humanShippingEstimate(estimate);
  return label === 'Prazo a confirmar' ? label : 'Receba em até ' + label;
}

function giftWrappingOffering(item: CartItem): CartOffering | null {
  return item.offerings?.find((offering) => /embalag/i.test(offering.name)) ?? null;
}

function hasGiftWrapping(item: CartItem) {
  const offering = giftWrappingOffering(item);
  return Boolean(offering && item.bundleItems?.some((bundleItem) => bundleItem.id === offering.id));
}

function allGiftWrappingApplied(items: CartItem[]) {
  const giftWrappingItems = items.filter((item) => giftWrappingOffering(item));
  return giftWrappingItems.length > 0 && giftWrappingItems.every(hasGiftWrapping);
}

function getShippingOptions(orderForm: OrderForm): ShippingOption[] {
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

function getDefaultShippingOptionId(orderForm: OrderForm, options = getShippingOptions(orderForm)) {
  const current = orderForm.shippingData?.logisticsInfo.find((info) => info.selectedSla)?.selectedSla;
  if (current && options.some((option) => shippingOptionId(option) === current)) return current;
  const firstDelivery = options.find((option) => !isPickupOption(option));
  return shippingOptionId(firstDelivery ?? options[0]);
}

function getShippingSelectionId(orderForm: OrderForm, options: ShippingOption[], selectedId?: string | null) {
  if (selectedId && options.some((option) => shippingOptionId(option) === selectedId)) return selectedId;
  return getDefaultShippingOptionId(orderForm, options);
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { setShowOnCheckout } = useTabBar();
  const [step, setStep] = useState<Step>('cart');
  const [orderForm, setOrderForm] = useState<OrderForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [cartAddMessage, setCartAddMessage] = useState<string | null>(null);
  const [cartAddFeedbackKey, setCartAddFeedbackKey] = useState(0);
  const [email, setEmail] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [genderOpen, setGenderOpen] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [selectedSla, setSelectedSla] = useState<string | null>(null);
  const [pickupSelectionOpen, setPickupSelectionOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedPaymentLabel, setSelectedPaymentLabel] = useState('');
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentChoice[]>([]);
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentChoice | null>(null);
  const [selectedCardBrand, setSelectedCardBrand] = useState<PaymentBrand>('generic');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardValidationAttempted, setCardValidationAttempted] = useState(false);
  const [emailValidationAttempted, setEmailValidationAttempted] = useState(false);
  const [customerValidationAttempted, setCustomerValidationAttempted] = useState(false);
  const [addressValidationAttempted, setAddressValidationAttempted] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponMessageType, setCouponMessageType] = useState<'success' | 'error' | null>(null);
  const [voucher, setVoucher] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMessage, setVoucherMessage] = useState('');
  const [voucherMessageType, setVoucherMessageType] = useState<'success' | 'error' | null>(null);
  const [removingGiftCard, setRemovingGiftCard] = useState<string | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<CartItem | null>(null);
  const [customerExists, setCustomerExists] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftWrapLoading, setGiftWrapLoading] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [addressSelectionOpen, setAddressSelectionOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [orderResult, setOrderResult] = useState<CheckoutOrderResult | null>(null);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState(CONFIGURED_RECAPTCHA_SITE_KEY);
  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const checkoutScrollRef = useRef<ScrollView>(null);
  const couponMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newsletterOptInTouched = useRef(false);
  const genders: { value: string; text: string; disabled?: boolean; selected?: boolean }[] = [
    { value: '', text: 'Opcional', disabled: true, selected: true },
    { value: 'female', text: 'Feminino' },
    { value: 'male', text: 'Masculino' },
    { value: 'prefer_not_to_say', text: 'Prefiro não informar' },
    { value: 'other', text: 'Outros' },
  ];
  const customerDataRequests = useRef(new Map<string, Promise<CustomerCheckoutData>>()).current;

  function clearCouponMessage() {
    if (couponMessageTimeoutRef.current) {
      clearTimeout(couponMessageTimeoutRef.current);
      couponMessageTimeoutRef.current = null;
    }
    setCouponMessage('');
    setCouponMessageType(null);
  }

  function showCouponMessage(text: string, type: 'success' | 'error') {
    if (couponMessageTimeoutRef.current) clearTimeout(couponMessageTimeoutRef.current);
    setCouponMessage(text);
    setCouponMessageType(type);
    couponMessageTimeoutRef.current = setTimeout(() => {
      setCouponMessage('');
      setCouponMessageType(null);
      couponMessageTimeoutRef.current = null;
    }, 2000);
  }

  useEffect(() => () => {
    if (couponMessageTimeoutRef.current) clearTimeout(couponMessageTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (step !== 'cart') setCartAddMessage(null);
  }, [step]);

  useEffect(() => {
    setShowOnCheckout(Boolean(orderForm && orderForm.items.length === 0));
    return () => setShowOnCheckout(false);
  }, [orderForm?.items.length, setShowOnCheckout]);

  function loadCustomerData(customerEmail: string) {
    const key = customerEmail.trim().toLowerCase();
    const existing = customerDataRequests.get(key);
    if (existing) return existing;
    const request = Promise.all([
      getCustomerProfileFromMasterData(key).catch(() => null),
      getCustomerAddressesFromMasterData(key).catch(() => []),
    ]).then(([profile, addresses]) => ({ profile, addresses }));
    customerDataRequests.set(key, request);
    return request;
  }

  useEffect(() => {
    let active = true;
    Promise.all([getOrderForm(), getAccountSession()]).then(async ([value, session]) => {
      if (!active) return;
      setOrderForm(value);
      setGiftWrap(allGiftWrappingApplied(value.items));
      const existingCoupon = value.marketingData?.coupon?.trim() ?? '';
      setCoupon(existingCoupon.toUpperCase());
      setCouponApplied(Boolean(existingCoupon));
      clearCouponMessage();
      const loggedEmail = session?.email?.trim().toLowerCase() ?? '';
      setEmail(loggedEmail);
      newsletterOptInTouched.current = false;
      setNewsletterOptIn(true);
      setFirstName(''); setLastName(''); setDocument(''); setPhone(''); setBirthDate(''); setGender('');
      setCustomerExists(false); setEditingCustomer(false);
      setCustomerAddresses([]); setAddressSaved(false); setEditingAddress(false);
      setLoading(false);
      if (!loggedEmail) return;
      const { profile: customer, addresses } = await loadCustomerData(loggedEmail);
      if (!active) return;
      setEmail(loggedEmail);
      if (customer?.existsInMasterData === true) {
        setCustomerExists(true);
        applyProfile(customer, loggedEmail);
      } else {
        resetNewCustomerForm();
      }
      setCustomerAddresses(addresses);
      const preferred = addresses.find((item) => item.postalCode && item.street);
      if (preferred) applyAddress(preferred);
    }).catch(() => { if (active) setMessage('Não foi possível carregar o carrinho.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (step !== 'cart') return;
    return subscribeToCartChanges((value) => {
      setOrderForm(value);
      setGiftWrap(allGiftWrappingApplied(value.items));
    });
  }, [step]);

  useEffect(() => {
    if (!orderResult || orderResult.status !== 'pending_payment' || !orderResult.transactionId) return;
    let active = true;
    const checkStatus = async () => {
      try {
        const pixPayload = parsePaymentAppPayload(orderResult.paymentApp);
        const status = await getTransactionStatus(orderResult.transactionId, orderResult.orderGroup, pixPayload?.paymentId);
        if (!active) return;
        if (status.status === 'completed') {
          void clearCart(orderForm?.orderFormId).catch(() => undefined);
          setOrderResult((current) => current ? {
            ...current,
            status: 'completed',
            message: 'Pagamento confirmado e pedido processado com sucesso.',
          } : current);
        } else if (status.status === 'failed') {
          setOrderResult((current) => current ? {
            ...current,
            status: 'payment_failed',
            message: 'O pagamento não foi autorizado pela VTEX.',
          } : current);
        }
      } catch {
        // A consulta pode falhar momentaneamente; a próxima tentativa mantém o Pix ativo.
      }
    };
    void checkStatus();
    const interval = setInterval(() => { void checkStatus(); }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [orderForm?.orderFormId, orderResult?.orderGroup, orderResult?.status, orderResult?.transactionId]);

  function back() {
    const previous: Record<Step, Step | null> = { cart: null, email: 'cart', customer: 'email', address: 'customer', shipping: 'address', payment: 'shipping', card: 'payment', installments: 'card', review: 'payment' };
    const target = previous[step];
    if (target) setStep(target); else router.back();
  }

  function scrollToCheckoutTop() {
    setTimeout(() => checkoutScrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
  }

  function showCheckoutAddFeedback() {
    setCartAddMessage('Adicionado à sacola com sucesso!');
    setCartAddFeedbackKey((current) => current + 1);
    scrollToCheckoutTop();
  }

  async function openOrdersAfterCheckout() {
    try {
      const session = await getAccountSession();
      if (session?.email?.trim()) {
        router.push('/orders');
        return;
      }
    } catch {
      // If the session cannot be read, continue through the login flow.
    }
    router.push('/account?view=access' as never);
  }

  function applyProfile(profile: CustomerProfile, fallbackEmail = '') {
    setEmail(fallbackEmail || profile.email || '');
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setDocument(formatCpf(profile.document || ''));
    setPhone(formatPhone(profile.phone || profile.homePhone || ''));
    setBirthDate(formatBirthDate(profile.birthDate || ''));
    setGender(profile.gender || '');
    if (!newsletterOptInTouched.current && profile.isNewsletterOptIn !== undefined) setNewsletterOptIn(Boolean(profile.isNewsletterOptIn));
  }

  function changeNewsletterOptIn(value: boolean) {
    newsletterOptInTouched.current = true;
    setNewsletterOptIn(value);
  }

  function resetNewCustomerForm() {
    setCustomerExists(false);
    setEditingCustomer(true);
    setFirstName('');
    setLastName('');
    setDocument('');
    setPhone('');
    setBirthDate('');
    setGender('');
    setGenderOpen(false);
    setCustomerAddresses([]);
    setAddressSaved(false);
    setCustomerValidationAttempted(false);
    if (!newsletterOptInTouched.current) setNewsletterOptIn(true);
  }

  function applyAddress(address: CustomerAddress | NonNullable<NonNullable<OrderForm['shippingData']>['selectedAddresses']>[number]) {
    const id = String(('id' in address ? address.id : '') || (address.postalCode || '') + '-' + (address.street || '') + '-' + (address.number || ''));
    setSelectedAddressId(id);
    setAddressSaved(true);
    setEditingAddress(false);
    setReceiverName(address.receiverName ?? '');
    setPostalCode(formatPostalCode(address.postalCode ?? ''));
    setStreet(address.street ?? '');
    setNumber(address.number ?? '');
    setComplement(address.complement ?? '');
    setNeighborhood(address.neighborhood ?? '');
    setCity(address.city ?? '');
    setState(address.state ?? '');
  }

  function getCustomerErrors() {
    return {
      email: validEmail(email) ? '' : 'E-mail inválido',
      firstName: firstName.trim() ? '' : 'Nome inválido',
      lastName: lastName.trim() ? '' : 'Sobrenome inválido',
      phone: validPhone(phone) ? '' : 'Telefone inválido',
      document: validCpf(document) ? '' : 'CPF inválido',
    };
  }

  function getAddressErrors() {
    return {
      postalCode: digits(postalCode).length === 8 ? '' : 'CEP inválido',
      street: street.trim() ? '' : 'Endereço inválido',
      number: number.trim() ? '' : 'Número inválido',
      neighborhood: neighborhood.trim() ? '' : 'Bairro inválido',
      city: city.trim() ? '' : 'Cidade inválida',
      state: state.trim() ? '' : 'Estado inválido',
      receiverName: receiverName.trim() ? '' : 'Nome inválido',
    };
  }

  async function persistCustomer() {
    if (!orderForm) return;
    setSaving(true);
    setMessage('');
    try {
      // Um perfil existente já identificado pelo SmartCheckout não precisa ser
      // reenviado por completo. Preservar esse orderForm.userProfileId é
      // essencial para vales-presentes restritos ao CPF do proprietário.
      if (customerExists && !editingCustomer && orderForm.userProfileId) {
        setStep('address');
        return;
      }
      const customerOrderForm = await prepareOrderFormForCustomer(orderForm, email, document);
      await updateCustomerProfile(email.trim().toLowerCase(), {
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        document: digits(document),
        phone: digits(phone),
        birthDate: birthDateToApi(birthDate) || undefined,
        gender: gender || undefined,
        isNewsletterOptIn: newsletterOptIn,
      });
      setOrderForm(await updateClientProfile({
        orderFormId: customerOrderForm.orderFormId,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        document: digits(document),
        phone: digits(phone),
        birthDate: birthDateToApi(birthDate) || undefined,
        gender: gender || undefined,
      }));
      customerDataRequests.delete(email.trim().toLowerCase());
      setCustomerExists(true);
      setEditingCustomer(false);
      setStep('address');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar os dados.');
    } finally {
      setSaving(false);
    }
  }

  function continueCustomer() {
    setCustomerValidationAttempted(true);
    if (Object.values(getCustomerErrors()).some(Boolean)) {
      setEditingCustomer(true);
      return;
    }
    void persistCustomer();
  }

  function saveCustomer() {
    setCustomerValidationAttempted(true);
    if (Object.values(getCustomerErrors()).some(Boolean)) return;
    void persistCustomer();
  }

  async function createFreshCheckoutOrderForm(previousOrderForm: OrderForm): Promise<OrderForm> {
    let freshOrderForm = await createFreshOrderForm(previousOrderForm.items);
    const wrappedItems = previousOrderForm.items.filter(hasGiftWrapping);
    const usedFreshIndexes = new Set<number>();
    for (const previousItem of wrappedItems) {
      const freshItem = freshOrderForm.items.find((item) => (
        !usedFreshIndexes.has(item.index)
        && item.id === previousItem.id
        && item.seller === previousItem.seller
      ));
      const offering = freshItem ? giftWrappingOffering(freshItem) : null;
      if (!freshItem || !offering) continue;
      usedFreshIndexes.add(freshItem.index);
      freshOrderForm = await addItemOffering({
        orderFormId: freshOrderForm.orderFormId,
        itemIndex: freshItem.index,
        offeringId: offering.id,
      });
    }
    setGiftWrap(allGiftWrappingApplied(freshOrderForm.items));
    const existingCoupon = previousOrderForm.marketingData?.coupon?.trim();
    if (existingCoupon) {
      freshOrderForm = await addCouponToCart(freshOrderForm.orderFormId, existingCoupon).catch(() => freshOrderForm);
    }
    return freshOrderForm;
  }

  async function prepareOrderFormForCustomer(currentOrderForm: OrderForm, nextEmail: string, nextDocument = ''): Promise<OrderForm> {
    const normalizedNextEmail = nextEmail.trim().toLowerCase();
    const currentEmail = currentOrderForm.clientProfileData?.email?.trim().toLowerCase() ?? '';
    const normalizedNextDocument = digits(nextDocument);
    const currentDocument = digits(currentOrderForm.clientProfileData?.document ?? '');
    const emailChanged = Boolean(currentEmail && normalizedNextEmail && currentEmail !== normalizedNextEmail);
    const documentChanged = Boolean(currentDocument && normalizedNextDocument && currentDocument !== normalizedNextDocument);
    if (!emailChanged) return currentOrderForm;

    // A troca de CPF pode ser corrigida no próprio orderForm. Recriar o
    // carrinho só por divergência de documento descarta o contexto do cliente
    // e faz o provedor do vale rejeitar a aplicação no carrinho novo.
    const updatedOrderForm = await createFreshCheckoutOrderForm(currentOrderForm);
    console.info('[CHECKOUT] fresh orderForm for customer', {
      previousOrderFormId: currentOrderForm.orderFormId,
      orderFormId: updatedOrderForm.orderFormId,
      emailChanged,
      documentChanged,
    });
    setOrderForm(updatedOrderForm);
    setVoucherMessage('');
    setVoucherMessageType(null);
    setSelectedPayment(null);
    setSelectedPaymentLabel('');
    setInstallmentOptions([]);
    setSelectedInstallment(null);
    setSelectedCardBrand('generic');
    return updatedOrderForm;
  }

  async function recoverFromGiftCardOwnershipError(previousOrderForm: OrderForm): Promise<OrderForm> {
    const freshOrderForm = await createFreshCheckoutOrderForm(previousOrderForm);
    let recoveredOrderForm = email.trim()
      ? await updateClientProfile({
          orderFormId: freshOrderForm.orderFormId,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          document: digits(document),
          phone: digits(phone),
          birthDate: birthDateToApi(birthDate) || undefined,
          gender: gender || undefined,
        })
      : freshOrderForm;

    const shippingAddress = {
      receiverName: receiverName.trim(),
      postalCode: digits(postalCode),
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim(),
    };
    const canRestoreShipping = shippingAddress.postalCode.length === 8
      && Boolean(shippingAddress.receiverName && shippingAddress.street && shippingAddress.number
        && shippingAddress.neighborhood && shippingAddress.city && shippingAddress.state);
    if (canRestoreShipping) {
      const previousSlaId = getShippingSelectionId(previousOrderForm, getShippingOptions(previousOrderForm), selectedSla);
      recoveredOrderForm = await updateShippingAddress({
        orderFormId: recoveredOrderForm.orderFormId,
        address: shippingAddress,
      });
      if (previousSlaId) {
        recoveredOrderForm = await selectShippingOption({
          orderFormId: recoveredOrderForm.orderFormId,
          address: shippingAddress,
          logisticsInfo: recoveredOrderForm.shippingData?.logisticsInfo ?? [],
          slaId: previousSlaId,
        });
      }
    }

    console.info('[CHECKOUT] gift-card cart recovered', {
      previousOrderFormId: previousOrderForm.orderFormId,
      orderFormId: recoveredOrderForm.orderFormId,
      shippingRestored: canRestoreShipping,
    });
    setOrderForm(recoveredOrderForm);
    setSelectedPayment(null);
    setSelectedPaymentLabel('');
    setInstallmentOptions([]);
    setSelectedInstallment(null);
    setSelectedCardBrand('generic');
    return recoveredOrderForm;
  }

  async function continueWithEmail() {
    setEmailValidationAttempted(true);
    if (!validEmail(email)) return;
    setSaving(true);
    setMessage('');
    try {
      let customerOrderForm = orderForm ? await prepareOrderFormForCustomer(orderForm, email) : null;
      if (customerOrderForm) {
        try {
          const identifiedOrderForm = await identifyExistingCustomerByEmail(customerOrderForm.orderFormId, email);
          if (identifiedOrderForm) {
            customerOrderForm = identifiedOrderForm;
            setOrderForm(identifiedOrderForm);
          }
        } catch (error) {
          console.warn('[CHECKOUT] customer identification deferred', {
            orderFormId: customerOrderForm.orderFormId,
            message: error instanceof Error ? error.message : String(error || ''),
          });
        }
      }
      const { profile, addresses } = await loadCustomerData(email);
      const hydratedProfile = profile?.existsInMasterData === true
        ? mergeCustomerProfiles(profile, customerOrderForm?.clientProfileData ?? null)
        : null;
      if (hydratedProfile) {
        setCustomerExists(true); setEditingCustomer(false); applyProfile(hydratedProfile, email);
        setCustomerAddresses(addresses);
        const preferred = addresses.find((item) => item.postalCode && item.street);
        if (preferred) applyAddress(preferred);
        setStep('customer');
      } else {
        resetNewCustomerForm();
        setStep('customer');
      }
    } catch {
      resetNewCustomerForm();
      setStep('customer');
    } finally {
      setSaving(false);
    }
  }

  function openAddressSelection() {
    const hasSavedAddresses = customerAddresses.length > 1;
    setAddressSelectionOpen(hasSavedAddresses);
    setEditingAddress(!hasSavedAddresses);
    setStep('address');
  }

  async function continueWithSavedAddress() {
    if (!orderForm || saving) return;
    setSaving(true); setMessage('');
    try {
      const updated = await updateShippingAddress({ orderFormId: orderForm.orderFormId, address: { receiverName, postalCode: digits(postalCode), street, number, complement, neighborhood, city, state } });
      setOrderForm(updated);
      setSelectedSla(getDefaultShippingOptionId(updated));
      setAddressSelectionOpen(false); setAddressSaved(true); setEditingAddress(false); setStep('shipping');
    } catch {
      setMessage('Não foi possível calcular a entrega.');
    } finally {
      setSaving(false);
    }
  }

  function chooseShippingLocally(slaId: string) {
    setSelectedSla(slaId);
    setMessage('');
  }

  function choosePickupStore(option: ShippingOption) {
    const optionId = shippingOptionId(option);
    if (!optionId) return;
    chooseShippingLocally(optionId);
    setPickupSelectionOpen(false);
  }

  async function continueWithShipping() {
    if (!orderForm || saving) return;
    const slaId = getShippingSelectionId(orderForm, getShippingOptions(orderForm), selectedSla);
    if (!slaId) return setMessage('Selecione uma forma de entrega.');
    setSelectedSla(slaId); setSaving(true); setMessage('');
    try {
      setOrderForm(await selectShippingOption({ orderFormId: orderForm.orderFormId, address: { receiverName, postalCode: digits(postalCode), street, number, complement, neighborhood, city, state }, logisticsInfo: orderForm.shippingData?.logisticsInfo ?? [], slaId }));
      setStep('payment');
    } catch {
      setMessage('Não foi possível selecionar esta entrega.');
    } finally {
      setSaving(false);
    }
  }

  async function lookupCep(value: string) {
    const cep = digits(value);
    setPostalCode(formatPostalCode(value));
    if (cep.length !== 8) return;
    const result = await fetch('https://viacep.com.br/ws/' + cep + '/json/').then((response) => response.ok ? response.json() : null).catch(() => null);
    if (result && !result.erro) {
      setStreet(result.logradouro ?? '');
      setNeighborhood(result.bairro ?? '');
      setCity(result.localidade ?? '');
      setState(result.uf ?? '');
    }
  }

  async function saveAddress() {
    setAddressValidationAttempted(true);
    if (!orderForm || Object.values(getAddressErrors()).some(Boolean)) return setMessage('Preencha o endereço completo.');
    setSaving(true); setMessage('');
    try {
      setOrderForm(await updateShippingAddress({ orderFormId: orderForm.orderFormId, address: { receiverName, postalCode: digits(postalCode), street, number, complement, neighborhood, city, state } }));
      setAddressSaved(true); setEditingAddress(false); setStep('shipping');
    } catch {
      setMessage('Não foi possível calcular a entrega.');
    } finally {
      setSaving(false);
    }
  }

  function openCardPayment(method: PaymentMethod) {
    setSelectedPayment(method.id);
    setSelectedPaymentLabel(method.name || 'Cartão de crédito');
    setInstallmentOptions([]);
    setSelectedInstallment(null);
    setSelectedCardBrand('generic');
    setCardValidationAttempted(false);
    setStep('card');
  }

  function getCardErrors() {
    return {
      number: digits(cardNumber).length >= 13 && digits(cardNumber).length <= 19 ? '' : 'Número do cartão inválido',
      holder: cardHolder.trim() ? '' : 'Nome inválido',
      expiry: /^\d{2}\/\d{2}$/.test(cardExpiry) ? '' : 'Validade inválida',
      cvv: /^\d{3,4}$/.test(digits(cardCvv)) ? '' : 'CVV inválido',
    };
  }

  async function choosePayment(paymentSystem: string, label: string) {
    if (!orderForm) return;
    const paymentMethod = orderForm.paymentData?.paymentSystems.find((method) => method.id === paymentSystem);
    setSelectedPayment(paymentSystem);
    setSelectedPaymentLabel(label);
    setSaving(true);
    setMessage('');
    try {
      const updatedOrderForm = await selectPaymentMethod({ orderFormId: orderForm.orderFormId, paymentSystem, value: orderForm.value, giftCards: activeGiftCards(orderForm), profileEmail: email });
      setOrderForm(updatedOrderForm);
      const requestedSiteKey = getRecaptchaSiteKey(updatedOrderForm);
      if (requestedSiteKey) setRecaptchaSiteKey(requestedSiteKey);
      if (paymentMethod && isCardPayment(paymentMethod)) {
        let options: InstallmentChoice[] = [];
        try {
          options = await getPaymentInstallments({ orderFormId: updatedOrderForm.orderFormId, paymentSystem });
        } catch {
          const configured = updatedOrderForm.paymentData?.installmentOptions?.find((option) => option.paymentSystem === paymentSystem);
          options = configured?.installments ?? [];
        }
        if (options.length === 0) {
          const updatedPaymentValue = paymentAmountAfterGiftCards(updatedOrderForm);
          options = [{ count: 1, hasInterestRate: false, interestRate: 0, value: updatedPaymentValue, total: updatedPaymentValue }];
        }
        setInstallmentOptions(options);
        setSelectedInstallment(null);
        setStep('installments');
      } else {
        setSelectedInstallment(null);
        setStep('review');
      }
    } catch {
      setMessage('Não foi possível selecionar esta forma de pagamento.');
    } finally {
      setSaving(false);
    }
  }

  function continueWithCard() {
    setCardValidationAttempted(true);
    if (Object.values(getCardErrors()).some(Boolean)) return;
    const selectedCardMethod = cardPaymentMethodForNumber(orderForm?.paymentData?.paymentSystems ?? [], cardNumber);
    if (!selectedCardMethod) {
      setMessage('Não foi possível identificar uma forma de pagamento compatível com a bandeira deste cartão.');
      return;
    }
    const paymentSystem = selectedCardMethod.id.trim();
    if (!paymentSystem) {
      setMessage('Cartão de crédito não está disponível para este carrinho.');
      return;
    }
    setSelectedCardBrand(cardBrandFor(selectedCardMethod, cardNumber));
    void choosePayment(paymentSystem, 'Cartão de crédito');
  }

  async function chooseInstallment(option: InstallmentChoice) {
    if (!orderForm || !selectedPayment || saving) return;
    setSaving(true);
    setMessage('');
    try {
      const updatedOrderForm = await selectPaymentMethod({
        orderFormId: orderForm.orderFormId,
        paymentSystem: selectedPayment,
        value: orderForm.value,
        installments: option.count,
        installmentsInterestRate: option.interestRate,
        giftCards: activeGiftCards(orderForm),
        profileEmail: email,
      });
      setOrderForm(updatedOrderForm);
      setSelectedInstallment(option);
      setStep('review');
    } catch {
      setMessage('Não foi possível selecionar o parcelamento.');
    } finally {
      setSaving(false);
    }
  }

  async function finishOrder() {
    if (!orderForm || !selectedPayment || saving) return;
    const paymentKind: 'pix' | 'card' = selectedPaymentLabel.toLowerCase().includes('pix') ? 'pix' : 'card';
    setSaving(true);
    setMessage('');
    try {
      let paymentOrderForm = orderForm;
      const selectedAddress = orderForm.shippingData?.selectedAddresses?.[0];
      if (!selectedAddress || selectedAddress.addressType !== 'residential') {
        paymentOrderForm = await updateShippingAddress({
          orderFormId: orderForm.orderFormId,
          address: { receiverName, postalCode: digits(postalCode), street, number, complement, neighborhood, city, state },
        });
        setOrderForm(paymentOrderForm);
      }

      // A VTEX só define a chave reCAPTCHA aplicável depois que o meio de
      // pagamento foi selecionado. Atualizamos o attachment imediatamente
      // antes de gerar um token novo para não usar uma chave antiga.
      paymentOrderForm = await selectPaymentMethod({
        orderFormId: paymentOrderForm.orderFormId,
        paymentSystem: selectedPayment,
        value: paymentOrderForm.value,
        installments: paymentKind === 'card' ? selectedInstallment?.count ?? 1 : 1,
        installmentsInterestRate: paymentKind === 'card' ? selectedInstallment?.interestRate ?? 0 : 0,
        giftCards: activeGiftCards(paymentOrderForm),
        profileEmail: email,
      });
      setOrderForm(paymentOrderForm);
      let activeRecaptchaSiteKey = getRecaptchaSiteKey(paymentOrderForm) || recaptchaSiteKey;
      if (activeRecaptchaSiteKey) setRecaptchaSiteKey(activeRecaptchaSiteKey);

      let captchaToken = '';
      if (paymentKind === 'card' && activeRecaptchaSiteKey) {
        try {
          const tokenResult = await recaptchaRef.current?.getToken(activeRecaptchaSiteKey);
          captchaToken = tokenResult?.token || '';
          if (tokenResult?.siteKey) activeRecaptchaSiteKey = tokenResult.siteKey;
        } catch {
          setMessage('Não foi possível concluir a verificação de segurança automaticamente. Tente novamente.');
          return;
        }
      }
      if (paymentKind === 'card' && !captchaToken) {
        setMessage('Não foi possível concluir a verificação de segurança automaticamente. Tente novamente.');
        return;
      }

      const createOrderInput = (token = '', siteKey = activeRecaptchaSiteKey) => ({
        orderFormId: paymentOrderForm.orderFormId,
        paymentSystem: selectedPayment,
        paymentKind,
        document: digits(document),
        address: {
          receiverName,
          postalCode: digits(postalCode),
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
        },
        ...(paymentKind === 'card' ? {
          card: {
            cardNumber: digits(cardNumber),
            holderName: cardHolder.trim(),
            validationCode: digits(cardCvv),
            dueDate: cardExpiry,
          },
        } : {}),
        savePersonalData: true,
        optinNewsLetter: newsletterOptIn,
        ...(token && siteKey ? { captchaToken: token, captchaSiteKey: siteKey } : {}),
      });

      let result: CheckoutOrderResult;
      try {
        result = await placeOrder(createOrderInput(captchaToken));
      } catch (error) {
        const needsRecaptchaRetry = paymentKind === 'card'
          && error instanceof CheckoutOrderError
          && Boolean(error.recaptchaKey)
          // Quando há uma chave própria do aplicativo, repetir com a chave
          // web devolvida pela VTEX troca de integração no meio da compra.
          // Um novo toque já gera um token novo com a chave correta.
          && !CONFIGURED_RECAPTCHA_SITE_KEY;
        if (!needsRecaptchaRetry) throw error;

        const requestedSiteKey = String(CONFIGURED_RECAPTCHA_SITE_KEY || error.recaptchaKey || recaptchaSiteKey).trim();
        activeRecaptchaSiteKey = requestedSiteKey;
        setRecaptchaSiteKey(requestedSiteKey);
        recaptchaRef.current?.reset();
        const retryResult = await recaptchaRef.current?.getToken(requestedSiteKey);
        const retryToken = retryResult?.token || '';
        if (!retryToken) throw error;
        result = await placeOrder(createOrderInput(retryToken, retryResult?.siteKey || requestedSiteKey));
      }
      setOrderResult(result);
      if (result.status === 'completed') {
        void clearCart(paymentOrderForm.orderFormId).catch(() => undefined);
      }
    } catch (error) {
      if (error instanceof CheckoutOrderError && error.recaptchaKey) {
        setRecaptchaSiteKey(CONFIGURED_RECAPTCHA_SITE_KEY || error.recaptchaKey);
        recaptchaRef.current?.reset();
        setMessage('Não foi possível concluir a verificação de segurança automaticamente. Tente novamente.');
        return;
      }
      setMessage(error instanceof Error ? error.message : 'Não foi possível finalizar o pedido.');
    } finally {
      setSaving(false);
    }
  }

  async function applyCoupon() {
    const couponCode = coupon.trim();
    if (!orderForm || !couponCode) return;
    setSaving(true);
    setCouponLoading(true);
    clearCouponMessage();
    try {
      const updatedOrderForm = await addCouponToCart(orderForm.orderFormId, couponCode);
      setOrderForm(updatedOrderForm);
      const appliedCoupon = updatedOrderForm.marketingData?.coupon?.trim() ?? '';
      if (!appliedCoupon || appliedCoupon.toLowerCase() !== couponCode.toLowerCase()) {
        setCouponApplied(false);
        showCouponMessage('Cupom inválido.', 'error');
        return;
      }
      setCoupon(appliedCoupon.toUpperCase());
      setCouponApplied(true);
      showCouponMessage('Cupom aplicado!', 'success');
    } catch {
      setCouponApplied(false);
      showCouponMessage('Cupom inválido.', 'error');
    } finally {
      setCouponLoading(false);
      setSaving(false);
    }
  }

  async function removeCoupon() {
    if (!orderForm || !couponApplied) return;
    setSaving(true);
    setCouponLoading(true);
    clearCouponMessage();
    try {
      setOrderForm(await removeCouponFromCart(orderForm.orderFormId));
      setCoupon('');
      setCouponApplied(false);
    } catch {
      showCouponMessage('Não foi possível remover o cupom.', 'error');
    } finally {
      setCouponLoading(false);
      setSaving(false);
    }
  }

  async function ensureCustomerProfileForGiftCard(currentOrderForm: OrderForm): Promise<OrderForm> {
    const desiredEmail = email.trim();
    const desiredDocument = digits(document);
    const currentEmail = currentOrderForm.clientProfileData?.email?.trim() ?? '';
    const currentDocument = digits(currentOrderForm.clientProfileData?.document ?? '');
    const documentMatches = Boolean(desiredDocument && currentDocument && desiredDocument === currentDocument);

    console.info('[GIFT CARD] customer context', {
      profileEmailPresent: Boolean(currentEmail),
      profileDocumentPresent: Boolean(currentDocument),
      documentProvided: Boolean(desiredDocument),
      documentMatches,
    });

    if (!desiredEmail || !desiredDocument) {
      return currentOrderForm;
    }

    // O vale já aplicado guarda a identidade que o validou. Não alteramos
    // novamente clientProfileData enquanto houver um vale ativo; ao combinar
    // pagamentos ele será removido e reaplicado pela mesma sessão.
    if (activeGiftCards(currentOrderForm).length > 0) {
      return currentOrderForm;
    }

    // Para clientes já reconhecidos, primeiro vincula o orderForm ao perfil
    // localizado pelo e-mail. Depois atualizamos o CPF explicitamente para
    // garantir que a validação do vale use o mesmo documento informado pelo
    // cliente. Essa chamada é opcional para convidados e não impede o fallback
    // de atualização direta do perfil.
    if (customerExists || currentOrderForm.userProfileId) {
      try {
        const identifiedOrderForm = await identifyExistingCustomerByEmail(currentOrderForm.orderFormId, desiredEmail);
        if (identifiedOrderForm) {
          currentOrderForm = identifiedOrderForm;
          setOrderForm(identifiedOrderForm);
          if (identifiedOrderForm.userProfileId) {
            console.info('[GIFT CARD] customer identified before apply', {
              orderFormId: identifiedOrderForm.orderFormId,
              userProfileIdPresent: true,
            });
            return identifiedOrderForm;
          }
        }
      } catch (error) {
        console.warn('[GIFT CARD] customer identification fallback', {
          orderFormId: currentOrderForm.orderFormId,
          message: error instanceof Error ? error.message : String(error || ''),
        });
      }
    }

    const customerOrderForm = await prepareOrderFormForCustomer(currentOrderForm, desiredEmail, desiredDocument);
    if (customerOrderForm !== currentOrderForm) currentOrderForm = customerOrderForm;

    const updatedOrderForm = await updateClientProfile({
      orderFormId: currentOrderForm.orderFormId,
      email: desiredEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      document: desiredDocument,
      phone: digits(phone),
      birthDate: birthDateToApi(birthDate) || undefined,
      gender: gender || undefined,
    });
    setOrderForm(updatedOrderForm);
    return updatedOrderForm;
  }

  async function applyVoucher() {
    const redemptionCode = voucher.trim();
    if (!orderForm || !redemptionCode) return;
    setSaving(true);
    setVoucherLoading(true);
    setVoucherMessage('');
    setVoucherMessageType(null);
    try {
      let giftCardOrderForm = await ensureCustomerProfileForGiftCard(orderForm);
      console.info('[GIFT CARD] applying to orderForm', {
        orderFormId: giftCardOrderForm.orderFormId,
        userProfileIdPresent: Boolean(giftCardOrderForm.userProfileId),
      });
      const addToOrderForm = (targetOrderForm: OrderForm) => {
        const giftCardApplied = activeGiftCards(targetOrderForm);
        // Nesta tela ainda não existe uma segunda forma selecionada. Reenviar
        // payments antigos faz a VTEX rejeitar o vale como pagamento indisponível.
        return addGiftCardToCart(targetOrderForm.orderFormId, redemptionCode, giftCardApplied, [], email);
      };
      let updatedOrderForm: OrderForm;
      try {
        updatedOrderForm = await addToOrderForm(giftCardOrderForm);
      } catch (error) {
        if (!isGiftCardCartContextError(error)) throw error;
        giftCardOrderForm = await recoverFromGiftCardOwnershipError(giftCardOrderForm);
        updatedOrderForm = await addToOrderForm(giftCardOrderForm);
      }
      setOrderForm(updatedOrderForm);
      setVoucher('');
      setVoucherMessage('Vale-presente aplicado.');
      setVoucherMessageType('success');
    } catch (error) {
      setVoucherMessage(error instanceof Error ? error.message : 'Não foi possível adicionar o vale-presente.');
      setVoucherMessageType('error');
    } finally {
      setVoucherLoading(false);
      setSaving(false);
    }
  }

  function continueWithGiftCard() {
    if (!orderForm) return;
    const currentGiftCards = activeGiftCards(orderForm);
    if (!currentGiftCards.length) return;
    if (!giftCardsCoverOrder(currentGiftCards, orderForm.value)) {
      setMessage(`Pagamento restante de ${money(Math.max(0, orderForm.value - giftCardsTotal(currentGiftCards)))}. Por favor, combine com outra forma de pagamento`);
      return;
    }
    setSelectedPayment(null);
    setSelectedPaymentLabel('Vale presente');
    setSelectedInstallment(null);
    setMessage('');
    setStep('review');
  }

  async function removeVoucher(giftCard: GiftCard) {
    const redemptionCode = giftCard.redemptionCode;
    if (!orderForm || !redemptionCode) return;
    setSaving(true);
    setRemovingGiftCard(redemptionCode);
    setVoucherMessage('');
    setVoucherMessageType(null);
    try {
      setOrderForm(await removeGiftCardFromCart(orderForm.orderFormId, giftCard, appliedGiftCards, orderForm.paymentData?.payments ?? [], email));
    } catch (error) {
      if (isGiftCardOwnershipError(error)) {
        try {
          await recoverFromGiftCardOwnershipError(orderForm);
        } catch (recoveryError) {
          setVoucherMessage(recoveryError instanceof Error ? recoveryError.message : 'Não foi possível remover o vale-presente.');
          setVoucherMessageType('error');
        }
      } else {
        setVoucherMessage(error instanceof Error ? error.message : 'Não foi possível remover o vale-presente.');
        setVoucherMessageType('error');
      }
    } finally {
      setRemovingGiftCard(null);
      setSaving(false);
    }
  }

  async function changeItemQuantity(index: number, itemId: string, quantity: number) {
    if (!orderForm || updatingItem) return;
    const currentItem = orderForm.items.find((item) => item.index === index && item.id === itemId) ?? orderForm.items.find((item) => item.id === itemId);
    if (!currentItem) return;
    const previousOrderForm = orderForm;
    const nextQuantity = Math.max(0, quantity);
    const optimisticItems = orderForm.items
      .map((item) => item.index === currentItem.index && item.id === currentItem.id ? { ...item, quantity: nextQuantity } : item)
      .filter((item) => item.quantity > 0);
    const optimisticValue = Math.max(0, orderForm.value + ((nextQuantity - currentItem.quantity) * currentItem.price));
    setUpdatingItem(itemId); setMessage('');
    setOrderForm({ ...orderForm, items: optimisticItems, value: optimisticValue });
    try {
      const updatedOrderForm = await updateCartItem({ orderFormId: previousOrderForm.orderFormId, index: currentItem.index, itemId, sellerId: currentItem.seller, quantity: nextQuantity });
      setOrderForm(updatedOrderForm);
      setGiftWrap(allGiftWrappingApplied(updatedOrderForm.items));
    } catch (error) {
      setOrderForm(previousOrderForm);
      setGiftWrap(allGiftWrappingApplied(previousOrderForm.items));
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o produto.');
    } finally {
      setUpdatingItem(null);
    }
  }

  async function toggleGiftWrapping() {
    if (!orderForm || giftWrapLoading) return;
    const nextGiftWrap = !giftWrap;
    const giftWrappingItems = orderForm.items.filter((item) => giftWrappingOffering(item));
    if (giftWrappingItems.length === 0) {
      setMessage('Este carrinho não possui uma embalagem de presente disponível.');
      return;
    }

    const previousOrderForm = orderForm;
    setGiftWrap(nextGiftWrap);
    setGiftWrapLoading(true);
    setMessage('');
    try {
      let updatedOrderForm = previousOrderForm;
      for (const originalItem of giftWrappingItems) {
        const currentItem = updatedOrderForm.items.find((item) => (
          originalItem.uniqueId && item.uniqueId === originalItem.uniqueId
        ))
          ?? updatedOrderForm.items.find((item) => item.index === originalItem.index && item.id === originalItem.id)
          ?? updatedOrderForm.items.find((item) => item.id === originalItem.id && item.seller === originalItem.seller);
        if (!currentItem) continue;
        const offering = giftWrappingOffering(currentItem);
        if (!offering) continue;
        if (nextGiftWrap && !hasGiftWrapping(currentItem)) {
          updatedOrderForm = await addItemOffering({
            orderFormId: updatedOrderForm.orderFormId,
            itemIndex: currentItem.index,
            offeringId: offering.id,
          });
        } else if (!nextGiftWrap && hasGiftWrapping(currentItem)) {
          updatedOrderForm = await removeItemOffering({
            orderFormId: updatedOrderForm.orderFormId,
            itemIndex: currentItem.index,
            offeringId: offering.id,
          });
        }
      }
      setOrderForm(updatedOrderForm);
      setGiftWrap(allGiftWrappingApplied(updatedOrderForm.items));
    } catch (error) {
      const refreshedOrderForm = await getOrderForm(previousOrderForm.orderFormId).catch(() => previousOrderForm);
      setOrderForm(refreshedOrderForm);
      setGiftWrap(allGiftWrappingApplied(refreshedOrderForm.items));
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar a embalagem de presente.');
    } finally {
      setGiftWrapLoading(false);
    }
  }

  function confirmItemRemoval() {
    if (!pendingRemoval || updatingItem) return;
    const item = pendingRemoval;
    setPendingRemoval(null);
    void changeItemQuantity(item.index, item.id, 0);
  }

  if (loading) return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ActivityIndicator color="#0a0a0a" /></SafeAreaView></ThemedView>;
  if (!orderForm) return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ThemedText>{message || 'Carrinho vazio.'}</ThemedText></SafeAreaView></ThemedView>;
  if (orderForm.items.length === 0) return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Carrinho" onBack={() => router.replace('/')} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.emptyCartContent} showsVerticalScrollIndicator={false}>
    <View style={styles.emptyCartMessage}>
      <ShoppingBagIcon color="#0a0a0a" size={24} />
      <ThemedText style={styles.emptyCartTitle}>Ops, sua sacola está vazia.</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.emptyCartDescription}>Encontre os produtos que precisa navegando pelas categorias ou utilizando a busca.</ThemedText>
      <Primary title="Encontrar produtos" onPress={() => router.replace('/')} />
    </View>
    <ProductShelf data={EMPTY_CART_RECENT_PRODUCTS_SHELF} titleStyle={styles.emptyCartShelfTitle} />
  </ScrollView></SafeAreaView></ThemedView>;

  const giftWrappingAvailable = orderForm.items.some((item) => giftWrappingOffering(item));

  if (orderResult) {
    const pixPayload = parsePaymentAppPayload(orderResult.paymentApp);
    const isCompleted = orderResult.status === 'completed';
    const isPending = orderResult.status === 'pending_payment';
    const isPixResult = selectedPaymentLabel.toLowerCase().includes('pix') || /pix/i.test(orderResult.paymentApp?.appName || '');
    if (isPending && isPixResult) {
      return <PixPaymentScreen
        orderValue={orderForm.value}
        pixPayload={pixPayload}
        onBack={() => router.replace('/')}
      />;
    }
    if (isCompleted) {
      return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Pedido concluído" onBack={() => router.replace('/')} showSearch={false} showCart /><ScrollView contentContainerStyle={[styles.content, styles.orderSuccessContent]}>
        <View style={styles.orderSuccessCard}>
          <View style={styles.orderSuccessIcon}><ThemedText style={styles.orderSuccessCheck}>✓</ThemedText></View>
          <ThemedText style={styles.orderSuccessTitle}>Pronto, compra feita!</ThemedText>
          <ThemedText style={styles.orderSuccessDescription}>Enviamos uma confirmação com os detalhes do seu pedido para seu e-mail.</ThemedText>
          <ThemedText style={styles.orderSuccessLabel}>Seu código de pedido é</ThemedText>
          <ThemedText style={styles.orderSuccessId}>{orderResult.orderId || orderResult.orderGroup}</ThemedText>
          {!!orderResult.message && <ThemedText style={styles.orderSuccessDescription}>{orderResult.message}</ThemedText>}
        </View>
      </ScrollView><View style={styles.fixedFooter}><Primary title="Ver meus pedidos" onPress={() => { void openOrdersAfterCheckout(); }} /><Secondary title="Voltar ao início" onPress={() => router.replace('/')} /></View></SafeAreaView></ThemedView>;
    }
    const title = isPending ? 'Pagamento pendente' : 'Pagamento não autorizado';
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Resultado do pedido" onBack={() => router.replace('/')} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}>
      <View style={styles.paymentReview}>
        <ThemedText style={styles.pageTitle}>{title}</ThemedText>
        <ThemedText style={isPending ? styles.bodyText : styles.errorText}>
          {orderResult.message || (isPending ? 'A confirmação do pagamento ainda está pendente.' : 'A VTEX não confirmou o pagamento.')}
        </ThemedText>
      </View>
      <Card>
        <ThemedText style={styles.sectionTitle}>Identificação</ThemedText>
        <ThemedText style={styles.bodyText}>Pedido: {orderResult.orderId || orderResult.orderGroup}</ThemedText>
        <ThemedText style={styles.bodyText} themeColor="textSecondary">Transação: {orderResult.transactionId}</ThemedText>
      </Card>
      {isPending && pixPayload && <Card>
        <ThemedText style={styles.sectionTitle}>Pague com Pix</ThemedText>
        {!!pixPayload.imageUri && <Image source={{ uri: pixPayload.imageUri }} style={styles.pixQrImage} contentFit="contain" />}
        {!!pixPayload.code && <TextInput value={pixPayload.code} editable={false} multiline style={[styles.input, styles.pixCodeInput]} />}
        <ThemedText style={styles.bodyText} themeColor="textSecondary">A confirmação será atualizada automaticamente nesta tela.</ThemedText>
      </Card>}
      {!isPending && <ThemedText style={styles.errorText}>A transação foi criada, mas o pedido não deve ser considerado aprovado. Você pode tentar novamente após revisar a configuração do provedor de pagamento.</ThemedText>}
    </ScrollView><View style={styles.fixedFooter}>
      {isPending && <Secondary title="Voltar para a loja" onPress={() => router.replace('/')} />}
      {!isPending && <Primary title="Tentar novamente" onPress={() => { setOrderResult(null); setMessage(''); setStep('payment'); }} />}
    </View></SafeAreaView></ThemedView>;
  }

  const slas = getShippingOptions(orderForm);
  const selectedShippingId = getShippingSelectionId(orderForm, slas, selectedSla);
  const selectedShipping = slas.find((sla) => shippingOptionId(sla) === selectedShippingId);
  const deliveryOptions = slas.filter((sla) => !isPickupOption(sla));
  const pickupOptions = slas.filter(isPickupOption);
  const selectedPickup = pickupOptions.find((sla) => shippingOptionId(sla) === selectedShippingId);

  if (step === 'address' && addressSelectionOpen && customerAddresses.length > 1) {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Entrega" onBack={() => setAddressSelectionOpen(false)} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}>
      <ThemedText style={styles.pageTitle}>Selecione um endereço para entrega</ThemedText>
      <View style={styles.addressList}>{customerAddresses.map((address) => {
        const addressId = String(address.id || (address.postalCode || '') + '-' + (address.street || '') + '-' + (address.number || ''));
        const selected = selectedAddressId === addressId;
        return <Pressable key={addressId} onPress={() => { applyAddress(address); setAddressSelectionOpen(false); }} style={[styles.addressOption, selected && styles.addressOptionSelected]}><Radio selected={selected} /><View style={styles.addressDetails}><ThemedText style={styles.bodyText}>{address.street + ', ' + address.number + (address.complement ? ' - ' + address.complement : '')}</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">{address.neighborhood + ' - ' + address.city + '/' + address.state}</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">CEP: {address.postalCode}</ThemedText></View></Pressable>;
      })}</View>
    </ScrollView><View style={styles.fixedFooter}><Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={continueWithSavedAddress} /><Secondary title="Alterar endereço de entrega" onPress={() => { setAddressSelectionOpen(false); setEditingAddress(true); }} /></View></SafeAreaView></ThemedView>;
  }

  if (step === 'installments') {
    const paymentMethod = orderForm.paymentData?.paymentSystems.find((method) => method.id === selectedPayment);
    const brand = selectedCardBrand === 'generic' ? cardBrandFor(paymentMethod, cardNumber) : selectedCardBrand;
    return <InstallmentsScreen
      brand={brand}
      cardName={paymentMethod?.name || 'Cartão de crédito'}
      cardNumber={cardNumber}
      options={installmentOptions}
      saving={saving}
      onBack={() => setStep('card')}
      onSelect={(option) => void chooseInstallment(option)}
    />;
  }

  if (isShippingStep(step)) {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Entrega" onBack={back} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}>
      <ThemedText style={styles.pageTitle}>Como deseja receber seu produto?</ThemedText>
      <ThemedView style={styles.shippingCard}>
        <View style={styles.shippingAddressRow}><ThemedText style={styles.pinIcon}>⌖</ThemedText><ThemedText style={styles.shippingAddressText}>Envio para {street}{number ? ', ' + number : ''}</ThemedText></View>

        {deliveryOptions.length > 0 && <View style={styles.shippingSection}>
          <ThemedText style={styles.sectionTitle}>Receber em casa</ThemedText>
          {deliveryOptions.map((sla) => {
            const optionId = shippingOptionId(sla);
            const selected = selectedShippingId === optionId;
            return <Pressable key={shippingOptionKey(sla)} onPress={() => chooseShippingLocally(optionId)} disabled={saving || !optionId} style={[styles.shippingOption, selected && styles.shippingOptionSelected]}>
              <Radio selected={selected} />
              <View style={styles.shippingOptionDetails}><ThemedText style={styles.dataLabel}>{sla.name}{sla.price === 0 ? ' - Grátis' : ''}</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">{shippingPriceAndEstimate(sla)}</ThemedText></View>
            </Pressable>;
          })}
        </View>}

        {pickupOptions.length > 0 && <View style={styles.shippingSection}>
          <ThemedText style={styles.sectionTitle}>Retirada</ThemedText>
          {selectedPickup ? <Pressable onPress={() => setPickupSelectionOpen(true)} disabled={saving} style={[styles.pickupSelectedCard, styles.shippingOptionSelected]}>
            <StoreIcon color="#0a0a0a" size={22} />
            <View style={styles.shippingOptionDetails}>
              <ThemedText style={styles.dataLabel}>{pickupStoreName(selectedPickup)}</ThemedText>
              {pickupAddressLines(selectedPickup).map((line, index) => <ThemedText style={styles.bodyText} key={line + index} themeColor="textSecondary">{line}</ThemedText>)}
              <ThemedText style={styles.bodyText} themeColor="textSecondary">{shippingPriceAndEstimate(selectedPickup)}</ThemedText>
              <ThemedText style={styles.link}>Alterar loja</ThemedText>
            </View>
            <ChevronRightIcon color="#625d57" size={20} />
          </Pressable> : <Pressable onPress={() => setPickupSelectionOpen(true)} disabled={saving} style={styles.pickupButton}>
            <StoreIcon color="#0a0a0a" size={22} />
            <View style={styles.shippingOptionDetails}><ThemedText style={styles.dataLabel}>Retirar em loja</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">Escolha uma das {pickupOptions.length} lojas disponíveis</ThemedText></View>
            <ChevronRightIcon color="#625d57" size={20} />
          </Pressable>}
        </View>}

        {slas.length === 0 && <ThemedText style={styles.bodyText} themeColor="textSecondary">Nenhuma forma de entrega disponível.</ThemedText>}
        {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
      </ThemedView>
    </ScrollView><Modal visible={pickupSelectionOpen} animationType="slide" onRequestClose={() => setPickupSelectionOpen(false)}><ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Retirar em loja" onBack={() => setPickupSelectionOpen(false)} showSearch={false} showCart={false} /><ScrollView contentContainerStyle={styles.content}><ThemedText style={styles.pageTitle}>Escolha a loja para retirada</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">Selecione onde deseja retirar seu pedido.</ThemedText>{pickupOptions.map((option) => <PickupStoreCard key={shippingOptionKey(option)} option={option} selected={shippingOptionId(option) === selectedShippingId} disabled={saving} onPress={() => choosePickupStore(option)} />)}</ScrollView></SafeAreaView></ThemedView></Modal><View style={styles.fixedFooter}><Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={continueWithShipping} /><Secondary title="Alterar endereço de entrega" onPress={openAddressSelection} /></View></SafeAreaView></ThemedView>;
  }

  if (step === 'address' && addressSaved && !editingAddress) {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Entrega" onBack={back} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}><ThemedText style={styles.pageTitle}>Selecione um endereço para entrega</ThemedText><ThemedView style={[styles.shippingCard, styles.selectedAddressCard]}><Pressable onPress={openAddressSelection} style={styles.addressSummaryHeader}><View style={styles.addressSummaryTitleRow}><Radio selected /><ThemedText style={styles.addressSummaryTitle}>Enviar para o meu endereço</ThemedText></View><ChevronRightIcon color="#625d57" size={20} /></Pressable><View style={styles.addressDivider} /><View style={styles.addressDetails}><ThemedText style={styles.bodyText}>{street}, {number}</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">{neighborhood} - {city}/{state}</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">CEP: {postalCode}</ThemedText></View><Pressable onPress={openAddressSelection}><ThemedText style={styles.link}>{customerAddresses.length > 1 ? 'Alterar ou escolher outro endereço' : 'Alterar endereço'}</ThemedText></Pressable></ThemedView></ScrollView><View style={styles.fixedFooter}><Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={continueWithSavedAddress} /><Secondary title="Alterar endereço de entrega" onPress={openAddressSelection} /></View></SafeAreaView></ThemedView>;
  }

  const payments = orderForm.paymentData?.paymentSystems ?? [];
  const cardMethod = payments.find(isCardPayment);
  const pixMethod = payments.find(isPixPayment);
  const activeCardMethod = cardPaymentMethodForNumber(payments, cardNumber);
  const activeCardBrand = cardNumber ? cardBrandFor(activeCardMethod, cardNumber) : 'generic';
  const reviewCardBrand = selectedCardBrand === 'generic' ? activeCardBrand : selectedCardBrand;
  const appliedGiftCards = activeGiftCards(orderForm);
  const title: Record<Step, string> = { cart: 'Carrinho', email: 'Dados pessoais', customer: 'Dados pessoais', address: 'Entrega', shipping: 'Entrega', payment: 'Pagamento', card: 'Cartão de crédito', installments: 'Parcelamento', review: 'Revise e confirme' };
  const customerErrors = getCustomerErrors();
  const addressErrors = getAddressErrors();
  const cardErrors = getCardErrors();

  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title={title[step]} onBack={back} showSearch={false} showCart />{recaptchaSiteKey && (step === 'payment' || step === 'card' || step === 'review') && <Recaptcha ref={recaptchaRef} siteKey={recaptchaSiteKey} />}<ScrollView ref={checkoutScrollRef} contentContainerStyle={styles.content}>
     {step === 'cart' && <><ThemedView style={styles.productsCard}>{orderForm.items.map((item, position) => <View key={item.id + '-' + item.index} style={[styles.productBlock, position > 0 && styles.productDivider]}><View style={styles.itemRow}>{!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />}<View style={styles.itemDetails}><View style={styles.itemTopRow}><ThemedText style={styles.itemName}>{item.name}</ThemedText><Pressable accessibilityLabel={'Remover ' + item.name} disabled={Boolean(updatingItem)} onPress={() => setPendingRemoval(item)} style={styles.removeButton}><TrashIcon size={20} color="#65666E" /></Pressable></View><ThemedText style={styles.dataLabel}>{money(item.price)}</ThemedText><View style={styles.itemBottomRow}><View style={styles.quantityControl}><Pressable disabled={Boolean(updatingItem) || item.quantity <= 1} onPress={() => changeItemQuantity(item.index, item.id, item.quantity - 1)} style={styles.quantityButton}><ThemedText>−</ThemedText></Pressable><View style={styles.quantityValue}>{updatingItem === item.id ? <ActivityIndicator size="small" color="#65666E" /> : <ThemedText style={styles.quantityCount}>{item.quantity}</ThemedText>}</View><Pressable disabled={Boolean(updatingItem)} onPress={() => changeItemQuantity(item.index, item.id, item.quantity + 1)} style={styles.quantityButton}><ThemedText>+</ThemedText></Pressable></View></View></View></View></View>)}{giftWrappingAvailable && <Pressable disabled={giftWrapLoading || saving} onPress={toggleGiftWrapping} style={styles.giftRow}><View style={[styles.giftCheckbox, giftWrap && styles.giftCheckboxSelected]}>{giftWrapLoading ? <ActivityIndicator size="small" color={giftWrap ? '#FFFFFF' : '#0a0a0a'} /> : giftWrap && <ThemedText style={styles.giftCheck}>✓</ThemedText>}</View><ThemedText style={styles.giftText}>Incluir uma embalagem de presente para o pedido</ThemedText></Pressable>}</ThemedView>{giftWrap && <View style={styles.giftMessage}><ThemedText style={styles.giftMessageText}>Todos os itens selecionados como presente serão entregues em uma única embalagem. Caso precise de mais unidades, entre em contato com o nosso SAC.</ThemedText></View>}<ThemedView style={styles.card}><ThemedText style={styles.cardTitle}>Cupom de desconto</ThemedText><View style={styles.inline}><TextInput value={coupon} onChangeText={(text) => { setCoupon(text); if (couponMessage) clearCouponMessage(); }} autoCapitalize="characters" autoCorrect={false} editable={!couponApplied} placeholder="Insira o código" style={[styles.input, styles.flex, couponApplied && styles.appliedCouponInput]} />{couponApplied ? <Pressable accessibilityLabel="Remover cupom" disabled={saving || couponLoading} onPress={removeCoupon} style={styles.removeButton}>{couponLoading ? <ActivityIndicator size="small" color="#65666E" /> : <TrashIcon size={21} color="#65666E" />}</Pressable> : <Pressable disabled={saving || couponLoading || !coupon.trim()} onPress={applyCoupon} style={styles.smallButton}>{couponLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>Adicionar</ThemedText>}</Pressable>}</View>{!!couponMessage && <ThemedText style={couponMessageType === 'success' ? styles.couponSuccess : styles.couponError}>{couponMessage}</ThemedText>}</ThemedView><FreeShippingProgress value={orderForm.value} /><Summary orderForm={orderForm} /><ProductShelf data={CART_BEST_SELLING_PRODUCTS_SHELF} titleStyle={styles.checkoutShelfTitle} onAdded={showCheckoutAddFeedback} showAddedModal={false} /></>}
    {step === 'email' && <Card><ThemedText style={styles.cardTitle}>Informe seu e-mail para continuar</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">Vamos verificar se você já fez alguma compra com a gente.</ThemedText><Field label="E-mail" value={email} setValue={setEmail} required placeholder="Digite seu email" keyboardType="email-address" error={emailValidationAttempted && !validEmail(email) ? 'E-mail inválido' : ''} /><NewsletterOptIn value={newsletterOptIn} onChange={changeNewsletterOptIn} onPrivacyPress={() => router.push('/privacy-policy' as never)} /></Card>}
    {step === 'customer' && <>
      {customerExists && !editingCustomer
        ? <CustomerDataSummary email={email} firstName={firstName} lastName={lastName} phone={phone} birthDate={birthDate} document={document} gender={gender} onEdit={() => setEditingCustomer(true)} />
        : <Card>
          <ThemedText style={styles.cardTitle}>Informe seu e-mail para continuar</ThemedText>
          <ThemedText style={styles.bodyText} themeColor="textSecondary">Vamos verificar se você já fez alguma compra com a gente</ThemedText>
          <Field label="E-mail" value={email} setValue={setEmail} required placeholder="Digite seu email" keyboardType="email-address" error={customerValidationAttempted ? customerErrors.email : ''} />
          <Field label="Nome" value={firstName} setValue={setFirstName} required placeholder="Nome" error={customerValidationAttempted ? customerErrors.firstName : ''} />
          <Field label="Sobrenome" value={lastName} setValue={setLastName} required placeholder="Sobrenome" error={customerValidationAttempted ? customerErrors.lastName : ''} />
          <Field label="Telefone com DDD" value={formatPhoneWithoutCountryCode(phone)} setValue={(value) => setPhone(formatPhone(value))} required placeholder="11999999999" keyboardType="phone-pad" error={customerValidationAttempted ? customerErrors.phone : ''} />
          <Field label="Data de nascimento" value={birthDate} setValue={(value) => setBirthDate(formatBirthDateInput(value))} placeholder="DD/MM/AAAA" keyboardType="numeric" />
          <Field label="CPF" value={document} setValue={(value) => setDocument(formatCpf(value))} required placeholder="000.000.000-00" keyboardType="numeric" error={customerValidationAttempted ? customerErrors.document : ''} />
          <View style={styles.field}><ThemedText style={styles.fieldLabel}>Gênero</ThemedText><Pressable onPress={() => setGenderOpen((value) => !value)} style={styles.select}><ThemedText style={styles.bodyText} themeColor="textSecondary">{formatGenderLabel(gender) || genders[0].text}</ThemedText><View style={[styles.dropdownIcon, genderOpen && styles.dropdownIconOpen]}><ChevronRightIcon color="#625d57" size={16} /></View></Pressable>{genderOpen && <View style={styles.dropdown}>{genders.map((option) => <Pressable key={option.value || 'optional'} disabled={option.disabled} onPress={() => { if (option.disabled) return; setGender(option.value); setGenderOpen(false); }} style={styles.option}><ThemedText style={styles.bodyText}>{option.text}</ThemedText></Pressable>)}</View>}</View>
          <NewsletterOptIn value={newsletterOptIn} onChange={changeNewsletterOptIn} onPrivacyPress={() => router.push('/privacy-policy' as never)} />
        </Card>}
      {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
    </>}
    {step === 'address' && (addressSaved && !editingAddress ? <Card><ThemedText style={styles.cardTitle}>Endereço de entrega</ThemedText><ThemedText style={styles.bodyText}>{receiverName}</ThemedText><ThemedText style={styles.bodyText}>{street + ', ' + number + (complement ? ' - ' + complement : '')}</ThemedText><ThemedText style={styles.bodyText}>{neighborhood + ' - ' + city + '/' + state}</ThemedText><ThemedText style={styles.bodyText}>CEP: {postalCode}</ThemedText><Pressable onPress={openAddressSelection}><ThemedText style={styles.link}>{customerAddresses.length > 1 ? 'Alterar ou escolher outro endereço' : 'Alterar endereço'}</ThemedText></Pressable></Card> : <Card><ThemedText style={styles.cardTitle}>Endereço de entrega</ThemedText><Field label="CEP" value={postalCode} setValue={lookupCep} required placeholder="00000-000" keyboardType="numeric" error={addressValidationAttempted ? addressErrors.postalCode : ''} /><Field label="Endereço" value={street} setValue={setStreet} required placeholder="Endereço" error={addressValidationAttempted ? addressErrors.street : ''} /><View style={styles.inline}><Field label="Número" value={number} setValue={setNumber} required placeholder="Número" error={addressValidationAttempted ? addressErrors.number : ''} /><Field label="Complemento" value={complement} setValue={setComplement} placeholder="Complemento" /></View><Field label="Bairro" value={neighborhood} setValue={setNeighborhood} required placeholder="Bairro" error={addressValidationAttempted ? addressErrors.neighborhood : ''} /><View style={styles.inline}><Field label="Cidade" value={city} setValue={setCity} required placeholder="Cidade" error={addressValidationAttempted ? addressErrors.city : ''} /><Field label="Estado" value={state} setValue={setState} required placeholder="Estado" error={addressValidationAttempted ? addressErrors.state : ''} /></View><Field label="Quem irá receber?" value={receiverName} setValue={setReceiverName} required placeholder="Nome do recebedor" error={addressValidationAttempted ? addressErrors.receiverName : ''} />{!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}</Card>)}
     {step === 'payment' && <>
       <ThemedText style={styles.pageTitle}>Escolha como pagar</ThemedText>
       <Pressable disabled={saving} onPress={() => cardMethod ? openCardPayment(cardMethod) : setMessage('Cartão de crédito não está disponível para este carrinho.')} style={styles.paymentCard}>
         <View style={styles.paymentHeader}><CreditCardIcon color="#0a0a0a" size={21} /><ThemedText style={styles.sectionTitle}>Cartão de Crédito</ThemedText></View>
         <View style={styles.paymentDivider} />
         <ThemedText style={styles.bodyText} themeColor="textSecondary">+ novo cartão</ThemedText>
       </Pressable>
       <GiftCardPaymentSection
         voucher={voucher}
         onVoucherChange={(text) => { setVoucher(text.normalize('NFC')); if (voucherMessage) { setVoucherMessage(''); setVoucherMessageType(null); } }}
         voucherLoading={voucherLoading}
         saving={saving}
         onApply={applyVoucher}
         appliedGiftCards={appliedGiftCards}
         orderValue={orderForm.value}
         removingGiftCard={removingGiftCard}
         onRemove={removeVoucher}
         voucherMessage={voucherMessage}
         voucherMessageType={voucherMessageType}
         onContinue={continueWithGiftCard}
       />
       {!!message && <ThemedText style={message.includes('adicionado') ? styles.successText : styles.errorText}>{message}</ThemedText>}
       <Pressable disabled={saving} onPress={() => pixMethod ? choosePayment(pixMethod.id, pixMethod.name || 'Pix') : setMessage('Pix não está disponível para este carrinho.')} style={styles.paymentCard}>
         <ThemedText style={styles.sectionTitle}>Pix</ThemedText>
         <ThemedText style={styles.bodyText} themeColor="textSecondary">Pagamento instantâneo</ThemedText>
         <View style={styles.pixInfo}><PaymentBrandIcon brand="pix" width={58} height={30} /><ThemedText style={styles.bodyText} themeColor="textSecondary">O código Pix será exibido na próxima etapa, após a revisão do seu pedido.</ThemedText></View>
       </Pressable>
     </>}
      {step === 'card' && <><CreditCardVisual brand={activeCardBrand} cardNumber={cardNumber} holderName={cardHolder} expiry={cardExpiry} cvv={cardCvv} /><Card><Field label="Número do cartão" value={cardNumber} setValue={(value) => setCardNumber(formatCardNumber(value))} required placeholder="Insira o número do seu cartão" keyboardType="numeric" accessory={activeCardBrand !== 'generic' ? <PaymentBrandIcon brand={activeCardBrand} width={42} height={27} /> : undefined} error={cardValidationAttempted ? cardErrors.number : ''} /><Field label="Nome impresso no cartão" value={cardHolder} setValue={setCardHolder} required placeholder="Nome impresso no cartão" error={cardValidationAttempted ? cardErrors.holder : ''} /><View style={styles.inline}><Field label="Validade" value={cardExpiry} setValue={(value) => setCardExpiry(formatExpiry(value))} required placeholder="MM/AA" keyboardType="numeric" error={cardValidationAttempted ? cardErrors.expiry : ''} /><Field label="CVV" value={cardCvv} setValue={setCardCvv} required placeholder="CVV" keyboardType="numeric" error={cardValidationAttempted ? cardErrors.cvv : ''} /></View><ThemedText style={styles.cardTitle}>Endereço de cobrança</ThemedText><Pressable onPress={() => undefined} style={styles.billingRow}><View style={styles.billingCheckbox}><ThemedText style={styles.billingCheck}>✓</ThemedText></View><ThemedText style={styles.billingText}>O endereço da fatura é {street + ', ' + number + ' - ' + neighborhood + ', ' + city + ' - ' + state}</ThemedText></Pressable></Card><AcceptedBrands />{!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}</>}
      {step === 'review' && <>
        <ThemedText style={styles.pageTitle}>Revise e confirme</ThemedText>
       <Summary orderForm={orderForm} shippingPrice={selectedShipping?.price} />
       <Card>
         <ReviewHeader icon="user" title="DADOS PESSOAIS" />
         <CustomerReviewData email={email} firstName={firstName} lastName={lastName} phone={phone} document={document} />
         <Pressable onPress={() => { setEditingCustomer(true); setStep('customer'); }}><ThemedText style={styles.link}>ALTERAR</ThemedText></Pressable>
       </Card>
       <Card>
         <View style={styles.reviewDeliveryTop}><ReviewHeader icon="truck" title="ENTREGA" /><ThemedText style={styles.freeText}>{selectedShipping?.price === 0 ? 'Grátis' : money(selectedShipping?.price || 0)}</ThemedText></View>
         <ThemedText style={styles.bodyText}>{selectedPickup ? pickupStoreName(selectedPickup) : selectedShipping?.name || 'Entrega selecionada'}</ThemedText>
         <ThemedText style={styles.deliveryText}>◷ {selectedPickup ? 'Retire em ' + humanShippingEstimate(selectedShipping?.shippingEstimate || '') : deliveryEstimate(selectedShipping?.shippingEstimate || '')}</ThemedText>
         <View style={styles.reviewAddress}>
           <ThemedText style={styles.sectionTitle}>{selectedPickup ? 'Loja para retirada' : 'Endereço de Entrega'}</ThemedText>
           {selectedPickup ? pickupAddressLines(selectedPickup).map((line, index) => <ThemedText key={line + index} style={styles.bodyText}>{line}</ThemedText>) : <><ThemedText style={styles.bodyText}>{street + ', ' + number}</ThemedText><ThemedText style={styles.bodyText}>{neighborhood + ', ' + city + ' - ' + state}</ThemedText><ThemedText style={styles.bodyText}>CEP: {postalCode}</ThemedText></>}
         </View>
         <View style={styles.reviewItems}>{orderForm.items.map((item) => <View key={item.id + '-' + item.index + '-review'} style={styles.reviewItem}>{!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.reviewItemImage} />}<ThemedText style={styles.reviewItemName}>{item.name + ' ' + item.quantity + ' un.'}</ThemedText></View>)}</View>
         <Pressable onPress={() => setStep('shipping')}><ThemedText style={styles.link}>ALTERAR</ThemedText></Pressable>
       </Card>
       <Card>
          <ReviewHeader icon="card" title="PAGAMENTO" />
          <View style={styles.paymentReviewCard}>
            {selectedPayment && (selectedPaymentLabel.toLowerCase().includes('pix')
              ? <><PaymentBrandIcon brand="pix" width={78} height={39} /><ThemedText style={styles.bodyText}>Aprovação imediata</ThemedText></>
              : <><CreditCardVisual brand={reviewCardBrand} cardNumber={cardNumber} holderName={cardHolder} expiry={cardExpiry} cvv={cardCvv} masked compact /><View style={styles.installmentSummary}><ThemedText style={styles.installmentSummaryLabel}>Parcelamento</ThemedText><ThemedText style={styles.installmentSummaryValue}>{selectedInstallment ? selectedInstallment.count + 'x ' + money(selectedInstallment.value) : '1x ' + money(paymentAmountAfterGiftCards(orderForm))}</ThemedText></View></>)}
            {appliedGiftCards.length > 0 && <GiftCardPaymentReview giftCards={appliedGiftCards} />}
          </View>
         <Pressable onPress={() => setStep('payment')}><ThemedText style={styles.link}>ALTERAR</ThemedText></Pressable>
       </Card>
       {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
     </>}
  </ScrollView><AddToCartFeedback key={cartAddFeedbackKey} message={step === 'cart' ? cartAddMessage : null} /><Modal visible={Boolean(pendingRemoval)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPendingRemoval(null)}><View style={styles.modalOverlay}><ThemedView style={styles.modalCard}><ThemedText style={styles.modalTitle}>Deseja remover {pendingRemoval?.name} do carrinho?</ThemedText><Pressable disabled={Boolean(updatingItem)} onPress={confirmItemRemoval} style={styles.modalDeleteButton}><ThemedText style={styles.buttonText}>Excluir</ThemedText></Pressable><Pressable onPress={() => setPendingRemoval(null)} style={styles.modalCancelButton}><ThemedText style={styles.dataLabel}>Cancelar</ThemedText></Pressable></ThemedView></View></Modal><View style={styles.fixedFooter}>{step === 'cart' && <Primary title="Finalizar compra" onPress={() => setStep('email')} />}{step === 'email' && <Primary title={saving ? 'Consultando...' : 'Continuar'} onPress={continueWithEmail} />}{step === 'customer' && <Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={customerExists && !editingCustomer ? continueCustomer : saveCustomer} />}{step === 'address' && <Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={addressSaved && !editingAddress ? continueWithSavedAddress : saveAddress} />}{step === 'card' && <Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={continueWithCard} />}{step === 'review' && <Primary title={saving ? 'Enviando...' : 'Finalizar Compra'} onPress={finishOrder} />}</View></SafeAreaView></ThemedView>;
}

function cardGradient(brand: PaymentBrand): [string, string, string] {
  if (brand === 'visa') return ['#2f66e8', '#2455d7', '#1d46bd'];
  if (brand === 'mastercard') return ['#f36a21', '#ef3d3d', '#d92c35'];
  if (brand === 'elo') return ['#35b9a4', '#239a9c', '#137f8b'];
  if (brand === 'amex') return ['#168f9e', '#117b94', '#0e617d'];
  if (brand === 'hipercard') return ['#9336e8', '#7925cd', '#5d1aaa'];
  if (brand === 'diners') return ['#4e48dd', '#4035c8', '#3026a8'];
  return ['#3d506d', '#344762', '#29394f'];
}

function maskedCardNumber(value: string) {
  const cardNumber = digits(value);
  const lastFour = cardNumber.slice(-4) || '••••';
  return `•••• •••• •••• ${lastFour}`;
}

function CreditCardVisual({
  brand,
  cardNumber,
  holderName,
  expiry,
  cvv,
  masked = false,
  compact = false,
}: {
  brand: PaymentBrand;
  cardNumber: string;
  holderName: string;
  expiry: string;
  cvv: string;
  masked?: boolean;
  compact?: boolean;
}) {
  return <LinearGradient colors={cardGradient(brand)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.creditCardVisual, compact && styles.creditCardVisualCompact]}>
    <View style={styles.creditCardVisualTop}>
      <ThemedText style={styles.creditCardLabel}>CARTÃO DE CRÉDITO</ThemedText>
      <PaymentBrandIcon brand={brand} width={compact ? 38 : 44} height={compact ? 25 : 29} />
    </View>
    <View style={styles.creditCardNumberBlock}>
      <ThemedText style={styles.creditCardHint}>Número do cartão</ThemedText>
      <ThemedText style={[styles.creditCardNumber, compact && styles.creditCardNumberCompact]}>{masked ? maskedCardNumber(cardNumber) : cardNumber || '•••• •••• •••• ••••'}</ThemedText>
    </View>
    <View style={styles.creditCardDataRow}>
      <View style={styles.creditCardDataPrimary}><ThemedText style={styles.creditCardHint}>Titular</ThemedText><ThemedText numberOfLines={1} style={styles.creditCardMeta}>{holderName || 'NOME DO TITULAR'}</ThemedText></View>
      <View style={styles.creditCardData}><ThemedText style={styles.creditCardHint}>CVV</ThemedText><ThemedText style={styles.creditCardMeta}>{cvv || 'CVV'}</ThemedText></View>
      <View style={styles.creditCardData}><ThemedText style={styles.creditCardHint}>Válido até</ThemedText><ThemedText style={styles.creditCardMeta}>{expiry || 'MM/AA'}</ThemedText></View>
    </View>
  </LinearGradient>;
}

function AcceptedBrands() {
  const brands: PaymentBrand[] = ['amex', 'visa', 'diners', 'mastercard', 'hipercard', 'elo'];
  return <View style={styles.acceptedBrands}><ThemedText style={styles.acceptedTitle}>Bandeiras aceitas:</ThemedText><View style={styles.brandRow}>{brands.map((brand) => <PaymentBrandIcon key={brand} brand={brand} width={42} height={27} />)}</View></View>;
}

function InstallmentsScreen({
  brand,
  cardName,
  cardNumber,
  options,
  saving,
  onBack,
  onSelect,
}: {
  brand: PaymentBrand;
  cardName: string;
  cardNumber: string;
  options: InstallmentChoice[];
  saving: boolean;
  onBack: () => void;
  onSelect: (option: InstallmentChoice) => void;
}) {
  return <ThemedView style={styles.container}>
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Parcelamento" onBack={onBack} showSearch={false} showCart />
      <ScrollView contentContainerStyle={styles.installmentsContent} showsVerticalScrollIndicator={false}>
        <View style={styles.installmentCardHeader}>
          <PaymentBrandIcon brand={brand} width={42} height={27} />
          <ThemedText style={styles.installmentCardName}>{`${cardName} com final ${digits(cardNumber).slice(-4)}`}</ThemedText>
        </View>
        <View style={styles.installmentList}>{options.map((option) => <Pressable key={option.count} disabled={saving} onPress={() => onSelect(option)} style={styles.installmentOption}>
          <View style={styles.installmentOptionText}>
            <ThemedText style={styles.installmentCount}>{`${option.count}x ${money(option.value)}`}</ThemedText>
            {option.count > 1 && <ThemedText style={styles.installmentInterest}>{option.hasInterestRate ? 'com juros' : 'sem juros'}</ThemedText>}
          </View>
          <View style={styles.installmentOptionRight}>{option.count > 1 && <ThemedText style={styles.installmentTotal}>{money(option.total)}</ThemedText>}<ChevronRightIcon color="#625d57" size={20} /></View>
        </Pressable>)}</View>
      </ScrollView>
    </SafeAreaView>
  </ThemedView>;
}

function PixPaymentScreen({
  orderValue,
  pixPayload,
  onBack,
}: {
  orderValue: number;
  pixPayload: ParsedPixPayment | null;
  onBack: () => void;
}) {
  const [showQrCode, setShowQrCode] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(10 * 60);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function copyPixCode() {
    const code = pixPayload?.code?.trim();
    if (!code) return;
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function sharePixCode() {
    const code = pixPayload?.code?.trim();
    if (!code) return;
    try {
      await Share.share({ message: code, title: 'Código Pix' });
    } catch {
      // O usuário pode fechar o painel nativo sem concluir o compartilhamento.
    }
  }

  const hasCode = Boolean(pixPayload?.code);
  const hasQrCode = Boolean(pixPayload?.imageUri);

  return <ThemedView style={styles.container}>
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Pagamento PIX" onBack={onBack} showSearch={false} showCart={false} />
      <View style={styles.pixScreen}>
        <ScrollView contentContainerStyle={styles.pixContent} showsVerticalScrollIndicator={false}>
          <View style={styles.pixBrandHeader}><PaymentBrandIcon brand="pix" width={86} height={42} /><ThemedText style={styles.pixBrandTitle}>Pagamento via PIX</ThemedText></View>
          <View style={styles.pixInfoCard}>
            <ThemedText style={styles.pixInfoIcon}>◷</ThemedText>
            <ThemedText style={styles.pixInfoText}>Com o PIX, sua compra é aprovada na hora</ThemedText>
          </View>

          <View style={styles.pixValueCard}>
            <ThemedText style={styles.pixValueLabel}>Valor da compra:</ThemedText>
            <ThemedText style={styles.pixValue}>{money(orderValue)}</ThemedText>
          </View>

          <View style={styles.pixCodeCard}>
            <ThemedText style={styles.pixSectionTitle}>Código PIX</ThemedText>
            <TextInput
              value={pixPayload?.code || 'Aguardando o código Pix...'}
              editable={false}
              selectTextOnFocus={hasCode}
              numberOfLines={1}
              scrollEnabled
              style={[styles.pixCodeField, !hasCode && styles.pixCodePlaceholder]}
            />
          </View>

          <View style={styles.pixActionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copiar código Pix"
              disabled={!hasCode}
              onPress={() => void copyPixCode()}
              style={[styles.pixActionButton, !hasCode && styles.pixActionButtonDisabled]}
            >
              <ThemedText style={styles.pixActionText}>Copiar código</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartilhar código Pix"
              disabled={!hasCode}
              onPress={() => void sharePixCode()}
              style={[styles.pixActionButton, !hasCode && styles.pixActionButtonDisabled]}
            >
              <ThemedText style={styles.pixActionText}>Compartilhar</ThemedText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showQrCode ? 'Ocultar QR Code' : 'Mostrar QR Code'}
            disabled={!hasQrCode}
            onPress={() => setShowQrCode((current) => !current)}
            style={[styles.pixActionButton, styles.pixQrToggle, !hasQrCode && styles.pixActionButtonDisabled]}
          >
            <ThemedText style={styles.pixActionText}>{showQrCode ? 'Ocultar QR Code' : 'Mostrar QR Code'}</ThemedText>
          </Pressable>

          {showQrCode && hasQrCode && <View style={styles.pixQrCard}>
            <Image source={{ uri: pixPayload?.imageUri }} style={styles.pixQrImage} contentFit="contain" />
          </View>}

          <View style={styles.pixInstructionsCard}>
            <ThemedText style={styles.pixSectionTitle}>Como pagar com PIX</ThemedText>
            <ThemedText style={styles.pixInstruction}>• Acesse seu Internet Banking</ThemedText>
            <ThemedText style={styles.pixInstruction}>• Escolha o pagamento via PIX</ThemedText>
            <ThemedText style={styles.pixInstruction}>• Cole o código acima</ThemedText>
          </View>

          <ThemedText style={styles.pixTimer}>Tempo restante: {formatPixTime(remainingSeconds)}</ThemedText>
          <ThemedText style={styles.pixConfirmationText}>O pagamento será processado automaticamente após a confirmação</ThemedText>
        </ScrollView>

        {copied && <View accessibilityLiveRegion="polite" style={styles.pixToast}>
          <ThemedText style={styles.pixToastCheck}>✓</ThemedText>
          <ThemedText style={styles.pixToastText}>Código PIX copiado!</ThemedText>
          <Pressable accessibilityLabel="Fechar aviso" onPress={() => setCopied(false)} style={styles.pixToastClose}>
            <ThemedText style={styles.pixToastCloseText}>×</ThemedText>
          </Pressable>
        </View>}
      </View>
    </SafeAreaView>
  </ThemedView>;
}

function Card({ children }: { children: ReactNode }) { return <ThemedView style={styles.card}>{children}</ThemedView>; }
function CustomerDataSummary({ email, firstName, lastName, phone, birthDate, document, gender, onEdit }: { email: string; firstName: string; lastName: string; phone: string; birthDate: string; document: string; gender: string; onEdit: () => void }) {
  const row = (label: string, value: string) => <View style={styles.customerDataRow}><ThemedText style={styles.customerDataLabel}>{label}</ThemedText><ThemedText style={styles.customerDataValue}>{value || 'Não informado'}</ThemedText></View>;
  return <ThemedView style={[styles.card, styles.customerDataCard]}>
    <ThemedText style={styles.customerDataTitle}>Informe seu e-mail para continuar</ThemedText>
    <View style={styles.customerDataRows}>
      {row('E-mail', email)}
      {row('Nome', `${firstName} ${lastName}`.trim())}
      {row('Telefone com DDD', formatPhoneWithoutCountryCode(phone))}
      {row('Data de nascimento', formatBirthDate(birthDate))}
      {row('CPF', document)}
      {row('Gênero', formatGenderLabel(gender))}
    </View>
    <Pressable onPress={onEdit}><ThemedText style={styles.link}>Editar dados</ThemedText></Pressable>
  </ThemedView>;
}
function CustomerReviewData({ email, firstName, lastName, phone, document }: { email: string; firstName: string; lastName: string; phone: string; document: string }) {
  return <View style={styles.customerReviewData}>
    <ThemedText style={styles.customerReviewValue}>{email}</ThemedText>
    <ThemedText style={styles.customerReviewValue}>{`${firstName} ${lastName}`.trim()}</ThemedText>
		<ThemedText style={styles.customerReviewValue}>{document || 'Não informado'}</ThemedText>
    <ThemedText style={styles.customerReviewValue}>{formatPhoneWithoutCountryCode(phone) || 'Não informado'}</ThemedText>
  </View>;
}
function PickupStoreCard({ option, selected, disabled, onPress }: { option: ShippingOption; selected: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.pickupStoreCard, selected && styles.shippingOptionSelected]}>
    <Radio selected={selected} />
    <View style={styles.shippingOptionDetails}>
      <ThemedText style={styles.pickupStoreName}>{pickupStoreName(option)}</ThemedText>
      {pickupAddressLines(option).map((line, index) => <ThemedText style={styles.bodyText} key={line + index} themeColor="textSecondary">{line}</ThemedText>)}
      <ThemedText style={styles.bodyText} themeColor="textSecondary">{shippingPriceAndEstimate(option)}</ThemedText>
    </View>
  </Pressable>;
}
function Field({ label, value, setValue, placeholder, keyboardType, required = false, error = '', accessory }: { label: string; value: string; setValue: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address'; required?: boolean; error?: string; accessory?: ReactNode }) {
  const isFreeText = !keyboardType || keyboardType === 'default';
  const inputMode = isFreeText ? 'text' : keyboardType === 'email-address' ? 'email' : keyboardType === 'phone-pad' ? 'tel' : 'numeric';
  return <View style={styles.field}><ThemedText style={styles.fieldLabel}>{label + (required ? ' *' : '')}</ThemedText><View style={styles.inputWrap}><TextInput value={value} onChangeText={setValue} placeholder={placeholder || label} keyboardType={keyboardType || 'default'} inputMode={inputMode} autoCapitalize={isFreeText ? 'sentences' : 'none'} autoCorrect={false} spellCheck={false} placeholderTextColor="#96918b" style={[styles.input, accessory ? styles.inputWithAccessory : undefined, error ? styles.inputError : undefined]} />{accessory && <View style={styles.fieldAccessory}>{accessory}</View>}</View>{!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}</View>;
}
function Primary({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  const isLoading = loading ?? title.endsWith('...');
  return <Pressable disabled={isLoading} onPress={onPress} style={styles.primary}>
    {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>{title}</ThemedText>}
  </Pressable>;
}
function Secondary({ title, onPress }: { title: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.secondary}><ThemedText style={styles.secondaryText}>{title}</ThemedText></Pressable>; }
function Radio({ selected }: { selected: boolean }) { return <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>; }
function Summary({ orderForm, shippingPrice }: { orderForm: OrderForm; shippingPrice?: number }) {
  const itemsTotal = orderForm.items.reduce((total, item) => total + item.price * item.quantity, 0);
  const shippingLabel = shippingPrice === undefined ? 'A calcular' : shippingPrice === 0 ? 'Grátis' : money(shippingPrice);
  return <Card><View style={styles.summary}><ThemedText style={styles.bodyText}>Total dos itens</ThemedText><ThemedText style={styles.bodyText}>{money(itemsTotal)}</ThemedText></View><View style={styles.summary}><ThemedText style={styles.bodyText}>Total do frete</ThemedText><ThemedText style={styles.bodyText}>{shippingLabel}</ThemedText></View><View style={[styles.summary, styles.summaryTotal]}><ThemedText style={styles.sectionTitle}>Total</ThemedText><ThemedText style={styles.sectionTitle}>{money(orderForm.value)}</ThemedText></View></Card>;
}
function FreeShippingProgress({ value }: { value: number }) {
  const target = 249;
  const remaining = Math.max(0, target - value);
  const progress = Math.min(1, value / target);
  return <View style={styles.progressCard}><View style={styles.progressLabel}><TruckIcon color="#0a0a0a" size={18} /><ThemedText style={styles.dataLabel}>{remaining > 0 ? 'Faltam ' + money(remaining) + ' para Frete Grátis' : 'Você ganhou Frete Grátis'}</ThemedText></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: (progress * 100 + '%') as `${number}%` }]} /></View></View>;
}
function ReviewHeader({ icon, title }: { icon: 'user' | 'truck' | 'card'; title: string }) {
  return <View style={styles.reviewHeader}>{icon === 'user' && <UserIcon color="#0a0a0a" size={20} />}{icon === 'truck' && <TruckIcon color="#0a0a0a" size={20} />}{icon === 'card' && <CreditCardIcon color="#0a0a0a" size={20} />}<ThemedText style={styles.sectionTitle}>{title}</ThemedText></View>;
}

function GiftCardPaymentSection({ voucher, onVoucherChange, voucherLoading, saving, onApply, appliedGiftCards, orderValue, removingGiftCard, onRemove, voucherMessage, voucherMessageType, onContinue }: { voucher: string; onVoucherChange: (value: string) => void; voucherLoading: boolean; saving: boolean; onApply: () => void; appliedGiftCards: GiftCard[]; orderValue: number; removingGiftCard: string | null; onRemove: (giftCard: GiftCard) => void; voucherMessage: string; voucherMessageType: 'success' | 'error' | null; onContinue: () => void }) {
  const appliedValue = giftCardsTotal(appliedGiftCards);
  const canContinue = appliedGiftCards.length > 0 && giftCardsCoverOrder(appliedGiftCards, orderValue);
  const remainingValue = Math.max(0, orderValue - appliedValue);
  return <View style={styles.paymentCard}>
    <ThemedText style={styles.sectionTitle}>Vale presente</ThemedText>
    <View style={styles.paymentDivider} />
    <View style={styles.inline}>
      <TextInput value={voucher} onChangeText={onVoucherChange} autoCapitalize="characters" autoCorrect={false} placeholder="Insira o código do vale-presente" style={[styles.input, styles.flex]} />
      <Pressable disabled={saving || voucherLoading || !voucher.trim()} onPress={onApply} style={[styles.smallButton, (saving || voucherLoading || !voucher.trim()) && styles.giftCardButtonDisabled]}>
        {voucherLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>Adicionar</ThemedText>}
      </Pressable>
    </View>
    {appliedGiftCards.map((giftCard, index) => <View key={(giftCard.id || giftCard.redemptionCode) + '-' + index} style={styles.giftCardRow}>
      <View style={styles.giftCardDetails}>
        <ThemedText style={styles.giftCardCode}>{giftCard.redemptionCode.toUpperCase()}</ThemedText>
        <ThemedText style={styles.giftCardAmount}>{money(giftCardAppliedValue(giftCard))}</ThemedText>
      </View>
      <Pressable disabled={saving || removingGiftCard === giftCard.redemptionCode} onPress={() => onRemove(giftCard)}>
        <ThemedText style={styles.giftCardRemove}>{removingGiftCard === giftCard.redemptionCode ? 'Removendo...' : 'Remover'}</ThemedText>
      </Pressable>
    </View>)}
    {appliedGiftCards.length > 0 && !canContinue && <ThemedText style={styles.giftCardRemaining}>Pagamento restante de {money(remainingValue)}. Por favor, combine com outra forma de pagamento</ThemedText>}
    {!!voucherMessage && <ThemedText style={voucherMessageType === 'success' ? styles.successText : styles.errorText}>{voucherMessage}</ThemedText>}
    {canContinue && <Pressable disabled={saving || voucherLoading} onPress={onContinue} style={[styles.giftCardContinueButton, (saving || voucherLoading) && styles.giftCardButtonDisabled]}><ThemedText style={styles.buttonText}>Continuar</ThemedText></Pressable>}
  </View>;
}

function GiftCardPaymentReview({ giftCards }: { giftCards: GiftCard[] }) {
  return <View style={styles.giftCardReview}>
    <ThemedText style={styles.giftCardReviewTitle}>Pagamento com vale presente:</ThemedText>
    {giftCards.map((giftCard, index) => <View key={(giftCard.id || giftCard.redemptionCode) + '-review-' + index} style={styles.giftCardReviewRow}>
      <View style={styles.giftCardReviewColumn}>
        <ThemedText style={styles.giftCardReviewLabel}>Código</ThemedText>
        <ThemedText style={styles.giftCardReviewCode}>{giftCard.redemptionCode.toUpperCase()}</ThemedText>
      </View>
      <View style={[styles.giftCardReviewColumn, styles.giftCardReviewColumnRight]}>
        <ThemedText style={styles.giftCardReviewLabel}>Valor</ThemedText>
        <ThemedText style={styles.giftCardReviewValue}>{money(giftCardAppliedValue(giftCard))}</ThemedText>
      </View>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  content: { gap: Spacing.two, paddingVertical: Spacing.two, paddingBottom: 170 },
  checkoutShelfTitle: { fontSize: 16, lineHeight: 22 },
  flex: { flex: 1 },
  emptyCartContent: { gap: Spacing.five, paddingTop: Spacing.three, paddingBottom: 170, marginTop: 40 },
  emptyCartMessage: { alignItems: 'center', gap: 16, paddingHorizontal: Spacing.three },
  emptyCartTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  emptyCartDescription: { maxWidth: 330, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  emptyCartShelfTitle: { fontSize: 16, lineHeight: 22 },
  pageTitle: { fontSize: 16, lineHeight: 21, fontFamily: Fonts.bold, fontWeight: '700' },
  card: { gap: 6, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
  customerDataCard: { gap: 10, padding: 14 },
  customerDataTitle: { fontSize: 15, lineHeight: 20, fontFamily: Fonts.bold, fontWeight: '700' },
  customerDataRows: { gap: 20 },
  customerDataRow: { gap: 1 },
  customerDataLabel: { color: '#6f6c69', fontFamily: Fonts.sans, fontSize: 11, lineHeight: 15 },
  customerDataValue: { color: '#2f2d2b', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 19 },
  customerReviewData: { gap: 2, marginTop: 1, marginBottom: 2 },
  customerReviewValue: { color: '#2f2d2b', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  cardTitle: { fontSize: 15, lineHeight: 20, fontFamily: Fonts.bold, fontWeight: '700' },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  bodyText: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 20, fontWeight: '400' },
  productsCard: { padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
  productBlock: { paddingVertical: Spacing.one },
  productDivider: { marginTop: Spacing.two, paddingTop: Spacing.three, borderTopWidth: 1, borderTopColor: '#ece8e2' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  itemImage: { width: 64, height: 84, borderRadius: 8, backgroundColor: '#e8e8ea' },
  itemDetails: { flex: 1, gap: 5 },
  itemTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one },
  itemName: { flex: 1, fontFamily: Fonts.sans, fontSize: 14, fontWeight: '400' },
  itemBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  quantityControl: { minHeight: 34, flexDirection: 'row', alignItems: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#cfc8bf', overflow: 'hidden' },
  quantityButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { minWidth: 42, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  quantityCount: { minWidth: 14, textAlign: 'center' },
  removeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  giftRow: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: 1, borderTopColor: '#ece8e2', flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  giftCheckbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#aaa49c', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  giftCheckboxSelected: { borderColor: '#0a0a0a', backgroundColor: '#0a0a0a' },
  giftCheck: { color: '#FFFFFF', fontSize: 11, lineHeight: 15 },
  giftText: { flex: 1, fontSize: 11 },
  giftMessage: { padding: Spacing.three, borderRadius: 4, borderWidth: 1, borderColor: '#e5c95a', backgroundColor: '#fffbe7' },
  giftMessageText: { color: '#9a7b2f', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  field: { flex: 1, gap: 4 },
  fieldLabel: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, fontWeight: '400' },
  inputWrap: { position: 'relative' },
  input: { minHeight: 46, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d9d3cc', backgroundColor: '#FFFFFF', fontFamily: Fonts.sans, fontSize: 15, color: '#0a0a0a' },
  appliedCouponInput: { fontFamily: Fonts.bold, fontWeight: '700', textTransform: 'uppercase' },
  inputWithAccessory: { paddingRight: 62 },
  fieldAccessory: { position: 'absolute', right: 8, top: 9, width: 42, height: 27, alignItems: 'center', justifyContent: 'center' },
  inputError: { borderColor: '#ff7772', borderWidth: 1.5 },
  errorText: { color: '#ed6560', fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans },
  successText: { color: '#2f8f5b', fontSize: 12, fontFamily: Fonts.sans },
  couponSuccess: { color: '#2f8f5b', fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 },
  couponError: { color: '#ed6560', fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18 },
  inline: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  select: { minHeight: 46, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#d9d3cc', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectArrow: { fontSize: 20, color: '#625d57', lineHeight: 22 },
  dropdownIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  dropdownIconOpen: { transform: [{ rotate: '-90deg' }] },
  dropdown: { borderWidth: 1, borderColor: '#d9d3cc', borderRadius: 8, backgroundColor: '#FFFFFF' },
  option: { gap: 4, padding: Spacing.three, borderRadius: 8, borderBottomWidth: 1, borderColor: '#d9d3cc', backgroundColor: '#FFFFFF' },
  addressList: { gap: Spacing.two, marginTop: Spacing.two },
  addressOption: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.two, borderRadius: 12, borderWidth: 1, borderColor: '#d9d3cc', backgroundColor: '#ffffff' },
  addressOptionSelected: { borderColor: '#0a0a0a', borderWidth: 2 },
  addressDetails: { flex: 1, gap: 2 },
  addressSummaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  addressSummaryTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  addressSummaryTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  addressDivider: { height: 1, backgroundColor: '#eeeae5' },
  dataLabel: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  link: { color: '#4f4b47', textDecorationLine: 'underline', fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans },
  primary: { minHeight: 48, padding: Spacing.four, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  secondary: { minHeight: 48, padding: Spacing.three, borderRadius: 8, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  secondaryText: { color: '#0a0a0a', fontFamily: Fonts.bold, fontSize: 14, fontWeight: '700' },
  fixedFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: Spacing.two, padding: Spacing.two, paddingTop: 10, paddingBottom: 35, backgroundColor: '#ffffff' },
  orderSuccessContent: { justifyContent: 'center' },
  orderSuccessCard: { alignItems: 'center', gap: Spacing.two, padding: Spacing.five, borderRadius: 16, borderWidth: 1, borderColor: '#e6e1da', backgroundColor: '#FFFFFF' },
  orderSuccessIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e4f5e9' },
  orderSuccessCheck: { color: '#2f8f5b', fontFamily: Fonts.bold, fontSize: 32, lineHeight: 36, fontWeight: '700' },
  orderSuccessTitle: { color: '#2f2d2b', fontFamily: Fonts.bold, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  orderSuccessDescription: { color: '#6f6c69', fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  orderSuccessLabel: { marginTop: Spacing.two, color: '#6f6c69', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  orderSuccessId: { color: '#2f2d2b', fontFamily: Fonts.bold, fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  smallButton: { minHeight: 46, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  buttonText: { color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 13, fontWeight: '700' },
  selected: { borderColor: '#0a0a0a', borderWidth: 2 },
  selectedAddressCard: { gap: Spacing.two },
  shippingCard: { gap: Spacing.two, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
  shippingAddressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pinIcon: { fontSize: 22, color: '#0a0a0a' },
  shippingAddressText: { flex: 1, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  shippingSection: { gap: Spacing.two },
  shippingOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: 10, borderWidth: 1, borderColor: '#b0a69b', backgroundColor: '#FFFFFF' },
  shippingOptionSelected: { borderColor: '#0a0a0a', borderWidth: 2 },
  shippingOptionDetails: { flex: 1, gap: 2 },
  pickupButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: 10, borderWidth: 1, borderColor: '#b0a69b', backgroundColor: '#FFFFFF' },
  pickupSelectedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.two, borderRadius: 10, backgroundColor: '#FFFFFF' },
  pickupStoreCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#b0a69b', backgroundColor: '#FFFFFF' },
  pickupStoreName: { fontFamily: Fonts.bold, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#b0a69b', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#0a0a0a' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0a0a0a' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 },
  summaryTotal: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eeeae5' },
  progressCard: { gap: 8, padding: Spacing.two, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6e1da' },
  progressLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#e3ded5' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#2f8f5b' },
  paymentCard: { gap: 6, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e6e1da', backgroundColor: '#FFFFFF' },
  paymentHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, justifyContent: 'space-between' },
  paymentDivider: { height: 1, backgroundColor: '#eeeae5' },
  giftCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingTop: Spacing.one },
  giftCardDetails: { flex: 1, gap: 1 },
  giftCardCode: { color: '#2f2d2b', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18 },
  giftCardAmount: { color: '#0a0a0a', fontFamily: Fonts.bold, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  giftCardRemove: { color: '#4a82e8', fontFamily: Fonts.bold, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  giftCardRemaining: { color: '#2f2d2b', fontFamily: Fonts.bold, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  giftCardContinueButton: { minHeight: 48, marginTop: Spacing.one, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1b100c' },
  giftCardButtonDisabled: { opacity: 0.5 },
  pixInfo: { gap: Spacing.two, marginTop: Spacing.one, padding: Spacing.three, borderRadius: 8, backgroundColor: '#f5f5f5' },
  pixQrImage: { alignSelf: 'center', width: 240, height: 240, marginVertical: Spacing.two },
  pixCodeInput: { minHeight: 92, textAlignVertical: 'top' },
  pixScreen: { flex: 1, position: 'relative' },
  pixContent: { gap: Spacing.three, paddingHorizontal: Spacing.one, paddingTop: Spacing.three, paddingBottom: Spacing.six },
  pixBrandHeader: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.one },
  pixBrandTitle: { color: '#1e120d', fontFamily: Fonts.bold, fontSize: 15, lineHeight: 20 },
  pixInfoCard: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#f0ece8' },
  pixInfoIcon: { color: '#8b746b', fontSize: 22, lineHeight: 24 },
  pixInfoText: { flex: 1, color: '#6f6c69', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  pixValueCard: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#f0ece8' },
  pixValueLabel: { color: '#77736f', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
  pixValue: { marginLeft: 4, color: '#0a0a0a', fontFamily: Fonts.bold, fontSize: 14, lineHeight: 20 },
  pixCodeCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#f0ece8' },
  pixSectionTitle: { color: '#242321', fontFamily: Fonts.bold, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  pixCodeField: { minHeight: 44, paddingHorizontal: Spacing.two, borderRadius: 6, backgroundColor: '#fafafa', color: '#77736f', fontFamily: Fonts.mono, fontSize: 12, textAlignVertical: 'center' },
  pixCodePlaceholder: { color: '#9a9692', fontFamily: Fonts.sans },
  pixActionRow: { flexDirection: 'row', gap: Spacing.two },
  pixActionButton: { flex: 1, minHeight: 46, paddingHorizontal: Spacing.two, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  pixQrToggle: { flex: 0, alignSelf: 'stretch' },
  pixActionButtonDisabled: { opacity: 0.45 },
  pixActionText: { color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  pixQrCard: { alignSelf: 'center', padding: Spacing.three, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#f0ece8', elevation: 4 },
  pixInstructionsCard: { gap: Spacing.one, padding: Spacing.three, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#f0ece8' },
  pixInstruction: { color: '#77736f', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 22 },
  pixTimer: { color: '#77736f', fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  pixConfirmationText: { paddingHorizontal: Spacing.five, color: '#8d8985', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pixToast: { position: 'absolute', left: Spacing.one, right: Spacing.one, bottom: Spacing.two, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.three, paddingRight: Spacing.one, borderRadius: 8, backgroundColor: '#53c76b', elevation: 5, zIndex: 10 },
  pixToastCheck: { color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 18, lineHeight: 22 },
  pixToastText: { flex: 1, marginLeft: Spacing.two, color: '#FFFFFF', fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  pixToastClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pixToastCloseText: { color: '#FFFFFF', fontFamily: Fonts.sans, fontSize: 22, lineHeight: 24 },
  creditCardVisual: { minHeight: 168, padding: Spacing.three, borderRadius: 10, overflow: 'hidden', justifyContent: 'space-between', gap: Spacing.two },
  creditCardVisualCompact: { width: '100%', height: 'auto', maxWidth: 340, alignSelf: 'center', padding: Spacing.three, borderRadius: 8, gap: Spacing.one },
  creditCardVisualTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creditCardLabel: { color: '#dfe5ee', fontSize: 12, fontFamily: Fonts.sans },
  creditCardHint: { color: 'rgba(255,255,255,0.62)', fontSize: 9, lineHeight: 13, fontFamily: Fonts.sans },
  creditCardNumberBlock: { gap: 2 },
  creditCardNumber: { color: '#FFFFFF', fontSize: 20, lineHeight: 26, letterSpacing: 1, fontFamily: Fonts.sans },
  creditCardNumberCompact: { fontSize: 16, lineHeight: 20, letterSpacing: 0.5 },
  creditCardDataRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  creditCardDataPrimary: { flex: 1, minWidth: 0, gap: 2 },
  creditCardData: { minWidth: 47, gap: 2 },
  creditCardMeta: { color: '#e3e8ef', fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans },
  billingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  billingCheckbox: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  billingCheck: { color: '#FFFFFF', fontSize: 14, lineHeight: 17 },
  billingText: { flex: 1, fontSize: 13, lineHeight: 18 },
  acceptedBrands: { gap: Spacing.two },
  acceptedTitle: { fontSize: 13, color: '#625d57', fontFamily: Fonts.sans },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  reviewDeliveryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  freeText: { color: '#2f9b62', fontFamily: Fonts.sans, fontSize: 13 },
  deliveryText: { color: '#2f9b62', fontFamily: Fonts.sans, fontSize: 12 },
  reviewAddress: { gap: 2, marginTop: Spacing.one, padding: Spacing.two, borderRadius: 8, backgroundColor: '#f8f8f8' },
  reviewItems: { gap: 6 },
  reviewItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  reviewItemImage: { width: 48, height: 62, borderRadius: 4, backgroundColor: '#eeeae5' },
  reviewItemName: { flex: 1, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  paymentReview: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.two },
  paymentReviewCard: { width: '100%', gap: Spacing.two, alignItems: 'center' },
  giftCardReview: { width: '100%', gap: Spacing.two, alignItems: 'stretch' },
  giftCardReviewTitle: { color: '#6f6c69', fontFamily: Fonts.sans, fontSize: 13, lineHeight: 20 },
  giftCardReviewRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 4, backgroundColor: '#f8f8f8' },
  giftCardReviewColumn: { gap: 1, flexShrink: 1 },
  giftCardReviewColumnRight: { alignItems: 'flex-end' },
  giftCardReviewLabel: { color: '#77736f', fontFamily: Fonts.sans, fontSize: 11, lineHeight: 15 },
  giftCardReviewCode: { color: '#2f2d2b', fontFamily: Fonts.mono, fontSize: 13, lineHeight: 18 },
  giftCardReviewValue: { color: '#2f2d2b', fontFamily: Fonts.bold, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  installmentSummary: { width: 'auto', alignSelf: 'center', alignItems: 'center', gap: 2, padding: Spacing.two, borderRadius: 8, backgroundColor: '#FFFFFF' },
  installmentSummaryLabel: { color: '#77736f', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16 },
  installmentSummaryValue: { color: '#0a0a0a', fontFamily: Fonts.bold, fontSize: 14, lineHeight: 19 },
  installmentsContent: { gap: Spacing.three, paddingVertical: Spacing.three, paddingBottom: Spacing.five },
  installmentCardHeader: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: 8, borderWidth: 1, borderColor: '#e6e1da', backgroundColor: '#FFFFFF' },
  installmentCardName: { flex: 1, fontFamily: Fonts.bold, fontSize: 14, lineHeight: 20 },
  installmentList: { gap: Spacing.two },
  installmentOption: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.three, borderRadius: 8, borderWidth: 1, borderColor: '#e6e1da', backgroundColor: '#FFFFFF' },
  installmentOptionText: { flex: 1, gap: 2 },
  installmentCount: { color: '#0a0a0a', fontFamily: Fonts.bold, fontSize: 15, lineHeight: 20 },
  installmentInterest: { color: '#77736f', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16 },
  installmentOptionRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  installmentTotal: { color: '#77736f', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16 },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, backgroundColor: 'rgba(0, 0, 0, 0.62)' },
  modalCard: { width: '100%', maxWidth: 340, gap: Spacing.two, padding: Spacing.four, borderRadius: 6, backgroundColor: '#FFFFFF' },
  modalTitle: { textAlign: 'center', lineHeight: 26, fontSize: 18, marginBottom: Spacing.two, fontFamily: Fonts.bold, fontWeight: '700' },
  modalDeleteButton: { minHeight: 48, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  modalCancelButton: { minHeight: 48, borderRadius: 4, borderWidth: 1, borderColor: '#4c433c', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});

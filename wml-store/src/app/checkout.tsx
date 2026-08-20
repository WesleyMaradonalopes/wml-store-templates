import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import CreditCardIcon from '@/components/icons/CreditCardIcon';
import StoreIcon from '@/components/icons/StoreIcon';
import TrashIcon from '@/components/icons/TrashIcon';
import TruckIcon from '@/components/icons/TruckIcon';
import UserIcon from '@/components/icons/UserIcon';
import Recaptcha, { type RecaptchaHandle } from '@/components/recaptcha';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { getAccountSession } from '@/services/auth';
import { addCouponToCart, addGiftCardToCart, clearCart, getOrderForm, OrderForm, selectPaymentMethod, selectShippingOption, updateCartItem, updateClientProfile, updateShippingAddress, type CartItem } from '@/services/cart';
import { getCustomerAddressesFromMasterData, getCustomerProfileFromMasterData, type CustomerAddress, type CustomerProfile } from '@/services/customer';
import { CheckoutOrderError, getTransactionStatus, placeOrder, type CheckoutOrderResult, type PaymentAppData } from '@/services/orders';

type Step = 'cart' | 'email' | 'customer' | 'address' | 'shipping' | 'payment' | 'card' | 'review';
type CustomerCheckoutData = { profile: CustomerProfile | null; addresses: CustomerAddress[] };
type ShippingOption = NonNullable<OrderForm['shippingData']>['logisticsInfo'][number]['slas'][number];

const DEFAULT_WEB_RECAPTCHA_SITE_KEY = '6LeYIh0qAAAAANOiLphZJNLG5JTHhBZHUPkhJfZU';
const WEB_RECAPTCHA_SITE_KEY = String(
  process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_SITE_KEY || DEFAULT_WEB_RECAPTCHA_SITE_KEY,
).trim();
const CONFIGURED_RECAPTCHA_SITE_KEY = Platform.OS === 'android'
  ? String(process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_ANDROID_SITE_KEY || WEB_RECAPTCHA_SITE_KEY).trim()
  : Platform.OS === 'ios'
    ? String(process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_IOS_SITE_KEY || WEB_RECAPTCHA_SITE_KEY).trim()
    : WEB_RECAPTCHA_SITE_KEY;

function digits(value: string) { return value.replace(/\D/g, ''); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function getRecaptchaSiteKey(orderForm?: OrderForm | null) {
  // Mobile uses the platform key registered in VTEX. Web keeps the existing
  // VTEX key. The backend must receive the key that generated the token.
  return CONFIGURED_RECAPTCHA_SITE_KEY
    || String(orderForm?.recaptchaKeyV3 || orderForm?.recaptchaKey || '').trim();
}
function validPhone(value: string) {
  return /^(?:\d{2} \d{4}-\d{4}|\d{2} \d \d{4}-\d{4})$/.test(value.trim());
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
  const valueDigits = digits(value).slice(0, 11);
  if (valueDigits.length <= 2) return valueDigits;
  const areaCode = valueDigits.slice(0, 2);
  const subscriber = valueDigits.slice(2);
  const isMobile = valueDigits.length > 10 || subscriber.startsWith('9');
  if (isMobile) {
    return areaCode + ' ' + subscriber.slice(0, 1) + (subscriber.length > 1 ? ' ' : '') + subscriber.slice(1, 5) + (subscriber.length > 5 ? '-' + subscriber.slice(5, 9) : '');
  }
  return areaCode + ' ' + subscriber.slice(0, 4) + (subscriber.length > 4 ? '-' + subscriber.slice(4, 8) : '');
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
  const valueDigits = digits(value).slice(0, 16);
  return valueDigits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
function formatExpiry(value: string) {
  const valueDigits = digits(value).slice(0, 4);
  return valueDigits.length > 2 ? valueDigits.slice(0, 2) + '/' + valueDigits.slice(2) : valueDigits;
}
function isShippingStep(step: Step) { return step === 'shipping'; }
function isPickupOption(sla: ShippingOption) { return sla.deliveryChannel === 'pickup-in-point' || sla.isPickupInPoint === true; }
function shippingOptionId(sla: ShippingOption) { return sla.id || sla.name; }
function shippingOptionKey(sla: ShippingOption) {
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
function isCardPayment(method: { name: string; group: string }) {
  const text = (method.name + ' ' + method.group).toLowerCase();
  return text.includes('cart') || text.includes('credit') || text.includes('card');
}
function isPixPayment(method: { name: string; group: string }) {
  return (method.name + ' ' + method.group).toLowerCase().includes('pix');
}
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
  const image = String(parsed.qrCodeBase64Image || parsed.qrCodeBase64 || '').trim();
  const paymentId = String(parsed.paymentId || '').trim();
  const transactionId = String(parsed.transactionId || '').trim();
  return {
    code,
    paymentId,
    transactionId,
    imageUri: image ? (image.startsWith('data:') ? image : 'data:image/png;base64,' + image) : '',
  };
}
function deliveryEstimate(estimate: string) {
  const match = estimate.match(/\d+/);
  return match ? 'Receba em até ' + match[0] + ' dias úteis' : 'Prazo de entrega a confirmar';
}

function getShippingOptions(orderForm: OrderForm): ShippingOption[] {
  const options = new Map<string, ShippingOption>();
  for (const info of orderForm.shippingData?.logisticsInfo ?? []) {
    for (const sla of info.slas) {
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
  return shippingOptionId(firstDelivery || options[0]) || '';
}

function getShippingSelectionId(orderForm: OrderForm, options: ShippingOption[], selectedId?: string | null) {
  if (selectedId && options.some((option) => shippingOptionId(option) === selectedId)) return selectedId;
  return getDefaultShippingOptionId(orderForm, options);
}

export default function CheckoutScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('cart');
  const [orderForm, setOrderForm] = useState<OrderForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
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
  const [cardPaymentSystem, setCardPaymentSystem] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardValidationAttempted, setCardValidationAttempted] = useState(false);
  const [emailValidationAttempted, setEmailValidationAttempted] = useState(false);
  const [customerValidationAttempted, setCustomerValidationAttempted] = useState(false);
  const [addressValidationAttempted, setAddressValidationAttempted] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [voucher, setVoucher] = useState('');
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<CartItem | null>(null);
  const [customerExists, setCustomerExists] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([]);
  const [addressSelectionOpen, setAddressSelectionOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [orderResult, setOrderResult] = useState<CheckoutOrderResult | null>(null);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState(CONFIGURED_RECAPTCHA_SITE_KEY);
  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const genders = ['Feminino', 'Masculino', 'Prefiro não informar', 'Outro'];
  const customerDataRequests = useRef(new Map<string, Promise<CustomerCheckoutData>>()).current;

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
      const loggedEmail = session?.email?.trim().toLowerCase() ?? '';
      setEmail(loggedEmail);
      setFirstName(''); setLastName(''); setDocument(''); setPhone(''); setGender('');
      setCustomerExists(false); setEditingCustomer(false);
      setCustomerAddresses([]); setAddressSaved(false); setEditingAddress(false);
      setLoading(false);
      if (!loggedEmail) return;
      const { profile: customer, addresses } = await loadCustomerData(loggedEmail);
      if (!active) return;
      setEmail(loggedEmail);
      if (customer) {
        setCustomerExists(true);
        applyProfile(customer, loggedEmail);
      }
      setCustomerAddresses(addresses);
      const preferred = addresses.find((item) => item.postalCode && item.street);
      if (preferred) applyAddress(preferred);
    }).catch(() => { if (active) setMessage('Não foi possível carregar o carrinho.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

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
    const previous: Record<Step, Step | null> = { cart: null, email: 'cart', customer: 'email', address: 'customer', shipping: 'address', payment: 'shipping', card: 'payment', review: 'payment' };
    const target = previous[step];
    if (target) setStep(target); else router.back();
  }

  function applyProfile(profile: CustomerProfile, fallbackEmail = '') {
    setEmail(fallbackEmail || profile.email || '');
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
    setDocument(formatCpf(profile.document || ''));
    setPhone(formatPhone(profile.phone || profile.homePhone || ''));
    setGender(profile.gender || '');
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
      setOrderForm(await updateClientProfile({
        orderFormId: orderForm.orderFormId,
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        document: digits(document),
        phone: digits(phone),
        gender: gender || undefined,
      }));
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

  async function continueWithEmail() {
    setEmailValidationAttempted(true);
    if (!validEmail(email)) return;
    setSaving(true);
    setMessage('');
    try {
      const { profile, addresses } = await loadCustomerData(email);
      if (profile) {
        setCustomerExists(true); setEditingCustomer(false); applyProfile(profile, email);
        setCustomerAddresses(addresses);
        const preferred = addresses.find((item) => item.postalCode && item.street);
        if (preferred) applyAddress(preferred);
        setStep('customer');
      } else {
        setCustomerExists(false); setEditingCustomer(true); setFirstName(''); setLastName(''); setDocument(''); setPhone(''); setGender('');
        setCustomerAddresses([]); setAddressSaved(false); setCustomerValidationAttempted(false); setStep('customer');
      }
    } catch {
      setCustomerExists(false); setEditingCustomer(true); setCustomerValidationAttempted(false); setStep('customer');
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

  function openCardPayment(method: { id: string; name: string }) {
    setCardPaymentSystem(method.id);
    setSelectedPayment(method.id);
    setSelectedPaymentLabel(method.name || 'Cartão de crédito');
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
    setSelectedPayment(paymentSystem);
    setSelectedPaymentLabel(label);
    setSaving(true);
    setMessage('');
    try {
      const updatedOrderForm = await selectPaymentMethod({ orderFormId: orderForm.orderFormId, paymentSystem, value: orderForm.value });
      setOrderForm(updatedOrderForm);
      const requestedSiteKey = getRecaptchaSiteKey(updatedOrderForm);
      if (requestedSiteKey) setRecaptchaSiteKey(requestedSiteKey);
      setStep('review');
    } catch {
      setMessage('Não foi possível selecionar esta forma de pagamento.');
    } finally {
      setSaving(false);
    }
  }

  function continueWithCard() {
    setCardValidationAttempted(true);
    if (Object.values(getCardErrors()).some(Boolean)) return;
    void choosePayment(cardPaymentSystem || '1', 'Cartão de crédito');
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
        optinNewsLetter: false,
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
    if (!orderForm || !coupon.trim()) return;
    setSaving(true);
    try {
      setOrderForm(await addCouponToCart(orderForm.orderFormId, coupon.trim()));
      setMessage('Cupom aplicado.');
    } catch {
      setMessage('Cupom inválido.');
    } finally {
      setSaving(false);
    }
  }

  async function applyVoucher() {
    if (!orderForm || !voucher.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      setOrderForm(await addGiftCardToCart(orderForm.orderFormId, voucher.trim()));
      setVoucherApplied(true);
      setMessage('Vale-presente adicionado.');
    } catch {
      setVoucherApplied(false);
      setMessage('Não foi possível adicionar o vale-presente.');
    } finally {
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
      setOrderForm(await updateCartItem({ orderFormId: previousOrderForm.orderFormId, index: currentItem.index, itemId, sellerId: currentItem.seller, quantity: nextQuantity }));
    } catch (error) {
      setOrderForm(previousOrderForm);
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o produto.');
    } finally {
      setUpdatingItem(null);
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
  if (orderForm.items.length === 0) return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Carrinho" onBack={() => router.replace('/')} showSearch={false} showCart /><View style={styles.emptyState}><ThemedText type="subtitle">Seu carrinho está vazio</ThemedText><ThemedText themeColor="textSecondary">Encontre produtos para continuar sua compra.</ThemedText><Primary title="Encontrar produtos" onPress={() => router.replace('/')} /></View></SafeAreaView></ThemedView>;

  if (orderResult) {
    const pixPayload = parsePaymentAppPayload(orderResult.paymentApp);
    const isCompleted = orderResult.status === 'completed';
    const isPending = orderResult.status === 'pending_payment';
    const title = isCompleted
      ? 'Pedido realizado'
      : isPending
        ? 'Pagamento pendente'
        : 'Pagamento não autorizado';
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Resultado do pedido" onBack={() => router.replace('/')} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}>
      <View style={styles.paymentReview}>
        <ThemedText style={styles.pageTitle}>{title}</ThemedText>
        <ThemedText style={isCompleted ? styles.successText : isPending ? styles.bodyText : styles.errorText}>
          {orderResult.message || (isCompleted ? 'Seu pedido foi enviado para processamento.' : 'A VTEX não confirmou o pagamento.')}
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
      {!isCompleted && !isPending && <ThemedText style={styles.errorText}>A transação foi criada, mas o pedido não deve ser considerado aprovado. Você pode tentar novamente após revisar a configuração do provedor de pagamento.</ThemedText>}
    </ScrollView><View style={styles.fixedFooter}>
      {isCompleted && <Primary title="Voltar para a loja" onPress={() => router.replace('/')} />}
      {isPending && <Secondary title="Voltar para a loja" onPress={() => router.replace('/')} />}
      {!isCompleted && !isPending && <Primary title="Tentar novamente" onPress={() => { setOrderResult(null); setMessage(''); setStep('payment'); }} />}
    </View></SafeAreaView></ThemedView>;
  }

  const slas = getShippingOptions(orderForm);
  const selectedShippingId = getShippingSelectionId(orderForm, slas, selectedSla);
  const selectedShipping = slas.find((sla) => (sla.id || sla.name) === selectedShippingId);
  const deliveryOptions = slas.filter((sla) => !isPickupOption(sla));
  const pickupOptions = slas.filter(isPickupOption);
  const selectedPickup = pickupOptions.find((sla) => shippingOptionId(sla) === selectedShippingId);

  if (step === 'address' && addressSelectionOpen && customerAddresses.length > 1) {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Entrega" onBack={() => setAddressSelectionOpen(false)} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}>
      <ThemedText style={styles.pageTitle}>Selecione um endereço para entrega</ThemedText>
      <View style={styles.addressList}>{customerAddresses.map((address) => {
        const addressId = String(address.id || (address.postalCode || '') + '-' + (address.street || '') + '-' + (address.number || ''));
        const selected = selectedAddressId === addressId;
        return <Pressable key={addressId} onPress={() => { applyAddress(address); setAddressSelectionOpen(false); }} style={[styles.addressOption, selected && styles.addressOptionSelected]}><Radio selected={selected} /><View style={styles.addressDetails}><ThemedText>{address.street + ', ' + address.number + (address.complement ? ' - ' + address.complement : '')}</ThemedText><ThemedText themeColor="textSecondary">{address.neighborhood + ' - ' + address.city + '/' + address.state}</ThemedText><ThemedText themeColor="textSecondary">CEP: {address.postalCode}</ThemedText></View></Pressable>;
      })}</View>
    </ScrollView><View style={styles.fixedFooter}><Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={continueWithSavedAddress} /><Secondary title="Alterar endereço de entrega" onPress={() => { setAddressSelectionOpen(false); setEditingAddress(true); }} /></View></SafeAreaView></ThemedView>;
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
              <View style={styles.shippingOptionDetails}><ThemedText style={styles.dataLabel}>{sla.name}{sla.price === 0 ? ' - Grátis' : ''}</ThemedText><ThemedText themeColor="textSecondary">{sla.price === 0 ? 'Grátis' : money(sla.price)} · {sla.shippingEstimate || 'Prazo a confirmar'}</ThemedText></View>
            </Pressable>;
          })}
        </View>}

        {pickupOptions.length > 0 && <View style={styles.shippingSection}>
          <ThemedText style={styles.sectionTitle}>Retirada</ThemedText>
          {selectedPickup ? <Pressable onPress={() => setPickupSelectionOpen(true)} disabled={saving} style={[styles.pickupSelectedCard, styles.shippingOptionSelected]}>
            <StoreIcon color="#0a0a0a" size={22} />
            <View style={styles.shippingOptionDetails}>
              <ThemedText style={styles.dataLabel}>{pickupStoreName(selectedPickup)}</ThemedText>
              {pickupAddressLines(selectedPickup).map((line, index) => <ThemedText key={line + index} themeColor="textSecondary">{line}</ThemedText>)}
              <ThemedText themeColor="textSecondary">{selectedPickup.price === 0 ? 'Grátis' : money(selectedPickup.price)} · {selectedPickup.shippingEstimate || 'Prazo a confirmar'}</ThemedText>
              <ThemedText style={styles.link}>Alterar loja</ThemedText>
            </View>
            <ChevronRightIcon color="#625d57" size={20} />
          </Pressable> : <Pressable onPress={() => setPickupSelectionOpen(true)} disabled={saving} style={styles.pickupButton}>
            <StoreIcon color="#0a0a0a" size={22} />
            <View style={styles.shippingOptionDetails}><ThemedText style={styles.dataLabel}>Retirar em loja</ThemedText><ThemedText themeColor="textSecondary">Escolha uma das {pickupOptions.length} lojas disponíveis</ThemedText></View>
            <ChevronRightIcon color="#625d57" size={20} />
          </Pressable>}
        </View>}

        {slas.length === 0 && <ThemedText themeColor="textSecondary">Nenhuma forma de entrega disponível.</ThemedText>}
        {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
      </ThemedView>
    </ScrollView><Modal visible={pickupSelectionOpen} animationType="slide" onRequestClose={() => setPickupSelectionOpen(false)}><ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Retirar em loja" onBack={() => setPickupSelectionOpen(false)} showSearch={false} showCart={false} /><ScrollView contentContainerStyle={styles.content}><ThemedText style={styles.pageTitle}>Escolha a loja para retirada</ThemedText><ThemedText themeColor="textSecondary">Selecione onde deseja retirar seu pedido.</ThemedText>{pickupOptions.map((option) => <PickupStoreCard key={shippingOptionKey(option)} option={option} selected={shippingOptionId(option) === selectedShippingId} disabled={saving} onPress={() => choosePickupStore(option)} />)}</ScrollView></SafeAreaView></ThemedView></Modal><View style={styles.fixedFooter}><Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={continueWithShipping} /><Secondary title="Alterar endereço de entrega" onPress={openAddressSelection} /></View></SafeAreaView></ThemedView>;
  }

  if (step === 'address' && addressSaved && !editingAddress) {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Entrega" onBack={back} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}><ThemedText style={styles.pageTitle}>Endereço de entrega</ThemedText><ThemedView style={[styles.shippingCard, styles.selectedAddressCard]}><View style={styles.shippingAddressRow}><Radio selected /><View style={styles.addressDetails}><ThemedText style={styles.dataLabel}>Enviar para {street}, {number}</ThemedText><ThemedText>{receiverName}</ThemedText><ThemedText>{neighborhood} - {city}/{state}</ThemedText><ThemedText themeColor="textSecondary">CEP: {postalCode}</ThemedText></View></View><Pressable onPress={openAddressSelection}><ThemedText style={styles.link}>{customerAddresses.length > 1 ? 'Alterar ou escolher outro endereço' : 'Alterar endereço'}</ThemedText></Pressable></ThemedView></ScrollView><View style={styles.fixedFooter}><Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={continueWithSavedAddress} /><Secondary title="Alterar endereço de entrega" onPress={openAddressSelection} /></View></SafeAreaView></ThemedView>;
  }

  const payments = orderForm.paymentData?.paymentSystems ?? [];
  const cardMethod = payments.find(isCardPayment);
  const pixMethod = payments.find(isPixPayment);
  const title: Record<Step, string> = { cart: 'Carrinho', email: 'Dados pessoais', customer: 'Dados pessoais', address: 'Entrega', shipping: 'Entrega', payment: 'Pagamento', card: 'Cartão de crédito', review: 'Revise e confirme' };
  const customerErrors = getCustomerErrors();
  const addressErrors = getAddressErrors();
  const cardErrors = getCardErrors();

  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title={title[step]} onBack={back} showSearch={false} showCart />{recaptchaSiteKey && (step === 'payment' || step === 'card' || step === 'review') && <Recaptcha ref={recaptchaRef} siteKey={recaptchaSiteKey} />}<ScrollView contentContainerStyle={styles.content}>
    {step === 'cart' && <><ThemedView style={styles.productsCard}>{orderForm.items.map((item, position) => <View key={item.id + '-' + item.index} style={[styles.productBlock, position > 0 && styles.productDivider]}><View style={styles.itemRow}>{!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />}<View style={styles.itemDetails}><View style={styles.itemTopRow}><ThemedText style={styles.itemName}>{item.name}</ThemedText><Pressable accessibilityLabel={'Remover ' + item.name} disabled={Boolean(updatingItem)} onPress={() => setPendingRemoval(item)} style={styles.removeButton}><TrashIcon size={20} color="#65666E" /></Pressable></View><ThemedText style={styles.dataLabel}>{money(item.price)}</ThemedText><View style={styles.itemBottomRow}><View style={styles.quantityControl}><Pressable disabled={Boolean(updatingItem) || item.quantity <= 1} onPress={() => changeItemQuantity(item.index, item.id, item.quantity - 1)} style={styles.quantityButton}><ThemedText>−</ThemedText></Pressable><View style={styles.quantityValue}>{updatingItem === item.id ? <ActivityIndicator size="small" color="#65666E" /> : <ThemedText style={styles.quantityCount}>{item.quantity}</ThemedText>}</View><Pressable disabled={Boolean(updatingItem)} onPress={() => changeItemQuantity(item.index, item.id, item.quantity + 1)} style={styles.quantityButton}><ThemedText>+</ThemedText></Pressable></View></View></View></View></View>)}<Pressable onPress={() => setGiftWrap((value) => !value)} style={styles.giftRow}><View style={[styles.giftCheckbox, giftWrap && styles.giftCheckboxSelected]}>{giftWrap && <ThemedText style={styles.giftCheck}>✓</ThemedText>}</View><ThemedText style={styles.giftText}>Incluir uma embalagem de presente para o pedido</ThemedText></Pressable></ThemedView><ThemedView style={styles.card}><ThemedText style={styles.cardTitle}>Cupom de desconto</ThemedText><View style={styles.inline}><TextInput value={coupon} onChangeText={setCoupon} placeholder="Insira o código" style={[styles.input, styles.flex]} /><Pressable onPress={applyCoupon} style={styles.smallButton}><ThemedText style={styles.buttonText}>Adicionar</ThemedText></Pressable></View></ThemedView><FreeShippingProgress value={orderForm.value} /><Summary orderForm={orderForm} /></>}
    {step === 'email' && <Card><ThemedText style={styles.cardTitle}>Informe seu e-mail para continuar</ThemedText><ThemedText themeColor="textSecondary">Vamos verificar se você já fez alguma compra com a gente.</ThemedText><Field label="E-mail" value={email} setValue={setEmail} required placeholder="Digite seu email" keyboardType="email-address" error={emailValidationAttempted && !validEmail(email) ? 'E-mail inválido' : ''} /></Card>}
    {step === 'customer' && <>{customerExists && !editingCustomer ? <Card><ThemedText style={styles.cardTitle}>Informe seu e-mail para continuar</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">Vamos verificar se você já fez alguma compra com a gente</ThemedText><ThemedText style={styles.dataLabel}>E-mail</ThemedText><ThemedText style={styles.bodyText}>{email}</ThemedText><ThemedText style={styles.dataLabel}>Nome</ThemedText><ThemedText style={styles.bodyText}>{firstName + ' ' + lastName}</ThemedText><ThemedText style={styles.dataLabel}>Telefone com DDD</ThemedText><ThemedText style={styles.bodyText}>{phone || 'Não informado'}</ThemedText><ThemedText style={styles.dataLabel}>CPF</ThemedText><ThemedText style={styles.bodyText}>{document || 'Não informado'}</ThemedText><ThemedText style={styles.dataLabel}>Gênero</ThemedText><ThemedText style={styles.bodyText}>{gender || 'Não informado'}</ThemedText><Pressable onPress={() => setEditingCustomer(true)}><ThemedText style={styles.link}>Editar dados</ThemedText></Pressable></Card> : <Card><ThemedText style={styles.cardTitle}>Informe seu e-mail para continuar</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">Vamos verificar se você já fez alguma compra com a gente</ThemedText><Field label="E-mail" value={email} setValue={setEmail} required placeholder="Digite seu email" keyboardType="email-address" error={customerValidationAttempted ? customerErrors.email : ''} /><Field label="Nome" value={firstName} setValue={setFirstName} required placeholder="Nome" error={customerValidationAttempted ? customerErrors.firstName : ''} /><Field label="Sobrenome" value={lastName} setValue={setLastName} required placeholder="Sobrenome" error={customerValidationAttempted ? customerErrors.lastName : ''} /><Field label="Telefone com DDD" value={phone} setValue={(value) => setPhone(formatPhone(value))} required placeholder="11 99999-9999" keyboardType="phone-pad" error={customerValidationAttempted ? customerErrors.phone : ''} /><Field label="CPF" value={document} setValue={(value) => setDocument(formatCpf(value))} required placeholder="000.000.000-00" keyboardType="numeric" error={customerValidationAttempted ? customerErrors.document : ''} /><View style={styles.field}><ThemedText style={styles.fieldLabel}>Gênero</ThemedText><Pressable onPress={() => setGenderOpen((value) => !value)} style={styles.select}><ThemedText style={styles.bodyText} themeColor="textSecondary">{gender || 'Selecione seu gênero'}</ThemedText><View style={[styles.dropdownIcon, genderOpen && styles.dropdownIconOpen]}><ChevronRightIcon color="#625d57" size={16} /></View></Pressable>{genderOpen && <View style={styles.dropdown}>{genders.map((option) => <Pressable key={option} onPress={() => { setGender(option); setGenderOpen(false); }} style={styles.option}><ThemedText style={styles.bodyText}>{option}</ThemedText></Pressable>)}</View>}</View></Card>}{!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}</>}
    {step === 'address' && (addressSaved && !editingAddress ? <Card><ThemedText style={styles.cardTitle}>Endereço de entrega</ThemedText><ThemedText>{receiverName}</ThemedText><ThemedText>{street + ', ' + number + (complement ? ' - ' + complement : '')}</ThemedText><ThemedText>{neighborhood + ' - ' + city + '/' + state}</ThemedText><ThemedText>CEP: {postalCode}</ThemedText><Pressable onPress={openAddressSelection}><ThemedText style={styles.link}>{customerAddresses.length > 1 ? 'Alterar ou escolher outro endereço' : 'Alterar endereço'}</ThemedText></Pressable></Card> : <Card><ThemedText style={styles.cardTitle}>Endereço de entrega</ThemedText><Field label="CEP" value={postalCode} setValue={lookupCep} required placeholder="00000-000" keyboardType="numeric" error={addressValidationAttempted ? addressErrors.postalCode : ''} /><Field label="Endereço" value={street} setValue={setStreet} required placeholder="Endereço" error={addressValidationAttempted ? addressErrors.street : ''} /><View style={styles.inline}><Field label="Número" value={number} setValue={setNumber} required placeholder="Número" error={addressValidationAttempted ? addressErrors.number : ''} /><Field label="Complemento" value={complement} setValue={setComplement} placeholder="Complemento" /></View><Field label="Bairro" value={neighborhood} setValue={setNeighborhood} required placeholder="Bairro" error={addressValidationAttempted ? addressErrors.neighborhood : ''} /><View style={styles.inline}><Field label="Cidade" value={city} setValue={setCity} required placeholder="Cidade" error={addressValidationAttempted ? addressErrors.city : ''} /><Field label="Estado" value={state} setValue={setState} required placeholder="Estado" error={addressValidationAttempted ? addressErrors.state : ''} /></View><Field label="Quem irá receber?" value={receiverName} setValue={setReceiverName} required placeholder="Nome do recebedor" error={addressValidationAttempted ? addressErrors.receiverName : ''} />{!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}</Card>)}
    {step === 'payment' && <><ThemedText style={styles.pageTitle}>Escolha como pagar</ThemedText><Pressable disabled={saving} onPress={() => openCardPayment(cardMethod || { id: '1', name: 'Cartão de crédito' })} style={styles.paymentCard}><View style={styles.paymentHeader}><CreditCardIcon color="#0a0a0a" size={21} /><ThemedText style={styles.sectionTitle}>Cartão de Crédito</ThemedText></View><View style={styles.paymentDivider} /><ThemedText style={styles.bodyText} themeColor="textSecondary">+ novo cartão</ThemedText></Pressable><View style={styles.paymentCard}><ThemedText style={styles.sectionTitle}>Vale presente</ThemedText>{!voucherOpen ? <Pressable onPress={() => setVoucherOpen(true)} style={styles.voucherTrigger}><ThemedText style={styles.sectionTitle}>{voucherApplied ? 'Vale presente adicionado' : 'Adicionar vale presente'}</ThemedText></Pressable> : <><View style={styles.paymentDivider} /><View style={styles.inline}><TextInput value={voucher} onChangeText={(text) => setVoucher(text.normalize('NFC'))} autoCapitalize="characters" placeholder="Insira o código do vale-presente" style={[styles.input, styles.flex]} /><Pressable disabled={saving} onPress={applyVoucher} style={styles.smallButton}><ThemedText style={styles.buttonText}>Adicionar</ThemedText></Pressable></View>{voucherApplied && <ThemedText style={styles.successText}>Vale-presente adicionado.</ThemedText>}</>}</View>{!!message && <ThemedText style={message.includes('adicionado') ? styles.successText : styles.errorText}>{message}</ThemedText>}<Pressable disabled={saving} onPress={() => pixMethod ? choosePayment(pixMethod.id, pixMethod.name || 'Pix') : setMessage('Pix não está disponível para este carrinho.')} style={styles.paymentCard}><ThemedText style={styles.sectionTitle}>Pix</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">Pagamento instantâneo</ThemedText><View style={styles.pixInfo}><ThemedText style={styles.pixWord}>pix</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">O código Pix será exibido na próxima etapa, após a revisão do seu pedido.</ThemedText></View></Pressable></>}
    {step === 'card' && <><View style={styles.creditCardVisual}><ThemedText style={styles.creditCardLabel}>CARTÃO DE CRÉDITO</ThemedText><ThemedText style={styles.creditCardNumber}>{cardNumber ? cardNumber : '•••• •••• •••• ••••'}</ThemedText><View style={styles.creditCardBottom}><ThemedText style={styles.creditCardMeta}>{cardHolder || 'NOME DO TITULAR'}</ThemedText><ThemedText style={styles.creditCardMeta}>{cardExpiry || 'MM/AA'}</ThemedText><ThemedText style={styles.creditCardMeta}>{cardCvv ? 'CVV' : 'CVV'}</ThemedText></View></View><Card><Field label="Número do cartão" value={cardNumber} setValue={(value) => setCardNumber(formatCardNumber(value))} required placeholder="Insira o número do seu cartão" keyboardType="numeric" error={cardValidationAttempted ? cardErrors.number : ''} /><Field label="Nome impresso no cartão" value={cardHolder} setValue={setCardHolder} required placeholder="Nome impresso no cartão" error={cardValidationAttempted ? cardErrors.holder : ''} /><View style={styles.inline}><Field label="Validade" value={cardExpiry} setValue={(value) => setCardExpiry(formatExpiry(value))} required placeholder="MM/AA" keyboardType="numeric" error={cardValidationAttempted ? cardErrors.expiry : ''} /><Field label="CVV" value={cardCvv} setValue={setCardCvv} required placeholder="CVV" keyboardType="numeric" error={cardValidationAttempted ? cardErrors.cvv : ''} /></View><ThemedText style={styles.cardTitle}>Endereço de cobrança</ThemedText><Pressable onPress={() => undefined} style={styles.billingRow}><View style={styles.billingCheckbox}><ThemedText style={styles.billingCheck}>✓</ThemedText></View><ThemedText style={styles.billingText}>O endereço da fatura é {street + ', ' + number + ' - ' + neighborhood + ', ' + city + ' - ' + state}</ThemedText></Pressable></Card><ThemedText style={styles.acceptedTitle}>Bandeiras aceitas:</ThemedText><View style={styles.brandRow}><BrandBadge label="AMEX" color="#2c77b8" /><BrandBadge label="VISA" color="#1e4c9a" /><BrandBadge label="elo" color="#2e9ba3" /><BrandBadge label="MasterCard" color="#9c2020" /><BrandBadge label="Hipercard" color="#c52b2b" /><BrandBadge label="elo" color="#f2a900" /></View>{!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}</>}
    {step === 'review' && <><ThemedText style={styles.pageTitle}>Revise e confirme</ThemedText><Summary orderForm={orderForm} shippingPrice={selectedShipping?.price} /><Card><ReviewHeader icon="user" title="DADOS PESSOAIS" /><ThemedText style={styles.bodyText}>{email}</ThemedText><ThemedText style={styles.bodyText}>{firstName + ' ' + lastName}</ThemedText><ThemedText style={styles.bodyText}>{phone}</ThemedText><ThemedText style={styles.bodyText}>{document}</ThemedText><Pressable onPress={() => { setEditingCustomer(true); setStep('customer'); }}><ThemedText style={styles.link}>ALTERAR</ThemedText></Pressable></Card><Card><View style={styles.reviewDeliveryTop}><ReviewHeader icon="truck" title="ENTREGA" /><ThemedText style={styles.freeText}>{selectedShipping?.price === 0 ? 'Grátis' : money(selectedShipping?.price || 0)}</ThemedText></View><ThemedText style={styles.bodyText}>{selectedPickup ? pickupStoreName(selectedPickup) : selectedShipping?.name || 'Entrega selecionada'}</ThemedText><ThemedText style={styles.deliveryText}>◷ {selectedPickup ? 'Retire em ' + (selectedShipping?.shippingEstimate || 'prazo a confirmar') : deliveryEstimate(selectedShipping?.shippingEstimate || '')}</ThemedText><View style={styles.reviewAddress}><ThemedText style={styles.sectionTitle}>{selectedPickup ? 'Loja para retirada' : 'Endereço de Entrega'}</ThemedText>{selectedPickup ? pickupAddressLines(selectedPickup).map((line, index) => <ThemedText key={line + index} style={styles.bodyText}>{line}</ThemedText>) : <><ThemedText style={styles.bodyText}>{street + ', ' + number}</ThemedText><ThemedText style={styles.bodyText}>{neighborhood + ', ' + city + ' - ' + state}</ThemedText><ThemedText style={styles.bodyText}>CEP: {postalCode}</ThemedText></>}</View><View style={styles.reviewItems}>{orderForm.items.map((item) => <View key={item.id + '-' + item.index + '-review'} style={styles.reviewItem}>{!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.reviewItemImage} />}<ThemedText style={styles.reviewItemName}>{item.name + ' ' + item.quantity + ' un.'}</ThemedText></View>)}</View><Pressable onPress={() => setStep('shipping')}><ThemedText style={styles.link}>ALTERAR</ThemedText></Pressable></Card><Card><ReviewHeader icon="card" title="PAGAMENTO" /><View style={styles.paymentReview}><ThemedText style={styles.pixWord}>{selectedPaymentLabel.toLowerCase().includes('pix') ? 'pix' : '▣'}</ThemedText><ThemedText style={styles.bodyText}>{selectedPaymentLabel || 'Pagamento selecionado'}</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">{selectedPaymentLabel.toLowerCase().includes('pix') ? 'Aprovação imediata' : 'Cartão de crédito'}</ThemedText></View><Pressable onPress={() => setStep('payment')}><ThemedText style={styles.link}>ALTERAR</ThemedText></Pressable></Card>{!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}</>}
  </ScrollView><Modal visible={Boolean(pendingRemoval)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPendingRemoval(null)}><View style={styles.modalOverlay}><ThemedView style={styles.modalCard}><ThemedText style={styles.modalTitle}>Deseja remover {pendingRemoval?.name} do carrinho?</ThemedText><Pressable disabled={Boolean(updatingItem)} onPress={confirmItemRemoval} style={styles.modalDeleteButton}><ThemedText style={styles.buttonText}>Excluir</ThemedText></Pressable><Pressable onPress={() => setPendingRemoval(null)} style={styles.modalCancelButton}><ThemedText style={styles.dataLabel}>Cancelar</ThemedText></Pressable></ThemedView></View></Modal><View style={styles.fixedFooter}>{step === 'cart' && <Primary title="Finalizar compra" onPress={() => setStep('email')} />}{step === 'email' && <Primary title={saving ? 'Consultando...' : 'Continuar'} onPress={continueWithEmail} />}{step === 'customer' && <Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={customerExists && !editingCustomer ? continueCustomer : saveCustomer} />}{step === 'address' && <Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={addressSaved && !editingAddress ? continueWithSavedAddress : saveAddress} />}{step === 'card' && <Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={continueWithCard} />}{step === 'review' && <Primary title={saving ? 'Enviando...' : 'Finalizar Compra'} onPress={finishOrder} />}</View></SafeAreaView></ThemedView>;
}

function Card({ children }: { children: ReactNode }) { return <ThemedView style={styles.card}>{children}</ThemedView>; }
function PickupStoreCard({ option, selected, disabled, onPress }: { option: ShippingOption; selected: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.pickupStoreCard, selected && styles.shippingOptionSelected]}>
    <Radio selected={selected} />
    <View style={styles.shippingOptionDetails}>
      <ThemedText style={styles.pickupStoreName}>{pickupStoreName(option)}</ThemedText>
      {pickupAddressLines(option).map((line, index) => <ThemedText key={line + index} themeColor="textSecondary">{line}</ThemedText>)}
      <ThemedText themeColor="textSecondary">{option.price === 0 ? 'Grátis' : money(option.price)} · {option.shippingEstimate || 'Prazo a confirmar'}</ThemedText>
    </View>
  </Pressable>;
}
function Field({ label, value, setValue, placeholder, keyboardType, required = false, error = '' }: { label: string; value: string; setValue: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address'; required?: boolean; error?: string }) {
  const isFreeText = !keyboardType || keyboardType === 'default';
  const inputMode = isFreeText ? 'text' : keyboardType === 'email-address' ? 'email' : keyboardType === 'phone-pad' ? 'tel' : 'numeric';
  return <View style={styles.field}><ThemedText style={styles.fieldLabel}>{label + (required ? ' *' : '')}</ThemedText><TextInput value={value} onChangeText={setValue} placeholder={placeholder || label} keyboardType={keyboardType || 'default'} inputMode={inputMode} autoCapitalize={isFreeText ? 'sentences' : 'none'} autoCorrect={false} spellCheck={false} placeholderTextColor="#96918b" style={[styles.input, error && styles.inputError]} />{!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}</View>;
}
function Primary({ title, onPress }: { title: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.primary}><ThemedText style={styles.buttonText}>{title}</ThemedText></Pressable>; }
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
  return <View style={styles.progressCard}><ThemedText style={styles.dataLabel}>{remaining > 0 ? 'Faltam ' + money(remaining) + ' para Frete Grátis' : 'Frete grátis desbloqueado'}</ThemedText><View style={styles.progressTrack}><View style={[styles.progressFill, { width: (progress * 100 + '%') as `${number}%` }]} /></View></View>;
}
function BrandBadge({ label, color }: { label: string; color: string }) { return <View style={[styles.brandBadge, { backgroundColor: color }]}><ThemedText style={styles.brandText}>{label}</ThemedText></View>; }
function ReviewHeader({ icon, title }: { icon: 'user' | 'truck' | 'card'; title: string }) {
  return <View style={styles.reviewHeader}>{icon === 'user' && <UserIcon color="#0a0a0a" size={20} />}{icon === 'truck' && <TruckIcon color="#0a0a0a" size={20} />}{icon === 'card' && <CreditCardIcon color="#0a0a0a" size={20} />}<ThemedText style={styles.sectionTitle}>{title}</ThemedText></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  content: { gap: Spacing.three, paddingVertical: Spacing.three, paddingBottom: 170 },
  flex: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  pageTitle: { fontSize: 17, lineHeight: 23, fontFamily: Fonts.bold, fontWeight: '700' },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
  cardTitle: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.bold, fontWeight: '700' },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  bodyText: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  productsCard: { padding: Spacing.three, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
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
  giftCheckbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#aaa49c', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  giftCheckboxSelected: { borderColor: '#0a0a0a', backgroundColor: '#0a0a0a' },
  giftCheck: { color: '#FFFFFF', fontSize: 13, lineHeight: 15 },
  giftText: { flex: 1, fontSize: 13 },
  field: { flex: 1, gap: 4 },
  fieldLabel: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  input: { minHeight: 46, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d9d3cc', backgroundColor: '#FFFFFF', fontFamily: Fonts.sans, fontSize: 15, color: '#0a0a0a' },
  inputError: { borderColor: '#ff7772', borderWidth: 1.5 },
  errorText: { color: '#ed6560', fontSize: 11, lineHeight: 15, fontFamily: Fonts.sans },
  successText: { color: '#2f8f5b', fontSize: 12, fontFamily: Fonts.sans },
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
  addressDetails: { flex: 1, gap: 4 },
  dataLabel: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, fontWeight: '400' },
  link: { color: '#4f4b47', textDecorationLine: 'underline', fontSize: 12, fontFamily: Fonts.sans },
  primary: { minHeight: 48, padding: Spacing.four, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  secondary: { minHeight: 48, padding: Spacing.three, borderRadius: 8, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  secondaryText: { color: '#0a0a0a', fontFamily: Fonts.bold, fontSize: 14, fontWeight: '700' },
  fixedFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: Spacing.two, padding: Spacing.two, paddingBottom: Spacing.three, backgroundColor: '#ffffff' },
  smallButton: { minHeight: 46, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  buttonText: { color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 13, fontWeight: '700' },
  selected: { borderColor: '#0a0a0a', borderWidth: 2 },
  selectedAddressCard: { gap: Spacing.three },
  shippingCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
  shippingAddressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pinIcon: { fontSize: 22, color: '#0a0a0a' },
  shippingAddressText: { flex: 1 },
  shippingSection: { gap: Spacing.two },
  shippingOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: 10, borderWidth: 1, borderColor: '#b0a69b', backgroundColor: '#FFFFFF' },
  shippingOptionSelected: { borderColor: '#0a0a0a', borderWidth: 2 },
  shippingOptionDetails: { flex: 1, gap: 4 },
  pickupButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: 10, borderWidth: 1, borderColor: '#b0a69b', backgroundColor: '#FFFFFF' },
  pickupSelectedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.two, borderRadius: 10, backgroundColor: '#FFFFFF' },
  pickupStoreCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: 12, borderWidth: 1, borderColor: '#b0a69b', backgroundColor: '#FFFFFF' },
  pickupStoreName: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#b0a69b', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#0a0a0a' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0a0a0a' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  summaryTotal: { marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eeeae5' },
  progressCard: { gap: 8, padding: Spacing.two, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6e1da' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#e3ded5' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#2f8f5b' },
  paymentCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, borderWidth: 1, borderColor: '#e6e1da', backgroundColor: '#FFFFFF' },
  paymentHeader: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, justifyContent: 'space-between' },
  paymentDivider: { height: 1, backgroundColor: '#eeeae5' },
  voucherTrigger: { minHeight: 34, justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#eeeae5' },
  pixInfo: { gap: Spacing.two, marginTop: Spacing.one, padding: Spacing.three, borderRadius: 8, backgroundColor: '#f5f5f5' },
  pixWord: { color: '#4bb5ad', fontSize: 28, lineHeight: 32, fontFamily: Fonts.sans, fontWeight: '400' },
  pixQrImage: { alignSelf: 'center', width: 240, height: 240, marginVertical: Spacing.two },
  pixCodeInput: { minHeight: 92, textAlignVertical: 'top' },
  creditCardVisual: { minHeight: 155, padding: Spacing.three, borderRadius: 8, backgroundColor: '#344762', justifyContent: 'space-between' },
  creditCardLabel: { color: '#dfe5ee', fontSize: 12, fontFamily: Fonts.sans },
  creditCardNumber: { color: '#FFFFFF', fontSize: 20, letterSpacing: 1, fontFamily: Fonts.sans },
  creditCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  creditCardMeta: { flex: 1, color: '#e3e8ef', fontSize: 10, fontFamily: Fonts.sans },
  billingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  billingCheckbox: { width: 20, height: 20, borderRadius: 5, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  billingCheck: { color: '#FFFFFF', fontSize: 14, lineHeight: 17 },
  billingText: { flex: 1, fontSize: 13, lineHeight: 18 },
  acceptedTitle: { fontSize: 13, color: '#625d57', fontFamily: Fonts.sans },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  brandBadge: { minWidth: 38, height: 24, paddingHorizontal: 4, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: '#FFFFFF', fontSize: 8, lineHeight: 10, fontFamily: Fonts.sans },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  reviewDeliveryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  freeText: { color: '#2f9b62', fontFamily: Fonts.sans, fontSize: 13 },
  deliveryText: { color: '#2f9b62', fontFamily: Fonts.sans, fontSize: 12 },
  reviewAddress: { gap: 3, marginTop: Spacing.one, padding: Spacing.two, borderRadius: 8, backgroundColor: '#f8f8f8' },
  reviewItems: { gap: Spacing.two },
  reviewItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  reviewItemImage: { width: 48, height: 62, borderRadius: 4, backgroundColor: '#eeeae5' },
  reviewItemName: { flex: 1, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  paymentReview: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.two },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, backgroundColor: 'rgba(0, 0, 0, 0.62)' },
  modalCard: { width: '100%', maxWidth: 340, gap: Spacing.two, padding: Spacing.four, borderRadius: 6, backgroundColor: '#FFFFFF' },
  modalTitle: { textAlign: 'center', lineHeight: 26, fontSize: 18, marginBottom: Spacing.two, fontFamily: Fonts.bold, fontWeight: '700' },
  modalDeleteButton: { minHeight: 48, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  modalCancelButton: { minHeight: 48, borderRadius: 4, borderWidth: 1, borderColor: '#4c433c', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});

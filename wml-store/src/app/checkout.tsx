import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddToCartFeedback } from '@/components/add-to-cart-feedback';
import { BottomSheetHandle } from '@/components/bottom-sheet-handle';
import { ProductShelf } from '@/components/cms-section';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import CreditCardIcon from '@/components/icons/CreditCardIcon';
import ShoppingBagIcon from '@/components/icons/ShoppingBagIcon';
import StoreIcon from '@/components/icons/StoreIcon';
import TrashIcon from '@/components/icons/TrashIcon';
import { NewsletterOptIn } from '@/components/newsletter-opt-in';
import { PaymentBrandIcon, type PaymentBrand } from '@/components/payment-brand';
import Recaptcha, { type RecaptchaHandle } from '@/components/recaptcha';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTabBar } from '@/context/tab-bar-context';
import { getAccountSession } from '@/services/auth';
import { addCouponToCart, addGiftCardToCart, addItemOffering, checkGiftCardAvailability, clearCart, createFreshOrderForm, getCustomerGiftCards, getOrderForm, getPaymentInstallments, identifyExistingCustomerByEmail, OrderForm, removeCouponFromCart, removeGiftCardFromCart, removeItemOffering, selectPaymentMethod, selectShippingOption, subscribeToCartChanges, updateCartItem, updateClientProfile, updateShippingAddress, type CartItem, type GiftCard, type InstallmentChoice } from '@/services/cart';
import { getCustomerAddressesFromMasterData, getCustomerProfileFromMasterData, updateCustomerProfile, type CustomerAddress, type CustomerProfile } from '@/services/customer';
import { CheckoutOrderError, getTransactionStatus, placeOrder, type CheckoutOrderResult } from '@/services/orders';
import { trackEvent, type TrackingItem } from '@/services/telemetry';
import { birthDateToApi, formatBirthDate, formatBirthDateInput, formatGenderLabel, formatPhoneWithoutCountryCode } from '@/utils/customer-formatters';
import {
  mergeCustomerProfiles,
  isGiftCardOwnershipError,
  isGiftCardCartContextError,
  CONFIGURED_RECAPTCHA_SITE_KEY,
  CART_BEST_SELLING_PRODUCTS_SHELF,
  EMPTY_CART_RECENT_PRODUCTS_SHELF,
  digits,
  validEmail,
  getRecaptchaSiteKey,
  validPhone,
  validCpf,
  money,
  formatPhone,
  formatCpf,
  formatPostalCode,
  formatCardNumber,
  formatExpiry,
  isShippingStep,
  isPickupOption,
  shippingOptionId,
  shippingOptionKey,
  pickupStoreName,
  pickupAddressLines,
  isGiftCardPayment,
  isCardPayment,
  isPixPayment,
  giftCardsTotal,
  giftCardsCoverOrder,
  activeGiftCards,
  paymentAmountAfterGiftCards,
  cardBrandFor,
  cardPaymentMethodForNumber,
  parsePaymentAppPayload,
  humanShippingEstimate,
  shippingPriceAndEstimate,
  deliveryEstimate,
  giftWrappingOffering,
  hasGiftWrapping,
  allGiftWrappingApplied,
  getShippingOptions,
  getDefaultShippingOptionId,
  getShippingSelectionId,
  type Step,
  type CustomerCheckoutData,
  type ShippingOption,
  type PaymentMethod,
  type GiftCardAvailability
} from '@/utils/checkout';
import {
  CreditCardVisual,
  AcceptedBrands,
  InstallmentsScreen,
  PixPaymentScreen,
  OrderSuccessScreen,
  CheckoutProductImage,
  Card,
  CustomerDataSummary,
  CustomerReviewData,
  PickupStoreCard,
  Field,
  Primary,
  Secondary,
  Radio,
  Summary,
  FreeShippingProgress,
  ReviewHeader,
  ReviewItemsDisclosure,
  GiftCardPaymentSection,
  GiftCardIdentityModal,
  GiftCardPaymentReview
} from '@/components/checkout/checkout-presentation';
import { styles } from '@/styles/checkout.styles';

function trackingItems(items: CartItem[]): TrackingItem[] {
  return items.map((item) => ({
    item_id: item.productId || item.id,
    item_name: item.name,
    item_variant: item.id,
    price: item.price,
    quantity: item.quantity,
  }));
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
  const [giftCardAvailability, setGiftCardAvailability] = useState<GiftCardAvailability>('unknown');
  const [giftCardIdentityVerified, setGiftCardIdentityVerified] = useState(false);
  const [giftCardCreditsHidden, setGiftCardCreditsHidden] = useState(false);
  const [giftCardIdentityVisible, setGiftCardIdentityVisible] = useState(false);
  const [availableGiftCards, setAvailableGiftCards] = useState<GiftCard[]>([]);
  const [giftCardVoucherDetails, setGiftCardVoucherDetails] = useState<GiftCard | null>(null);
  const [giftCardDetailsLoading, setGiftCardDetailsLoading] = useState(false);
  const [applyingAvailableGiftCard, setApplyingAvailableGiftCard] = useState<string | null>(null);
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
  const [reviewItemsExpanded, setReviewItemsExpanded] = useState(false);
  const [orderResult, setOrderResult] = useState<CheckoutOrderResult | null>(null);
  const trackedPurchaseKeys = useRef(new Set<string>());
  const cartViewTracked = useRef(false);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState(CONFIGURED_RECAPTCHA_SITE_KEY);
  const recaptchaRef = useRef<RecaptchaHandle>(null);
  const checkoutScrollRef = useRef<ScrollView>(null);
  const couponMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const giftCardAvailabilityKeyRef = useRef('');
  const giftCardVerifiedEmailRef = useRef('');
  const giftCardDetailsRequestKeyRef = useRef('');
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

  useEffect(() => {
    if (step !== 'cart') {
      cartViewTracked.current = false;
      return;
    }
    if (!orderForm || orderForm.items.length === 0 || cartViewTracked.current) return;
    cartViewTracked.current = true;
    void trackEvent({
      name: 'view_cart',
      currency: 'BRL',
      value: orderForm.value,
      items: trackingItems(orderForm.items),
    });
  }, [orderForm, step]);

  function trackCompletedPurchase(result: CheckoutOrderResult, purchasedOrderForm: OrderForm | null) {
    const deduplicationKey = result.orderId || result.orderGroup || result.transactionId;
    if (!deduplicationKey || trackedPurchaseKeys.current.has(deduplicationKey)) return;
    if (!purchasedOrderForm || purchasedOrderForm.items.length === 0) return;

    trackedPurchaseKeys.current.add(deduplicationKey);
    void trackEvent({
      name: 'purchase',
      transaction_id: deduplicationKey,
      currency: 'BRL',
      value: purchasedOrderForm.value,
      items: trackingItems(purchasedOrderForm.items),
    });
  }

  function beginCheckout() {
    if (orderForm && orderForm.items.length > 0) {
      void trackEvent({
        name: 'begin_checkout',
        currency: 'BRL',
        value: orderForm.value,
        items: trackingItems(orderForm.items),
      });
    }
    setStep('email');
  }

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

  function resetGiftCardIdentityIfEmailChanged(nextEmail: string) {
    const normalizedEmail = nextEmail.trim().toLowerCase();
    if (!giftCardVerifiedEmailRef.current || giftCardVerifiedEmailRef.current === normalizedEmail) return;
    giftCardVerifiedEmailRef.current = '';
    setGiftCardIdentityVerified(false);
    setGiftCardCreditsHidden(false);
    setAvailableGiftCards([]);
    if (giftCardVoucherDetails) {
      setVoucher('');
      setVoucherMessage('');
      setVoucherMessageType(null);
    }
    setGiftCardVoucherDetails(null);
    setGiftCardAvailability('unknown');
    giftCardAvailabilityKeyRef.current = '';
    giftCardDetailsRequestKeyRef.current = '';
  }

  async function loadGiftCardDetails(targetOrderForm = orderForm) {
    if (!targetOrderForm || !email.trim()) return [];
    const requestedEmail = email.trim().toLowerCase();
    const requestKey = `${targetOrderForm.orderFormId}|${requestedEmail}`;
    giftCardDetailsRequestKeyRef.current = requestKey;
    setGiftCardDetailsLoading(true);
    try {
      const cards = await getCustomerGiftCards(targetOrderForm.orderFormId, requestedEmail);
      if (giftCardDetailsRequestKeyRef.current !== requestKey) return [];
      setAvailableGiftCards(cards);
      setGiftCardAvailability(cards.length > 0 ? 'available' : 'none');
      return cards;
    } finally {
      if (giftCardDetailsRequestKeyRef.current === requestKey) setGiftCardDetailsLoading(false);
    }
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
      setGiftCardAvailability('unknown');
      setGiftCardIdentityVerified(Boolean(loggedEmail));
      setGiftCardCreditsHidden(false);
      setAvailableGiftCards([]);
      setGiftCardVoucherDetails(null);
      giftCardAvailabilityKeyRef.current = '';
      giftCardVerifiedEmailRef.current = loggedEmail;
      giftCardDetailsRequestKeyRef.current = '';
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
    if (step !== 'payment' || !orderForm || !email.trim() || (!customerExists && !orderForm.userProfileId)) return;
    const requestKey = `${orderForm.orderFormId}|${email.trim().toLowerCase()}|${giftCardIdentityVerified ? 'verified' : 'guest'}`;
    if (giftCardAvailabilityKeyRef.current === requestKey) return;
    giftCardAvailabilityKeyRef.current = requestKey;
    let active = true;
    setGiftCardAvailability('loading');
    if (!giftCardIdentityVerified) setAvailableGiftCards([]);
    void (async () => {
      // A conta pode ter sido autenticada antes do checkout. Sincronize o
      // perfil/CPF antes de consultar e aplicar os créditos, para que o
      // orderForm usado pelo botão "Usar" seja o mesmo contexto do cliente.
      let targetOrderForm = orderForm;
      if (giftCardIdentityVerified) {
        try {
          targetOrderForm = await ensureCustomerProfileForGiftCard(orderForm);
        } catch (error) {
          console.warn('[GIFT CARD] profile synchronization before availability failed', {
            orderFormId: orderForm.orderFormId,
            message: error instanceof Error ? error.message : String(error || ''),
          });
        }
      }
      if (!active) return;
      const available = await checkGiftCardAvailability(targetOrderForm.orderFormId, email);
      if (!active) return;
      setGiftCardAvailability(available ? 'available' : 'none');
      if (available && giftCardIdentityVerified) {
        try { await loadGiftCardDetails(targetOrderForm); } catch { if (active) setGiftCardAvailability('available'); }
      }
    })().catch(() => {
      if (!active) return;
      setGiftCardAvailability('none');
      setAvailableGiftCards([]);
    });
    return () => { active = false; };
  }, [step, orderForm?.orderFormId, email, customerExists, giftCardIdentityVerified]);

  useEffect(() => {
    if (!orderResult || orderResult.status !== 'pending_payment' || !orderResult.transactionId) return;
    let active = true;
    const checkStatus = async () => {
      try {
        const pixPayload = parsePaymentAppPayload(orderResult.paymentApp);
        const status = await getTransactionStatus(orderResult.transactionId, orderResult.orderGroup, pixPayload?.paymentId);
        if (!active) return;
        if (status.status === 'completed') {
          trackCompletedPurchase({ ...orderResult, status: 'completed' }, orderForm);
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

  function customerFullName() {
    return [firstName, lastName].map((value) => value.trim()).filter(Boolean).join(' ');
  }

  function ensureReceiverName() {
    const currentReceiverName = receiverName.trim();
    if (currentReceiverName) return currentReceiverName;
    const defaultReceiverName = customerFullName();
    if (defaultReceiverName) setReceiverName(defaultReceiverName);
    return defaultReceiverName;
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
    setReceiverName(String(address.receiverName || '').trim() || customerFullName());
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
    resetGiftCardIdentityIfEmailChanged(email);
    setSaving(true);
    setMessage('');
    try {
      // Um perfil existente já identificado pelo SmartCheckout não precisa ser
      // reenviado por completo. Preservar esse orderForm.userProfileId é
      // essencial para vales-presentes restritos ao CPF do proprietário.
      if (customerExists && !editingCustomer && orderForm.userProfileId) {
        ensureReceiverName();
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
      ensureReceiverName();
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
    resetGiftCardIdentityIfEmailChanged(email);
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
    ensureReceiverName();
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
    const selectedPaymentMethod = orderForm.paymentData?.paymentSystems.find((method) => method.id === selectedPayment);
    const selectedPaymentIsGiftCard = Boolean(selectedPaymentMethod && isGiftCardPayment(selectedPaymentMethod))
      || selectedPaymentLabel.toLowerCase().includes('vale');
    const paymentKind: 'pix' | 'card' | 'giftcard' = selectedPaymentIsGiftCard
      ? 'giftcard'
      : selectedPaymentLabel.toLowerCase().includes('pix') ? 'pix' : 'card';
    if (paymentKind === 'giftcard' && !giftCardsCoverOrder(activeGiftCards(orderForm), orderForm.value)) {
      setMessage(`Pagamento restante de ${money(Math.max(0, orderForm.value - giftCardsTotal(activeGiftCards(orderForm))))}. Por favor, combine com outra forma de pagamento`);
      return;
    }
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

      if (paymentKind !== 'giftcard') {
        // A VTEX só define a chave reCAPTCHA aplicável depois que o meio de
        // pagamento foi selecionado. Atualizamos o attachment imediatamente
        // antes de gerar um token novo para não usar uma chave antiga. Para
        // vale integral, os gift cards já estão aplicados no carrinho e não
        // devem ser removidos/reaplicados nesta etapa.
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
      }
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
        trackCompletedPurchase(result, paymentOrderForm);
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

    // Depois que o perfil já foi identificado e o CPF foi sincronizado, não
    // repetimos a busca por e-mail. A rota de identificação anexa somente o
    // e-mail e pode devolver o mesmo perfil sem o CPF; reanexá-la imediatamente
    // antes do paymentData faz a VTEX perder o contexto necessário para validar
    // o vale-presente vinculado ao documento.
    if (
      currentOrderForm.userProfileId
      && currentEmail.toLowerCase() === desiredEmail.toLowerCase()
      && documentMatches
    ) {
      console.info('[GIFT CARD] customer profile already ready before apply', {
        orderFormId: currentOrderForm.orderFormId,
        userProfileIdPresent: true,
        documentMatches: true,
      });
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
          const identifiedDocument = digits(identifiedOrderForm.clientProfileData?.document ?? '');
          const identifiedDocumentMatches = Boolean(
            desiredDocument
            && identifiedDocument
            && desiredDocument === identifiedDocument,
          );
          if (identifiedOrderForm.userProfileId && identifiedDocumentMatches) {
            console.info('[GIFT CARD] customer identified before apply', {
              orderFormId: identifiedOrderForm.orderFormId,
              userProfileIdPresent: true,
              documentMatches: true,
            });
            return identifiedOrderForm;
          }
          if (identifiedOrderForm.userProfileId) {
            console.info('[GIFT CARD] customer document needs synchronization before apply', {
              orderFormId: identifiedOrderForm.orderFormId,
              userProfileIdPresent: true,
              profileDocumentPresent: Boolean(identifiedDocument),
              documentMatches: identifiedDocumentMatches,
            });
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

  async function applyGiftCardCode(
    redemptionCode: string,
    sourceOrderForm = orderForm,
    giftCardDetails?: Pick<GiftCard, 'id' | 'provider' | 'isSpecialCard'>,
  ) {
    const normalizedCode = redemptionCode.trim();
    if (!sourceOrderForm || !normalizedCode) return false;
    setSaving(true);
    setVoucherLoading(true);
    setVoucherMessage('');
    setVoucherMessageType(null);
    try {
      // Também no fluxo autenticado repetimos o mesmo preparo executado ao
      // digitar o código manualmente. Assim a aplicação automática usa o
      // perfil e o payload que já são aceitos pela VTEX.
      let giftCardOrderForm = await ensureCustomerProfileForGiftCard(sourceOrderForm);
      console.info('[GIFT CARD] applying to orderForm', {
        orderFormId: giftCardOrderForm.orderFormId,
        userProfileIdPresent: Boolean(giftCardOrderForm.userProfileId),
      });
      const addToOrderForm = (targetOrderForm: OrderForm) => {
        const giftCardApplied = activeGiftCards(targetOrderForm);
        // Nesta tela ainda não existe uma segunda forma selecionada. Reenviar
        // payments antigos faz a VTEX rejeitar o vale como pagamento indisponível.
        return addGiftCardToCart(targetOrderForm.orderFormId, normalizedCode, giftCardApplied, [], email, giftCardDetails);
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
      setGiftCardVoucherDetails(null);
      setVoucherMessage('Vale-presente aplicado.');
      setVoucherMessageType('success');
      return true;
    } catch (error) {
      setVoucherMessage(error instanceof Error ? error.message : 'Não foi possível adicionar o vale-presente.');
      setVoucherMessageType('error');
      return false;
    } finally {
      setVoucherLoading(false);
      setSaving(false);
    }
  }

  async function applyVoucher() {
    const redemptionCode = voucher.trim();
    if (!redemptionCode) {
      setVoucherMessage('Informe o código do vale-presente.');
      setVoucherMessageType('error');
      return;
    }
    if (giftCardAvailability === 'available' && !giftCardIdentityVerified) {
      setVoucherMessage('Confirme sua identidade para usar os créditos vinculados a este e-mail.');
      setVoucherMessageType('error');
      setGiftCardIdentityVisible(true);
      return;
    }
    let applied = await applyGiftCardCode(redemptionCode, orderForm);
    if (!applied && giftCardVoucherDetails) {
      // Se o código digitado veio do fallback de um cartão autenticado,
      // repita com os metadados retornados pela API antes de informar falha.
      await applyGiftCardCode(redemptionCode, orderForm, giftCardVoucherDetails);
    }
  }

  async function applyAvailableGiftCard(
    giftCard: GiftCard,
    sourceOrderForm = orderForm,
  ): Promise<boolean> {
    const redemptionCode = giftCard.redemptionCode.trim();
    if (!redemptionCode) {
      setVoucherMessage('Este crédito não está disponível para aplicação agora.');
      setVoucherMessageType('error');
      return false;
    }
    setApplyingAvailableGiftCard(giftCard.id || redemptionCode);
    try {
      // O botão manual envia somente o código e esse continua sendo o
      // caminho principal para cartões comuns, inclusive os criados pelo
      // ERP. Alguns cartões restritos retornados pela Giftcard API também
      // exigem id/provider; nesses casos fazemos uma segunda tentativa com
      // os metadados do cartão selecionado.
      let applied = await applyGiftCardCode(redemptionCode, sourceOrderForm);
      if (!applied && (giftCard.id || giftCard.provider || giftCard.isSpecialCard)) {
        applied = await applyGiftCardCode(redemptionCode, sourceOrderForm, giftCard);
      }
      if (applied) {
        // Once the identity is confirmed, the selected credit belongs in the
        // Vale presente card below. Do not leave the same credit duplicated in
        // a separate "Créditos disponíveis" section.
        setAvailableGiftCards([]);
      } else {
        // Keep a failed protected-card attempt recoverable through the same
        // field used by manual entry. Retain the API metadata as well, since
        // ERP cards may require id/provider when the customer taps Adicionar.
        setGiftCardVoucherDetails(giftCard);
        setVoucher(redemptionCode);
        setGiftCardCreditsHidden(true);
        setAvailableGiftCards([]);
        setVoucherMessage('Vale-presente encontrado. Clique em Adicionar para aplicar.');
        setVoucherMessageType('success');
      }
      return applied;
    } finally {
      setApplyingAvailableGiftCard(null);
    }
  }

  async function completeGiftCardIdentity(authenticatedEmail: string) {
    const normalizedEmail = authenticatedEmail.trim().toLowerCase();
    if (!orderForm || normalizedEmail !== email.trim().toLowerCase()) {
      throw new Error('Use o mesmo e-mail informado no checkout para consultar os créditos.');
    }
    setSaving(true);
    try {
      // Invalida uma consulta anterior para outro contexto antes de carregar
      // os vales da identidade que acabou de ser confirmada.
      giftCardDetailsRequestKeyRef.current = `${orderForm.orderFormId}|${normalizedEmail}|authenticated`;
      let authenticatedOrderForm = orderForm;
      try {
        // Sincroniza o CPF do checkout antes da consulta protegida. A
        // autenticação confirma o e-mail, mas os cartões criados pela API
        // continuam vinculados ao CPF informado no orderForm.
        authenticatedOrderForm = await ensureCustomerProfileForGiftCard(orderForm);
      } catch (error) {
        // A autenticação já confirmou a identidade; se a sincronização do
        // perfil falhar momentaneamente, a consulta protegida ainda pode
        // usar o perfil que já está no carrinho.
        console.warn('[GIFT CARD] profile synchronization after authentication failed', {
          orderFormId: orderForm.orderFormId,
          message: error instanceof Error ? error.message : String(error || ''),
        });
      }
      const cards = await getCustomerGiftCards(authenticatedOrderForm.orderFormId, normalizedEmail);
      console.info('[GIFT CARD] authenticated cards loaded', {
        orderFormId: authenticatedOrderForm.orderFormId,
        count: cards.length,
        activeCount: activeGiftCards(authenticatedOrderForm).length,
        profileDocumentPresent: Boolean(digits(authenticatedOrderForm.clientProfileData?.document ?? '')),
      });
      giftCardAvailabilityKeyRef.current = `${authenticatedOrderForm.orderFormId}|${normalizedEmail}|verified`;
      giftCardVerifiedEmailRef.current = normalizedEmail;
      setGiftCardIdentityVerified(true);
      setGiftCardCreditsHidden(true);
      // The authenticated card is applied directly in the Vale presente
      // section. Keeping this list in state would render a duplicate credits
      // block after the modal closes.
      setAvailableGiftCards([]);
      setGiftCardAvailability(cards.length > 0 ? 'available' : 'none');
      setVoucherMessage('');
      setVoucherMessageType(null);
      if (giftCardVoucherDetails) {
        setVoucher('');
        setGiftCardVoucherDetails(null);
      }
      if (cards.length === 0) {
        throw new Error('Nenhum vale-presente ativo foi encontrado para este CPF e e-mail.');
      }
      const appliedCardKeys = new Set(activeGiftCards(authenticatedOrderForm).map((card) => (
        card.id || card.redemptionCode.trim().toLowerCase()
      )));
      const unappliedCards = cards.filter((card) => !appliedCardKeys.has(
        card.id || card.redemptionCode.trim().toLowerCase(),
      ));
      if (unappliedCards.length > 0) {
        // O backend já confirma o titular e ordena os vales ativos pela data
        // de emissão. Portanto, o primeiro item é sempre o mais recente.
        const cardToApply = unappliedCards[0];
        const applied = await applyAvailableGiftCard(cardToApply, authenticatedOrderForm);
        console.info('[GIFT CARD] authenticated card auto-apply', {
          orderFormId: authenticatedOrderForm.orderFormId,
          applied,
          cardIdPresent: Boolean(cardToApply.id),
        });
        if (!applied) {
          // A consulta protegida encontrou o cartão, mas a VTEX pode não
          // refletir a primeira tentativa automática no paymentData. Nesse
          // caso, fechamos o modal e deixamos exatamente o código encontrado
          // no campo manual; o cliente só precisa tocar em "Adicionar".
          const fallbackCode = cardToApply.redemptionCode.trim();
          if (fallbackCode) {
            setGiftCardVoucherDetails(cardToApply);
            setVoucher(fallbackCode);
            setVoucherMessage('Vale-presente encontrado. Clique em Adicionar para aplicar.');
            setVoucherMessageType('success');
            console.info('[GIFT CARD] auto-apply fallback ready', {
              orderFormId: authenticatedOrderForm.orderFormId,
              codePresent: true,
            });
            return;
          }
          throw new Error('Não foi possível identificar o código do vale-presente.');
        }
      }
    } finally {
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
    const giftCardMethod = orderForm.paymentData?.paymentSystems.find(isGiftCardPayment);
    if (!giftCardMethod?.id) {
      setMessage('Vale-presente não está disponível para finalizar este carrinho.');
      return;
    }
    setSelectedPayment(giftCardMethod.id);
    setSelectedPaymentLabel(giftCardMethod.name || 'Vale presente');
    setSelectedInstallment(null);
    setMessage('');
    setStep('review');
  }

  function continueWithSelectedPayment() {
    if (!orderForm || saving) return;
    const paymentMethods = orderForm.paymentData?.paymentSystems ?? [];
    const explicitlySelected = selectedPayment
      ? paymentMethods.find((method) => method.id === selectedPayment)
      : undefined;
    const paymentMethod = explicitlySelected
      ?? paymentMethods.find(isCardPayment)
      ?? paymentMethods.find(isPixPayment)
      ?? paymentMethods.find(isGiftCardPayment);

    if (!paymentMethod?.id) {
      setMessage('Nenhuma forma de pagamento está disponível para este carrinho.');
      return;
    }

    setMessage('');
    if (isCardPayment(paymentMethod)) {
      openCardPayment(paymentMethod);
      return;
    }
    if (isPixPayment(paymentMethod)) {
      void choosePayment(paymentMethod.id, paymentMethod.name || 'Pix');
      return;
    }
    if (isGiftCardPayment(paymentMethod)) {
      setSelectedPayment(paymentMethod.id);
      setSelectedPaymentLabel(paymentMethod.name || 'Vale presente');
      setSelectedInstallment(null);
      continueWithGiftCard();
      return;
    }
    void choosePayment(paymentMethod.id, paymentMethod.name || 'Pagamento');
  }

  async function removeVoucher(giftCard: GiftCard) {
    const redemptionCode = giftCard.redemptionCode.trim();
    const removalKey = redemptionCode || giftCard.id || '';
    if (!orderForm || !removalKey) return;
    setSaving(true);
    setRemovingGiftCard(removalKey);
    setVoucherMessage('');
    setVoucherMessageType(null);
    try {
      const updatedOrderForm = await removeGiftCardFromCart(orderForm.orderFormId, giftCard, appliedGiftCards, orderForm.paymentData?.payments ?? [], email);
      setOrderForm(updatedOrderForm);
      if (giftCardIdentityVerified) {
        void loadGiftCardDetails(updatedOrderForm).catch(() => undefined);
      }
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
      return <OrderSuccessScreen
        orderId={orderResult.orderId || orderResult.orderGroup}
        email={email}
        fullName={`${firstName} ${lastName}`.trim()}
        document={document}
        phone={phone}
        receiverName={receiverName}
        street={street}
        number={number}
        complement={complement}
        neighborhood={neighborhood}
        city={city}
        state={state}
        postalCode={postalCode}
        onOrders={() => { void openOrdersAfterCheckout(); }}
        onHome={() => router.replace('/')}
      />;
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
    </ScrollView><Modal visible={pickupSelectionOpen} animationType="slide" onRequestClose={() => setPickupSelectionOpen(false)}><ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><BottomSheetHandle /><ScreenHeader title="Retirar em loja" onBack={() => setPickupSelectionOpen(false)} showSearch={false} showCart={false} /><ScrollView contentContainerStyle={styles.content}><ThemedText style={styles.pageTitle}>Escolha a loja para retirada</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">Selecione onde deseja retirar seu pedido.</ThemedText>{pickupOptions.map((option) => <PickupStoreCard key={shippingOptionKey(option)} option={option} selected={shippingOptionId(option) === selectedShippingId} disabled={saving} onPress={() => choosePickupStore(option)} />)}</ScrollView></SafeAreaView></ThemedView></Modal><View style={styles.fixedFooter}><Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={continueWithShipping} /><Secondary title="Alterar endereço de entrega" onPress={openAddressSelection} /></View></SafeAreaView></ThemedView>;
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
  const giftCardRemainingAmount = paymentAmountAfterGiftCards(orderForm);
  const selectedPaymentMethod = selectedPayment ? payments.find((method) => method.id === selectedPayment) : undefined;
  const selectedPaymentOption = selectedPaymentMethod
    ?? cardMethod
    ?? pixMethod
    ?? payments.find(isGiftCardPayment);
  const cardPaymentSelected = Boolean(selectedPaymentOption && isCardPayment(selectedPaymentOption));
  const pixPaymentSelected = Boolean(selectedPaymentOption && isPixPayment(selectedPaymentOption));
  const selectedPaymentIsGiftCard = Boolean(selectedPaymentOption && isGiftCardPayment(selectedPaymentOption))
    || selectedPaymentLabel.toLowerCase().includes('vale');
  const title: Record<Step, string> = { cart: 'Carrinho', email: 'Dados pessoais', customer: 'Dados pessoais', address: 'Entrega', shipping: 'Entrega', payment: 'Pagamento', card: 'Cartão de crédito', installments: 'Parcelamento', review: 'Revise e confirme' };
  const customerErrors = getCustomerErrors();
  const addressErrors = getAddressErrors();
  const cardErrors = getCardErrors();

  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title={title[step]} onBack={back} showSearch={false} showCart />{recaptchaSiteKey && (step === 'payment' || step === 'card' || step === 'review') && <Recaptcha ref={recaptchaRef} siteKey={recaptchaSiteKey} />}<ScrollView ref={checkoutScrollRef} contentContainerStyle={styles.content}>
     {step === 'cart' && <><ThemedView style={styles.productsCard}>{orderForm.items.map((item, position) => <View key={item.id + '-' + item.index} style={[styles.productBlock, position > 0 && styles.productDivider]}><View style={styles.itemRow}><CheckoutProductImage imageUrl={item.imageUrl} label={item.name} style={styles.itemImage} /><View style={styles.itemDetails}><View style={styles.itemTopRow}><ThemedText numberOfLines={3} style={styles.itemName}>{item.name}</ThemedText><Pressable accessibilityLabel={'Remover ' + item.name} disabled={Boolean(updatingItem)} onPress={() => setPendingRemoval(item)} style={styles.removeButton}><TrashIcon size={20} color="#65666E" /></Pressable></View><View style={styles.itemBottomRow}><View style={styles.quantityControl}><Pressable disabled={Boolean(updatingItem) || item.quantity <= 1} onPress={() => changeItemQuantity(item.index, item.id, item.quantity - 1)} style={styles.quantityButton}><ThemedText>−</ThemedText></Pressable><View style={styles.quantityValue}>{updatingItem === item.id ? <ActivityIndicator size="small" color="#65666E" /> : <ThemedText style={styles.quantityCount}>{item.quantity}</ThemedText>}</View><Pressable disabled={Boolean(updatingItem)} onPress={() => changeItemQuantity(item.index, item.id, item.quantity + 1)} style={styles.quantityButton}><ThemedText>+</ThemedText></Pressable></View><ThemedText style={styles.itemPrice}>{money(item.price)}</ThemedText></View></View></View></View>)}{giftWrappingAvailable && <Pressable disabled={giftWrapLoading || saving} onPress={toggleGiftWrapping} style={styles.giftRow}><View style={[styles.giftCheckbox, giftWrap && styles.giftCheckboxSelected]}>{giftWrap && <ThemedText style={styles.giftCheck}>✓</ThemedText>}</View><ThemedText style={styles.giftText}>Incluir uma embalagem de presente para o pedido</ThemedText></Pressable>}</ThemedView>{giftWrap && <View style={styles.giftMessage}><ThemedText style={styles.giftMessageText}>Todos os itens selecionados como presente serão entregues em uma única embalagem. Caso precise de mais unidades, entre em contato com o nosso SAC.</ThemedText></View>}<ThemedView style={styles.card}><ThemedText style={styles.cardTitle}>Cupom de desconto</ThemedText><View style={styles.inline}><TextInput value={coupon} onChangeText={(text) => { setCoupon(text); if (couponMessage) clearCouponMessage(); }} autoCapitalize="characters" autoCorrect={false} editable={!couponApplied} placeholder="Insira o código" style={[styles.input, styles.flex, couponApplied && styles.appliedCouponInput]} />{couponApplied ? <Pressable accessibilityLabel="Remover cupom" disabled={saving || couponLoading} onPress={removeCoupon} style={styles.removeButton}>{couponLoading ? <ActivityIndicator size="small" color="#65666E" /> : <TrashIcon size={21} color="#65666E" />}</Pressable> : <Pressable disabled={saving || couponLoading || !coupon.trim()} onPress={applyCoupon} style={styles.smallButton}>{couponLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>Adicionar</ThemedText>}</Pressable>}</View>{!!couponMessage && <ThemedText style={couponMessageType === 'success' ? styles.couponSuccess : styles.couponError}>{couponMessage}</ThemedText>}</ThemedView><FreeShippingProgress value={orderForm.value} /><Summary orderForm={orderForm} /><ProductShelf data={CART_BEST_SELLING_PRODUCTS_SHELF} titleStyle={styles.checkoutShelfTitle} onAdded={showCheckoutAddFeedback} showAddedModal={false} /></>}
     {step === 'email' && <Card><ThemedText style={styles.cardTitle}>Informe seu e-mail para continuar</ThemedText><ThemedText style={styles.bodyText} themeColor="textSecondary">Vamos verificar se você já fez alguma compra com a gente.</ThemedText><Field label="E-mail" value={email} setValue={setEmail} required placeholder="Digite seu email" keyboardType="email-address" error={emailValidationAttempted && !validEmail(email) ? 'E-mail inválido' : ''} /></Card>}
    {step === 'customer' && <>
      {customerExists && !editingCustomer
        ? <CustomerDataSummary email={email} firstName={firstName} lastName={lastName} phone={phone} birthDate={birthDate} document={document} gender={gender} onEdit={() => setEditingCustomer(true)} />
        : <Card style={styles.customerEditCard}>
          <ThemedText style={styles.customerDataTitle}>Dados Pessoais</ThemedText>
          <ThemedText style={styles.customerDataDescription}>Vamos verificar se você já fez alguma compra com a gente.</ThemedText>
          <View style={styles.customerEditFields}>
            <Field label="E-mail" value={email} setValue={setEmail} required placeholder="Digite seu email" keyboardType="email-address" error={customerValidationAttempted ? customerErrors.email : ''} variant="personal" />
            <Field label="Nome" value={firstName} setValue={setFirstName} required placeholder="Nome" error={customerValidationAttempted ? customerErrors.firstName : ''} variant="personal" />
            <Field label="Sobrenome" value={lastName} setValue={setLastName} required placeholder="Sobrenome" error={customerValidationAttempted ? customerErrors.lastName : ''} variant="personal" />
            <Field label="Telefone com DDD" value={formatPhoneWithoutCountryCode(phone)} setValue={(value) => setPhone(formatPhone(value))} required placeholder="11999999999" keyboardType="phone-pad" error={customerValidationAttempted ? customerErrors.phone : ''} variant="personal" />
            <Field label="Data de nascimento" value={birthDate} setValue={(value) => setBirthDate(formatBirthDateInput(value))} placeholder="DD/MM/AAAA" keyboardType="numeric" variant="personal" />
            <Field label="CPF" value={document} setValue={(value) => setDocument(formatCpf(value))} required placeholder="000.000.000-00" keyboardType="numeric" error={customerValidationAttempted ? customerErrors.document : ''} variant="personal" />
            <View style={[styles.field, styles.personalField]}>
              <ThemedText style={styles.personalFieldLabel}>Gênero</ThemedText>
              <Pressable onPress={() => setGenderOpen((value) => !value)} style={styles.personalDataSelect}>
                <ThemedText style={styles.personalDataSelectText}>{formatGenderLabel(gender) || genders[0].text}</ThemedText>
                <View style={[styles.dropdownIcon, genderOpen && styles.dropdownIconOpen]}><ChevronRightIcon color="#625d57" size={16} /></View>
              </Pressable>
              {genderOpen && <View style={styles.personalDataDropdown}>{genders.map((option) => <Pressable key={option.value || 'optional'} disabled={option.disabled} onPress={() => { if (option.disabled) return; setGender(option.value); setGenderOpen(false); }} style={styles.personalDataOption}><ThemedText style={styles.personalDataSelectText}>{option.text}</ThemedText></Pressable>)}</View>}
            </View>
          </View>
          <NewsletterOptIn value={newsletterOptIn} onChange={changeNewsletterOptIn} onPrivacyPress={() => router.push('/privacy-policy' as never)} />
        </Card>}
      {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
    </>}
    {step === 'address' && (addressSaved && !editingAddress ? <Card><ThemedText style={styles.cardTitle}>Endereço de entrega</ThemedText><ThemedText style={styles.bodyText}>{receiverName}</ThemedText><ThemedText style={styles.bodyText}>{street + ', ' + number + (complement ? ' - ' + complement : '')}</ThemedText><ThemedText style={styles.bodyText}>{neighborhood + ' - ' + city + '/' + state}</ThemedText><ThemedText style={styles.bodyText}>CEP: {postalCode}</ThemedText><Pressable onPress={openAddressSelection}><ThemedText style={styles.link}>{customerAddresses.length > 1 ? 'Alterar ou escolher outro endereço' : 'Alterar endereço'}</ThemedText></Pressable></Card> : <Card><ThemedText style={styles.cardTitle}>Endereço de entrega</ThemedText><Field label="CEP" value={postalCode} setValue={lookupCep} required placeholder="00000-000" keyboardType="numeric" error={addressValidationAttempted ? addressErrors.postalCode : ''} /><Field label="Endereço" value={street} setValue={setStreet} required placeholder="Endereço" error={addressValidationAttempted ? addressErrors.street : ''} /><View style={styles.inline}><Field label="Número" value={number} setValue={setNumber} required placeholder="Número" error={addressValidationAttempted ? addressErrors.number : ''} /><Field label="Complemento" value={complement} setValue={setComplement} placeholder="Complemento" /></View><Field label="Bairro" value={neighborhood} setValue={setNeighborhood} required placeholder="Bairro" error={addressValidationAttempted ? addressErrors.neighborhood : ''} /><View style={styles.inline}><Field label="Cidade" value={city} setValue={setCity} required placeholder="Cidade" error={addressValidationAttempted ? addressErrors.city : ''} /><Field label="Estado" value={state} setValue={setState} required placeholder="Estado" error={addressValidationAttempted ? addressErrors.state : ''} /></View><Field label="Quem irá receber?" value={receiverName} setValue={setReceiverName} required placeholder="Nome do recebedor" error={addressValidationAttempted ? addressErrors.receiverName : ''} />{!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}</Card>)}
     {step === 'payment' && <>
       <ThemedText style={styles.pageTitle}>Escolha como pagar</ThemedText>
       <Pressable accessibilityState={{ selected: cardPaymentSelected }} disabled={saving} onPress={() => cardMethod ? openCardPayment(cardMethod) : setMessage('Cartão de crédito não está disponível para este carrinho.')} style={[styles.paymentCard, cardPaymentSelected && styles.paymentCardSelected]}>
         <View style={styles.paymentHeader}><CreditCardIcon color="#0a0a0a" size={21} /><ThemedText style={styles.sectionTitle}>Cartão de Crédito</ThemedText></View>
         <View style={styles.paymentDivider} />
         <ThemedText style={styles.bodyText} themeColor="textSecondary">+ novo cartão</ThemedText>
       </Pressable>
        <GiftCardPaymentSection
          voucher={voucher}
         onVoucherChange={(text) => { setVoucher(text.normalize('NFC')); setGiftCardVoucherDetails(null); if (voucherMessage) { setVoucherMessage(''); setVoucherMessageType(null); } }}
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
          selected={selectedPaymentIsGiftCard}
          giftCardAvailability={giftCardAvailability}
          giftCardIdentityVerified={giftCardIdentityVerified}
          giftCardCreditsHidden={giftCardCreditsHidden}
          availableGiftCards={availableGiftCards}
          giftCardDetailsLoading={giftCardDetailsLoading}
          applyingAvailableGiftCard={applyingAvailableGiftCard}
          onShowCredits={() => setGiftCardIdentityVisible(true)}
          onApplyAvailableGiftCard={(giftCard) => { void applyAvailableGiftCard(giftCard); }}
        />
       {!!message && <ThemedText style={message.includes('adicionado') ? styles.successText : styles.errorText}>{message}</ThemedText>}
       <Pressable accessibilityState={{ selected: pixPaymentSelected }} disabled={saving} onPress={() => pixMethod ? choosePayment(pixMethod.id, pixMethod.name || 'Pix') : setMessage('Pix não está disponível para este carrinho.')} style={[styles.paymentCard, pixPaymentSelected && styles.paymentCardSelected]}>
         <ThemedText style={styles.sectionTitle}>Pix</ThemedText>
         <ThemedText style={styles.bodyText} themeColor="textSecondary">Pagamento instantâneo</ThemedText>
         <View style={styles.pixInfo}><PaymentBrandIcon brand="pix" width={58} height={30} /><ThemedText style={styles.bodyText} themeColor="textSecondary">O código Pix será exibido na próxima etapa, após a revisão do seu pedido.</ThemedText></View>
       </Pressable>
       <Summary orderForm={orderForm} shippingPrice={selectedShipping?.price} />
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
          <ReviewItemsDisclosure items={orderForm.items} expanded={reviewItemsExpanded} onToggle={() => setReviewItemsExpanded((current) => !current)} />
         <Pressable onPress={() => setStep('shipping')}><ThemedText style={styles.link}>ALTERAR</ThemedText></Pressable>
       </Card>
       <Card>
          <ReviewHeader icon="card" title="PAGAMENTO" />
          <View style={styles.paymentReviewCard}>
            {selectedPayment && !selectedPaymentIsGiftCard && (selectedPaymentLabel.toLowerCase().includes('pix')
              ? <><PaymentBrandIcon brand="pix" width={78} height={39} /><ThemedText style={styles.bodyText}>Aprovação imediata</ThemedText>{appliedGiftCards.length > 0 && giftCardRemainingAmount > 0 && <View style={styles.pixRemainingSummary}><ThemedText style={styles.pixRemainingLabel}>Pagamento restante</ThemedText><ThemedText style={styles.pixRemainingValue}>{money(giftCardRemainingAmount)}</ThemedText></View>}</>
              : <><CreditCardVisual brand={reviewCardBrand} cardNumber={cardNumber} holderName={cardHolder} expiry={cardExpiry} cvv={cardCvv} masked compact /><View style={styles.installmentSummary}><ThemedText style={styles.installmentSummaryLabel}>Parcelamento</ThemedText><ThemedText style={styles.installmentSummaryValue}>{selectedInstallment ? selectedInstallment.count + 'x ' + money(selectedInstallment.value) : '1x ' + money(paymentAmountAfterGiftCards(orderForm))}</ThemedText></View></>)}
            {appliedGiftCards.length > 0 && <GiftCardPaymentReview giftCards={appliedGiftCards} />}
          </View>
         <Pressable onPress={() => setStep('payment')}><ThemedText style={styles.link}>ALTERAR</ThemedText></Pressable>
       </Card>
       {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
     </>}
  </ScrollView><AddToCartFeedback key={cartAddFeedbackKey} message={step === 'cart' ? cartAddMessage : null} /><Modal visible={Boolean(pendingRemoval)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPendingRemoval(null)}><View style={styles.modalOverlay}><Pressable accessibilityLabel="Fechar confirmação de remoção" onPress={() => setPendingRemoval(null)} style={StyleSheet.absoluteFill} /><ThemedView style={styles.modalCard}><ThemedText style={styles.modalTitle}>Deseja remover <ThemedText style={styles.modalTitleProduct}>{pendingRemoval?.name}</ThemedText> do carrinho?</ThemedText><Pressable disabled={Boolean(updatingItem)} onPress={confirmItemRemoval} style={styles.modalDeleteButton}><ThemedText style={styles.buttonText}>Excluir</ThemedText></Pressable><Pressable onPress={() => setPendingRemoval(null)} style={styles.modalCancelButton}><ThemedText style={styles.dataLabel}>Cancelar</ThemedText></Pressable></ThemedView></View></Modal><GiftCardIdentityModal visible={giftCardIdentityVisible} checkoutEmail={email} onClose={() => setGiftCardIdentityVisible(false)} onAuthenticated={completeGiftCardIdentity} /><View style={styles.fixedFooter}>{step === 'cart' && <Primary title="Finalizar compra" onPress={beginCheckout} />}{step === 'email' && <Primary title={saving ? 'Consultando...' : 'Continuar'} onPress={continueWithEmail} />}{step === 'customer' && <Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={customerExists && !editingCustomer ? continueCustomer : saveCustomer} />}{step === 'address' && <Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={addressSaved && !editingAddress ? continueWithSavedAddress : saveAddress} />}{step === 'payment' && <Primary title={saving ? 'Continuando...' : 'Continuar'} onPress={continueWithSelectedPayment} />}{step === 'card' && <Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={continueWithCard} />}{step === 'review' && <Primary title={saving ? 'Enviando...' : 'Finalizar Compra'} onPress={finishOrder} />}</View></SafeAreaView></ThemedView>;
}

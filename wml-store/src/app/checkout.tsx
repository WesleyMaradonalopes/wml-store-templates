import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getAccountSession } from '@/services/auth';
import { addCouponToCart, getOrderForm, OrderForm, selectPaymentMethod, selectShippingOption, updateCartItem, updateClientProfile, updateShippingAddress, type CartItem } from '@/services/cart';
import { getCustomerAddressesFromMasterData, getCustomerProfileFromMasterData, type CustomerAddress, type CustomerProfile } from '@/services/customer';

type Step = 'cart' | 'email' | 'customer' | 'address' | 'shipping' | 'payment' | 'card' | 'review';
type CustomerCheckoutData = { profile: CustomerProfile | null; addresses: CustomerAddress[] };
type ShippingOption = NonNullable<OrderForm['shippingData']>['logisticsInfo'][number]['slas'][number];

function digits(value: string) { return value.replace(/\D/g, ''); }
function validEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function isShippingStep(step: Step): boolean { return step === 'shipping'; }
function shippingOptionKey(sla: ShippingOption) { return sla.id || sla.name || `${sla.shippingEstimate}-${sla.deliveryChannel || 'delivery'}`; }

function getShippingOptions(orderForm: OrderForm): ShippingOption[] {
  const options = new Map<string, ShippingOption>();
  for (const info of orderForm.shippingData?.logisticsInfo ?? []) {
    for (const sla of info.slas) {
      const key = shippingOptionKey(sla);
      const existing = options.get(key);
      if (existing) {
        existing.price += sla.price;
        if (!existing.shippingEstimate && sla.shippingEstimate) existing.shippingEstimate = sla.shippingEstimate;
      } else {
        options.set(key, { ...sla });
      }
    }
  }
  return [...options.values()];
}

function getDefaultShippingOptionId(orderForm: OrderForm, options = getShippingOptions(orderForm)) {
  const current = orderForm.shippingData?.logisticsInfo.find((info) => info.selectedSla)?.selectedSla;
  if (current && options.some((option) => (option.id || option.name) === current)) return current;
  return options[0]?.id || options[0]?.name || '';
}

function getShippingSelectionId(orderForm: OrderForm, options: ShippingOption[], selectedId?: string | null) {
  if (selectedId && options.some((option) => (option.id || option.name) === selectedId)) return selectedId;
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
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [coupon, setCoupon] = useState('');
  const [voucher, setVoucher] = useState('');
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

      // Nunca reaproveita os dados pessoais que outro e-mail anexou ao mesmo
      // carrinho. A sessão atual é a fonte de verdade para o checkout.
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

  function back() {
    const previous: Record<Step, Step | null> = { cart: null, email: 'cart', customer: 'email', address: 'customer', shipping: 'address', payment: 'shipping', card: 'payment', review: 'payment' };
    const target = previous[step];
    if (target) setStep(target); else router.back();
  }

  async function saveCustomer() {
    if (!orderForm || !validEmail(email) || !firstName.trim() || !lastName.trim()) return setMessage('Informe e-mail, nome e sobrenome.');
    setSaving(true); setMessage('');
    try { setOrderForm(await updateClientProfile({ orderFormId: orderForm.orderFormId, email, firstName, lastName, document: digits(document), phone: digits(phone), gender: gender || undefined })); setStep('address'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar os dados.'); } finally { setSaving(false); }
  }

  async function continueWithEmail() {
    if (!validEmail(email)) return setMessage('Informe um e-mail válido.');
    setSaving(true); setMessage('');
    try {
      const { profile, addresses } = await loadCustomerData(email);
      if (profile) {
        setCustomerExists(true); setEditingCustomer(false); applyProfile(profile, email);
        setCustomerAddresses(addresses);
        const preferred = addresses.find((item) => item.postalCode && item.street);
        if (preferred) applyAddress(preferred);
        setStep('customer');
      } else { setCustomerExists(false); setEditingCustomer(true); setFirstName(''); setLastName(''); setDocument(''); setPhone(''); setGender(''); setCustomerAddresses([]); setAddressSaved(false); setStep('customer'); }
    } catch {
      setCustomerExists(false); setEditingCustomer(true); setStep('customer');
    } finally { setSaving(false); }
  }

  function applyProfile(profile: CustomerProfile, fallbackEmail = '') {
    setEmail(fallbackEmail || profile.email || ''); setFirstName(profile.firstName || ''); setLastName(profile.lastName || ''); setDocument(profile.document || ''); setPhone(profile.phone || profile.homePhone || ''); setGender(profile.gender || '');
  }

  function applyAddress(address: CustomerAddress | NonNullable<NonNullable<OrderForm['shippingData']>['selectedAddresses']>[number]) {
    const id = String(('id' in address ? address.id : '') || `${address.postalCode || ''}-${address.street || ''}-${address.number || ''}`);
    setSelectedAddressId(id); setAddressSaved(true); setEditingAddress(false);
    setReceiverName(address.receiverName ?? ''); setPostalCode(address.postalCode ?? ''); setStreet(address.street ?? ''); setNumber(address.number ?? ''); setComplement(address.complement ?? ''); setNeighborhood(address.neighborhood ?? ''); setCity(address.city ?? ''); setState(address.state ?? '');
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
    } finally { setSaving(false); }
  }

  function chooseShippingLocally(slaId: string) {
    setSelectedSla(slaId);
    setMessage('');
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
    } finally { setSaving(false); }
  }

  async function lookupCep(value: string) {
    const cep = digits(value); setPostalCode(value);
    if (cep.length !== 8) return;
    const result = await fetch(`https://viacep.com.br/ws/${cep}/json/`).then((response) => response.ok ? response.json() : null).catch(() => null);
    if (result && !result.erro) { setStreet(result.logradouro ?? ''); setNeighborhood(result.bairro ?? ''); setCity(result.localidade ?? ''); setState(result.uf ?? ''); }
  }

  async function saveAddress() {
    if (!orderForm || !receiverName || !postalCode || !street || !number || !neighborhood || !city || !state) return setMessage('Preencha o endereço completo.');
    setSaving(true); setMessage('');
    try { setOrderForm(await updateShippingAddress({ orderFormId: orderForm.orderFormId, address: { receiverName, postalCode: digits(postalCode), street, number, complement, neighborhood, city, state } })); setAddressSaved(true); setEditingAddress(false); setStep('shipping'); }
    catch { setMessage('Não foi possível calcular a entrega.'); } finally { setSaving(false); }
  }

  async function chooseShipping(slaId: string) {
    if (!orderForm) return;
    setSelectedSla(slaId); setSaving(true);
    try { setOrderForm(await selectShippingOption({ orderFormId: orderForm.orderFormId, address: { receiverName, postalCode: digits(postalCode), street, number, complement, neighborhood, city, state }, logisticsInfo: orderForm.shippingData?.logisticsInfo ?? [], slaId })); setStep('payment'); }
    catch { setMessage('Não foi possível selecionar esta entrega.'); } finally { setSaving(false); }
  }

  async function choosePayment(paymentSystem: string) {
    if (!orderForm) return;
    setSelectedPayment(paymentSystem); setSaving(true);
    try { setOrderForm(await selectPaymentMethod({ orderFormId: orderForm.orderFormId, paymentSystem, value: orderForm.value })); setStep('review'); }
    catch { setMessage('Não foi possível selecionar esta forma de pagamento.'); } finally { setSaving(false); }
  }

  async function applyCoupon() {
    if (!orderForm || !coupon.trim()) return;
    setSaving(true); try { setOrderForm(await addCouponToCart(orderForm.orderFormId, coupon.trim())); setMessage('Cupom aplicado.'); } catch { setMessage('Cupom inválido.'); } finally { setSaving(false); }
  }

  async function changeItemQuantity(index: number, itemId: string, quantity: number) {
    if (!orderForm || updatingItem) return;
    setUpdatingItem(itemId); setMessage('');
    try {
      setOrderForm(await updateCartItem({ orderFormId: orderForm.orderFormId, index, itemId, sellerId: orderForm.items.find((item) => item.id === itemId)?.seller, quantity: Math.max(0, quantity) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o produto.');
    } finally { setUpdatingItem(null); }
  }

  function confirmItemRemoval() {
    if (!pendingRemoval || updatingItem) return;
    const item = pendingRemoval;
    setPendingRemoval(null);
    void changeItemQuantity(item.index, item.id, 0);
  }

  if (loading) return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ActivityIndicator color="#000000" /></SafeAreaView></ThemedView>;
  if (!orderForm) return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ThemedText>{message || 'Carrinho vazio.'}</ThemedText></SafeAreaView></ThemedView>;

  if (orderForm.items.length === 0) return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Carrinho" onBack={() => router.replace('/')} showSearch={false} showCart /><View style={styles.emptyState}><ThemedText type="subtitle">Seu carrinho está vazio</ThemedText><ThemedText themeColor="textSecondary">Encontre produtos para continuar sua compra.</ThemedText><Primary title="Encontrar produtos" onPress={() => router.replace('/')} /></View></SafeAreaView></ThemedView>;

  const slas = getShippingOptions(orderForm);
  if (step === 'address' && addressSelectionOpen && customerAddresses.length > 1) {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Entrega" onBack={() => setAddressSelectionOpen(false)} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="smallBold">Selecione um endereço para entrega</ThemedText>
      <View style={styles.addressList}>{customerAddresses.map((address) => {
        const addressId = String(address.id || `${address.postalCode || ''}-${address.street || ''}-${address.number || ''}`);
        const selected = selectedAddressId === addressId;
        return <Pressable key={addressId} onPress={() => { applyAddress(address); setAddressSelectionOpen(false); }} style={[styles.addressOption, selected && styles.addressOptionSelected]}><Radio selected={selected} /><View style={styles.addressDetails}><ThemedText type="smallBold">{address.addressName || `${address.street}, ${address.number}`}</ThemedText><ThemedText>{address.street}, {address.number}{address.complement ? ` - ${address.complement}` : ''}</ThemedText><ThemedText themeColor="textSecondary">{address.neighborhood} - {address.city}/{address.state}</ThemedText><ThemedText themeColor="textSecondary">CEP: {address.postalCode}</ThemedText></View></Pressable>;
      })}</View>
    </ScrollView><View style={styles.fixedFooter}><Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={continueWithSavedAddress} /><Secondary title="Alterar endereço de entrega" onPress={() => { setAddressSelectionOpen(false); setEditingAddress(true); }} /></View></SafeAreaView></ThemedView>;
  }

  if (isShippingStep(step)) {
    const selectedShippingId = getShippingSelectionId(orderForm, slas, selectedSla);
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Entrega" onBack={back} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="smallBold">Como deseja receber seu produto?</ThemedText>
      <ThemedView style={styles.shippingCard}><View style={styles.shippingAddressRow}><ThemedText style={styles.pinIcon}>⌖</ThemedText><ThemedText style={styles.shippingAddressText}>Envio para {street}{number ? `, ${number}` : ''}</ThemedText></View>{slas.length === 0 && <ThemedText themeColor="textSecondary">Nenhuma forma de entrega disponível.</ThemedText>}{slas.map((sla) => { const optionId = sla.id || sla.name; const selected = selectedShippingId === optionId; return <Pressable key={shippingOptionKey(sla)} onPress={() => chooseShippingLocally(optionId)} disabled={saving} style={[styles.shippingOption, selected && styles.shippingOptionSelected]}><Radio selected={selected} /><View style={styles.shippingOptionDetails}><ThemedText type="smallBold">{sla.name}{sla.price === 0 ? ' - Grátis' : ''}</ThemedText><ThemedText themeColor="textSecondary">{sla.price === 0 ? 'Grátis' : `R$ ${sla.price.toFixed(2)}`} · {sla.shippingEstimate}</ThemedText></View></Pressable>; })}</ThemedView>
    </ScrollView><View style={styles.fixedFooter}><Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={continueWithShipping} /><Secondary title="Alterar endereço de entrega" onPress={openAddressSelection} /></View></SafeAreaView></ThemedView>;
  }

  if (step === 'address' && addressSaved && !editingAddress) {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Entrega" onBack={back} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}><ThemedText type="smallBold">Endereço de entrega</ThemedText><ThemedView style={[styles.shippingCard, styles.selectedAddressCard]}><View style={styles.shippingAddressRow}><Radio selected /><View style={styles.addressDetails}><ThemedText type="smallBold">Enviar para {street}, {number}</ThemedText><ThemedText>{receiverName}</ThemedText><ThemedText>{neighborhood} - {city}/{state}</ThemedText><ThemedText themeColor="textSecondary">CEP: {postalCode}</ThemedText></View></View><Pressable onPress={openAddressSelection}><ThemedText style={styles.link}>{customerAddresses.length > 1 ? 'Alterar ou escolher outro endereço' : 'Alterar endereço'}</ThemedText></Pressable></ThemedView></ScrollView><View style={styles.fixedFooter}><Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={continueWithSavedAddress} /><Secondary title="Alterar endereço de entrega" onPress={openAddressSelection} /></View></SafeAreaView></ThemedView>;
  }

  const payments = orderForm.paymentData?.paymentSystems ?? [];
  const title: Record<Step, string> = { cart: 'Carrinho', email: 'Dados pessoais', customer: 'Dados pessoais', address: 'Entrega', shipping: 'Entrega', payment: 'Pagamento', card: 'Novo cartão', review: 'Revise e confirme' };
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title={title[step]} onBack={back} showSearch={false} showCart /><ScrollView contentContainerStyle={styles.content}>
    {step === 'cart' && <><ThemedView style={styles.productsCard}>{orderForm.items.map((item, position) => <View key={`${item.id}-${item.index}`} style={[styles.productBlock, position > 0 && styles.productDivider]}><View style={styles.itemRow}>{!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />}<View style={styles.itemDetails}><View style={styles.itemTopRow}><ThemedText type="smallBold" style={styles.itemName}>{item.name}</ThemedText><Pressable accessibilityLabel={`Remover ${item.name}`} disabled={Boolean(updatingItem)} onPress={() => setPendingRemoval(item)} style={styles.removeButton}><ThemedText style={styles.removeText}>×</ThemedText></Pressable></View><ThemedText type="smallBold">R$ {item.price.toFixed(2)}</ThemedText><View style={styles.itemBottomRow}><View style={styles.quantityControl}><Pressable disabled={Boolean(updatingItem) || item.quantity <= 1} onPress={() => changeItemQuantity(item.index, item.id, item.quantity - 1)} style={styles.quantityButton}><ThemedText>−</ThemedText></Pressable><ThemedText style={styles.quantityCount}>{updatingItem === item.id ? '...' : item.quantity}</ThemedText><Pressable disabled={Boolean(updatingItem)} onPress={() => changeItemQuantity(item.index, item.id, item.quantity + 1)} style={styles.quantityButton}><ThemedText>+</ThemedText></Pressable></View></View></View></View></View>)}<Pressable onPress={() => setGiftWrap((value) => !value)} style={styles.giftRow}><View style={[styles.giftCheckbox, giftWrap && styles.giftCheckboxSelected]}>{giftWrap && <ThemedText style={styles.giftCheck}>✓</ThemedText>}</View><ThemedText style={styles.giftText}>Incluir uma embalagem de presente para o pedido</ThemedText></Pressable></ThemedView><ThemedView style={styles.card}><ThemedText type="smallBold">Cupom de desconto</ThemedText><View style={styles.inline}><TextInput value={coupon} onChangeText={setCoupon} placeholder="Insira o código" style={[styles.input, styles.flex]} /><Pressable onPress={applyCoupon} style={styles.smallButton}><ThemedText style={styles.buttonText}>Adicionar</ThemedText></Pressable></View></ThemedView><FreeShippingProgress value={orderForm.value} /><Summary orderForm={orderForm} /></>}
    {step === 'email' && <><Card><ThemedText type="smallBold">Informe seu e-mail para continuar</ThemedText><ThemedText themeColor="textSecondary">Vamos verificar se você já fez alguma compra com a gente.</ThemedText><TextInput value={email} onChangeText={setEmail} placeholder="Digite seu e-mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} /></Card></>}
    {step === 'customer' && (customerExists && !editingCustomer ? <><Card><ThemedText type="subtitle">Dados pessoais</ThemedText><ThemedText themeColor="textSecondary">E-mail</ThemedText><ThemedText>{email}</ThemedText><ThemedText themeColor="textSecondary">Nome</ThemedText><ThemedText>{firstName || 'Não informado'} {lastName}</ThemedText><ThemedText themeColor="textSecondary">CPF</ThemedText><ThemedText>{document || 'Não informado'}</ThemedText><ThemedText themeColor="textSecondary">Telefone</ThemedText><ThemedText>{phone || 'Não informado'}</ThemedText><ThemedText themeColor="textSecondary">Gênero</ThemedText><ThemedText>{gender || 'Não informado'}</ThemedText><Pressable onPress={() => setEditingCustomer(true)}><ThemedText style={styles.link}>Editar dados</ThemedText></Pressable></Card></> : <><Card><Field label="E-mail" value={email} setValue={setEmail} keyboardType="email-address" /><Field label="Nome" value={firstName} setValue={setFirstName} /><Field label="Sobrenome" value={lastName} setValue={setLastName} /><Field label="Telefone" value={phone} setValue={setPhone} keyboardType="phone-pad" /><Field label="CPF" value={document} setValue={setDocument} keyboardType="numeric" /><ThemedText type="smallBold">Gênero (opcional)</ThemedText><Pressable onPress={() => setGenderOpen((value) => !value)} style={styles.select}><ThemedText>{gender || 'Selecione seu gênero'}</ThemedText><ThemedText>⌄</ThemedText></Pressable>{genderOpen && <View style={styles.dropdown}>{genders.map((option) => <Pressable key={option} onPress={() => { setGender(option); setGenderOpen(false); }} style={styles.option}><ThemedText>{option}</ThemedText></Pressable>)}</View>}</Card></>)}
    {step === 'address' && (addressSaved && !editingAddress ? <Card><ThemedText type="smallBold">Endereço de entrega</ThemedText><ThemedText>{receiverName}</ThemedText><ThemedText>{street}, {number}{complement ? ` - ${complement}` : ''}</ThemedText><ThemedText>{neighborhood} - {city}/{state}</ThemedText><ThemedText>CEP: {postalCode}</ThemedText><Pressable onPress={() => customerAddresses.length > 1 ? setAddressSelectionOpen(true) : setEditingAddress(true)}><ThemedText style={styles.link}>{customerAddresses.length > 1 ? 'Alterar ou escolher outro endereço' : 'Alterar endereço'}</ThemedText></Pressable>{addressSelectionOpen && customerAddresses.length > 1 && <View style={styles.addressList}>{customerAddresses.map((address) => { const addressId = String(address.id || `${address.postalCode || ''}-${address.street || ''}-${address.number || ''}`); return <Pressable key={addressId} onPress={() => { applyAddress(address); setAddressSelectionOpen(false); }} style={[styles.addressOption, selectedAddressId === addressId && styles.selected]}><ThemedText type="smallBold">{address.addressName || 'Enviar para este endereço'}</ThemedText><ThemedText>{address.street}, {address.number}</ThemedText><ThemedText themeColor="textSecondary">{address.neighborhood} - {address.city}/{address.state}</ThemedText><ThemedText themeColor="textSecondary">CEP: {address.postalCode}</ThemedText></Pressable>; })}<Pressable onPress={() => { setAddressSelectionOpen(false); setEditingAddress(true); }}><ThemedText style={styles.link}>Cadastrar outro endereço</ThemedText></Pressable></View>}</Card> : <Card><Field label="CEP" value={postalCode} setValue={lookupCep} keyboardType="numeric" /><Field label="Endereço" value={street} setValue={setStreet} /><View style={styles.inline}><Field label="Número" value={number} setValue={setNumber} /><Field label="Complemento" value={complement} setValue={setComplement} /></View><Field label="Bairro" value={neighborhood} setValue={setNeighborhood} /><View style={styles.inline}><Field label="Cidade" value={city} setValue={setCity} /><Field label="Estado" value={state} setValue={setState} /></View><Field label="Quem irá receber?" value={receiverName} setValue={setReceiverName} /></Card>)}
    {step === 'shipping' && <><ThemedText type="smallBold">Como deseja receber seu produto?</ThemedText>{slas.map((sla) => <Pressable key={shippingOptionKey(sla)} disabled={saving} onPress={() => chooseShipping(sla.id || sla.name)} style={[styles.option, selectedSla === (sla.id || sla.name) && styles.selected]}><ThemedText type="smallBold">{sla.name}</ThemedText><ThemedText themeColor="textSecondary">R$ {sla.price.toFixed(2)} · {sla.shippingEstimate}</ThemedText></Pressable>)}</>}
    {step === 'payment' && <><ThemedText type="smallBold">Escolha como pagar</ThemedText>{payments.map((method) => <Pressable key={method.id} onPress={() => method.group.toLowerCase().includes('card') || method.name.toLowerCase().includes('cart') ? setStep('card') : choosePayment(method.id)} style={styles.option}><ThemedText type="smallBold">{method.name}</ThemedText><ThemedText themeColor="textSecondary">{method.group}</ThemedText></Pressable>)}<Card><ThemedText type="smallBold">Vale presente</ThemedText><View style={styles.inline}><TextInput value={voucher} onChangeText={setVoucher} placeholder="Código do vale" style={[styles.input, styles.flex]} /><Pressable style={styles.smallButton}><ThemedText style={styles.buttonText}>Adicionar</ThemedText></Pressable></View></Card><Pressable onPress={() => choosePayment(payments.find((item) => item.group.toLowerCase().includes('pix') || item.name.toLowerCase().includes('pix'))?.id ?? '6')} style={styles.option}><ThemedText type="smallBold">Pix</ThemedText><ThemedText themeColor="textSecondary">Pagamento instantâneo</ThemedText></Pressable></>}
    {step === 'card' && <><Card><Field label="Número do cartão" value="" setValue={() => undefined} placeholder="Insira o número do seu cartão" keyboardType="numeric" /><Field label="Nome impresso no cartão" value="" setValue={() => undefined} placeholder="Nome impresso no cartão" /><View style={styles.inline}><Field label="Validade" value="" setValue={() => undefined} placeholder="MM/AA" /><Field label="CVV" value="" setValue={() => undefined} placeholder="CVV" keyboardType="numeric" /></View><ThemedText themeColor="textSecondary">Os dados serão tokenizados pela VTEX antes do pagamento.</ThemedText></Card></>}
    {step === 'review' && <><ThemedText type="smallBold">Revise e confirme</ThemedText><Summary orderForm={orderForm} /><Card><ThemedText type="smallBold">DADOS PESSOAIS</ThemedText><ThemedText>{email}</ThemedText><ThemedText>{firstName} {lastName}</ThemedText><ThemedText>{phone}</ThemedText></Card><Card><ThemedText type="smallBold">ENTREGA</ThemedText><ThemedText>{street}, {number} - {city}/{state}</ThemedText><ThemedText>{selectedSla || 'Entrega selecionada'}</ThemedText></Card><Card><ThemedText type="smallBold">PAGAMENTO</ThemedText><ThemedText>{selectedPayment || 'Pagamento selecionado'}</ThemedText></Card>{!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}</>}
  </ScrollView><Modal visible={Boolean(pendingRemoval)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPendingRemoval(null)}><View style={styles.modalOverlay}><ThemedView style={styles.modalCard}><ThemedText type="subtitle" style={styles.modalTitle}>Deseja remover {pendingRemoval?.name} do carrinho?</ThemedText><Pressable disabled={Boolean(updatingItem)} onPress={confirmItemRemoval} style={styles.modalDeleteButton}><ThemedText style={styles.buttonText}>Excluir</ThemedText></Pressable><Pressable onPress={() => setPendingRemoval(null)} style={styles.modalCancelButton}><ThemedText type="smallBold">Cancelar</ThemedText></Pressable></ThemedView></View></Modal><View style={styles.fixedFooter}>{step === 'cart' && <Primary title="Finalizar compra" onPress={() => setStep('email')} />}{step === 'email' && <Primary title={saving ? 'Consultando...' : 'Continuar'} onPress={continueWithEmail} />}{step === 'customer' && <Primary title={saving ? 'Salvando...' : 'Continuar'} onPress={saveCustomer} />}{step === 'address' && <Primary title={saving ? 'Calculando...' : 'Continuar'} onPress={addressSaved && !editingAddress ? () => setStep('shipping') : saveAddress} />}{step === 'card' && <Primary title="Continuar" onPress={() => setStep('payment')} />}{step === 'review' && <Primary title="Finalizar compra" onPress={() => setMessage('A finalização será habilitada após conectar a tokenização e o endpoint seguro de pagamento VTEX.')} />}</View></SafeAreaView></ThemedView>;
}

function Card({ children }: { children: React.ReactNode }) { return <ThemedView style={styles.card}>{children}</ThemedView>; }
function Field({ label, value, setValue, placeholder, keyboardType }: { label: string; value: string; setValue: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address' }) { return <View style={styles.field}><ThemedText type="smallBold">{label}</ThemedText><TextInput value={value} onChangeText={setValue} placeholder={placeholder || label} keyboardType={keyboardType} style={styles.input} /></View>; }
function Primary({ title, onPress }: { title: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.primary}><ThemedText style={styles.buttonText}>{title}</ThemedText></Pressable>; }
function Secondary({ title, onPress }: { title: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.secondary}><ThemedText style={styles.secondaryText}>{title}</ThemedText></Pressable>; }
function Radio({ selected }: { selected: boolean }) { return <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>; }
function Summary({ orderForm }: { orderForm: OrderForm }) { return <Card><ThemedText type="smallBold">Resumo</ThemedText><View style={styles.summary}><ThemedText>Subtotal</ThemedText><ThemedText>R$ {orderForm.value.toFixed(2)}</ThemedText></View><View style={styles.summary}><ThemedText type="smallBold">Total</ThemedText><ThemedText type="smallBold">R$ {orderForm.value.toFixed(2)}</ThemedText></View></Card>; }
function FreeShippingProgress({ value }: { value: number }) {
  const target = 249;
  const remaining = Math.max(0, target - value);
  const progress = Math.min(1, value / target);
  return <View style={styles.progressCard}><ThemedText type="smallBold">{remaining > 0 ? `Faltam R$ ${remaining.toFixed(2)} para Frete Grátis` : 'Frete grátis desbloqueado'}</ThemedText><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  content: { gap: Spacing.three, paddingVertical: Spacing.three, paddingBottom: 170 },
  flex: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
  productsCard: { padding: Spacing.three, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
  productBlock: { paddingVertical: Spacing.one },
  productDivider: { marginTop: Spacing.two, paddingTop: Spacing.three, borderTopWidth: 1, borderTopColor: '#ece8e2' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  itemImage: { width: 64, height: 84, borderRadius: 8, backgroundColor: '#e8e8ea' },
  itemDetails: { flex: 1, gap: 5 },
  itemTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one },
  itemName: { flex: 1 },
  itemBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  quantityControl: { minHeight: 34, flexDirection: 'row', alignItems: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#cfc8bf', overflow: 'hidden' },
  quantityButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  quantityCount: { minWidth: 24, textAlign: 'center' },
  removeButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#B42318', fontSize: 22, lineHeight: 22 },
  giftRow: { marginTop: Spacing.three, paddingTop: Spacing.three, borderTopWidth: 1, borderTopColor: '#ece8e2', flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  giftCheckbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#aaa49c', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  giftCheckboxSelected: { borderColor: '#1e120d', backgroundColor: '#1e120d' },
  giftCheck: { color: '#FFFFFF', fontSize: 13, lineHeight: 15, fontWeight: '700' },
  giftText: { flex: 1, fontSize: 13 },
  field: { flex: 1, gap: 4 },
  input: { minHeight: 46, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d9d3cc', backgroundColor: '#FFFFFF' },
  inline: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  select: { padding: Spacing.three, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#d9d3cc', flexDirection: 'row', justifyContent: 'space-between' },
  dropdown: { borderWidth: 1, borderColor: '#d9d3cc', borderRadius: 10, backgroundColor: '#FFFFFF' },
  addressList: { gap: Spacing.two, marginTop: Spacing.two },
  addressOption: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.two, borderRadius: 12, borderWidth: 1, borderColor: '#d9d3cc', backgroundColor: '#fbfaf7' },
  addressOptionSelected: { borderColor: '#1e120d', borderWidth: 2 },
  addressDetails: { flex: 1, gap: 4 },
  link: { color: '#1e120d', textDecorationLine: 'underline' },
  primary: { padding: Spacing.four, borderRadius: 10, alignItems: 'center', backgroundColor: '#1e120d' },
  secondary: { minHeight: 48, padding: Spacing.three, borderRadius: 10, borderWidth: 1, borderColor: '#1e120d', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  secondaryText: { color: '#1e120d', fontWeight: '700' },
  fixedFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: Spacing.two, padding: Spacing.two, paddingBottom: Spacing.three, backgroundColor: '#fbfaf7' },
  smallButton: { padding: 12, borderRadius: 10, backgroundColor: '#1e120d' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  option: { gap: 4, padding: Spacing.three, borderRadius: 14, borderWidth: 1, borderColor: '#d9d3cc', backgroundColor: '#FFFFFF' },
  selected: { borderColor: '#1e120d', borderWidth: 2 },
  selectedAddressCard: { gap: Spacing.three },
  shippingCard: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e6e1da' },
  shippingAddressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pinIcon: { fontSize: 22, color: '#1e120d' },
  shippingAddressText: { flex: 1 },
  shippingOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: 10, borderWidth: 1, borderColor: '#b0a69b', backgroundColor: '#FFFFFF' },
  shippingOptionSelected: { borderColor: '#1e120d', borderWidth: 2 },
  shippingOptionDetails: { flex: 1, gap: 4 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#b0a69b', alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: '#1e120d' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1e120d' },
  summary: { flexDirection: 'row', justifyContent: 'space-between' },
  progressCard: { gap: 8, padding: Spacing.two, borderRadius: 10, backgroundColor: '#f4f0e9' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#e3ded5' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#2f8f5b' },
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five, backgroundColor: 'rgba(0, 0, 0, 0.62)' },
  modalCard: { width: '100%', maxWidth: 340, gap: Spacing.two, padding: Spacing.four, borderRadius: 6, backgroundColor: '#FFFFFF' },
  modalTitle: { textAlign: 'center', lineHeight: 26, fontSize: 18, marginBottom: Spacing.two },
  modalDeleteButton: { minHeight: 48, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e120d' },
  modalCancelButton: { minHeight: 48, borderRadius: 4, borderWidth: 1, borderColor: '#4c433c', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
});

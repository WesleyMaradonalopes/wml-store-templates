import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartIconButton } from '@/components/cart-icon-button';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import CreditCardIcon from '@/components/icons/CreditCardIcon';
import EyeIcon from '@/components/icons/EyeIcon';
import HopeLogoIcon from '@/components/icons/HopeLogoIcon';
import TruckIcon from '@/components/icons/TruckIcon';
import UserIcon from '@/components/icons/UserIcon';
import { PaymentBrandIcon, type PaymentBrand } from '@/components/payment-brand';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loginVtexPassword, sendVtexAccessKey, startVtexAuthentication, validateVtexAccessKey } from '@/services/auth';
import { OrderForm, type CartItem, type GiftCard, type InstallmentChoice } from '@/services/cart';
import { formatBirthDate, formatGenderLabel, formatPhoneWithoutCountryCode } from '@/utils/customer-formatters';
import { getCheckoutProductImageUrl } from '@/utils/product-images';
import {
  digits,
  validEmail,
  money,
  formatOrderDate,
  pickupStoreName,
  pickupAddressLines,
  giftCardAppliedValue,
  giftCardDisplayCode,
  giftCardCreditLabel,
  giftCardsTotal,
  giftCardsCoverOrder,
  formatPixTime,
  shippingPriceAndEstimate,
  type ShippingOption,
  type GiftCardAvailability,
  type ParsedPixPayment
} from '@/utils/checkout';
import { styles } from '@/styles/checkout.styles';

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

export function CreditCardVisual({
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

export function AcceptedBrands() {
  const brands: PaymentBrand[] = ['amex', 'visa', 'diners', 'mastercard', 'hipercard', 'elo'];
  return <View style={styles.acceptedBrands}><ThemedText style={styles.acceptedTitle}>Bandeiras aceitas:</ThemedText><View style={styles.brandRow}>{brands.map((brand) => <PaymentBrandIcon key={brand} brand={brand} width={42} height={27} />)}</View></View>;
}

export function InstallmentsScreen({
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
          <View style={styles.installmentOptionRight}>{option.count > 1 && <ThemedText style={styles.installmentTotal}>{money(option.total)}</ThemedText>}<ChevronRightIcon color="#0a0a0a" size={20} /></View>
        </Pressable>)}</View>
      </ScrollView>
    </SafeAreaView>
  </ThemedView>;
}

export function PixPaymentScreen({
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
            <ThemedText style={styles.pixToastCloseText}>✕</ThemedText>
          </Pressable>
        </View>}
      </View>
    </SafeAreaView>
  </ThemedView>;
}

export function OrderSuccessScreen({
  orderId,
  email,
  fullName,
  document,
  phone,
  receiverName,
  street,
  number,
  complement,
  neighborhood,
  city,
  state,
  postalCode,
  onOrders,
  onHome,
}: {
  orderId: string;
  email: string;
  fullName: string;
  document: string;
  phone: string;
  receiverName: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  onOrders: () => void;
  onHome: () => void;
}) {
  const displayOrderId = orderId.startsWith('#') ? orderId : `#${orderId}`;
  const infoRow = (value: string, key: string) => <ThemedText key={key} style={styles.orderSuccessInfo}>{value || 'Não informado'}</ThemedText>;

  return <ThemedView style={styles.container}>
    <SafeAreaView style={styles.orderSuccessSafeArea}>
      <View style={styles.orderSuccessHeader}>
        <HopeLogoIcon color="#0a0a0a" width={88} height={23} />
        <CartIconButton color="#0a0a0a" />
      </View>
      <ScrollView contentContainerStyle={styles.orderSuccessContent} showsVerticalScrollIndicator={false}>
        <View style={styles.orderSuccessMessageCard}>
          <View style={styles.orderSuccessIcon}><ThemedText style={styles.orderSuccessCheck}>✓</ThemedText></View>
          <ThemedText style={styles.orderSuccessTitle}>Obrigada por sua compra!</ThemedText>
          <ThemedText style={styles.orderSuccessDescription}>
            Em até 5 minutos, vamos mandar um e-mail para {email || 'seu e-mail'} com todos os detalhes do seu pedido.{`\n`}Confira a caixa de spam ou aba de promoções.
          </ThemedText>
        </View>

        <View style={styles.orderSuccessDetailsCard}>
          <ThemedText style={styles.orderSuccessSectionTitle}>Pedido</ThemedText>
          <ThemedText style={styles.orderSuccessId}>{displayOrderId}</ThemedText>
          <ThemedText style={styles.orderSuccessMeta}>Realizado em {formatOrderDate()}</ThemedText>
          <Pressable onPress={onOrders} style={styles.orderSuccessOrdersButton}><ThemedText style={styles.orderSuccessOrdersButtonText}>Ver meus pedidos</ThemedText></Pressable>

          <View style={styles.orderSuccessDivider} />
          <View style={styles.orderSuccessSectionHeader}><UserIcon color="#0a0a0a" size={19} /><ThemedText style={styles.orderSuccessSectionTitle}>Dados 1pessoais</ThemedText></View>
          <View style={styles.orderSuccessInfoList}>
            {infoRow(email, 'email')}
            {infoRow(fullName, 'name')}
            {infoRow(document, 'document')}
            {infoRow(formatPhoneWithoutCountryCode(phone), 'phone')}
          </View>

          <View style={styles.orderSuccessDivider} />
          <View style={styles.orderSuccessSectionHeader}><TruckIcon color="#0a0a0a" size={19} /><ThemedText style={styles.orderSuccessSectionTitle}>Entrega</ThemedText></View>
          <View style={styles.orderSuccessInfoList}>
            {infoRow(receiverName || fullName, 'receiver')}
            {infoRow([street, number].filter(Boolean).join(', ') + (complement ? ` - ${complement}` : ''), 'street')}
            {infoRow([neighborhood, city, state].filter(Boolean).join(' - '), 'city')}
            {infoRow(postalCode ? `CEP ${postalCode}` : '', 'postalCode')}
          </View>
        </View>

        <Pressable onPress={onHome} style={styles.orderSuccessHomeButton}><ThemedText style={styles.orderSuccessHomeButtonText}>Voltar ao início</ThemedText></Pressable>
      </ScrollView>
    </SafeAreaView>
  </ThemedView>;
}

export function CheckoutProductImage({ imageUrl, label, style }: { imageUrl: string; label: string; style: StyleProp<ImageStyle> }) {
  const highResolutionUrl = getCheckoutProductImageUrl(imageUrl);
  if (!highResolutionUrl) return null;
  return <Image
    accessibilityLabel={label}
    allowDownscaling={false}
    cachePolicy="memory-disk"
    contentFit="cover"
    source={{ uri: highResolutionUrl }}
    style={style}
  />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <ThemedView style={[styles.card, style]}>{children}</ThemedView>; }
export function CustomerDataSummary({ email, firstName, lastName, phone, birthDate, document, gender, onEdit }: { email: string; firstName: string; lastName: string; phone: string; birthDate: string; document: string; gender: string; onEdit: () => void }) {
  const row = (label: string, value: string) => <View style={styles.customerDataRow}><ThemedText style={styles.customerDataLabel}>{label}</ThemedText><ThemedText style={styles.customerDataValue}>{value || 'Não informado'}</ThemedText></View>;
  return <ThemedView style={[styles.card, styles.customerDataCard]}>
    <ThemedText style={styles.customerDataTitle}>Dados Pessoais</ThemedText>
    <View style={styles.customerDataRows}>
      {row('E-mail', email)}
      {row('Nome', `${firstName} ${lastName}`.trim())}
      {row('Telefone com DDD', formatPhoneWithoutCountryCode(phone))}
      {row('Data de nascimento', formatBirthDate(birthDate))}
      {row('CPF', document)}
      {row('Gênero', formatGenderLabel(gender))}
    </View>
    <View style={styles.customerDataEditSection}>
      <Pressable onPress={onEdit}><ThemedText style={styles.customerDataEditLink}>Editar dados pessoais</ThemedText></Pressable>
    </View>
  </ThemedView>;
}
export function CustomerReviewData({ email, firstName, lastName, phone, document }: { email: string; firstName: string; lastName: string; phone: string; document: string }) {
  return <View style={styles.customerReviewData}>
    <ThemedText style={styles.customerReviewValue}>{email}</ThemedText>
    <ThemedText style={styles.customerReviewValue}>{`${firstName} ${lastName}`.trim()}</ThemedText>
		<ThemedText style={styles.customerReviewValue}>{document || 'Não informado'}</ThemedText>
    <ThemedText style={styles.customerReviewValue}>{formatPhoneWithoutCountryCode(phone) || 'Não informado'}</ThemedText>
  </View>;
}
export function PickupStoreCard({ option, selected, disabled, onPress }: { option: ShippingOption; selected: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.pickupStoreCard, selected && styles.shippingOptionSelected]}>
    <Radio selected={selected} />
    <View style={styles.shippingOptionDetails}>
      <ThemedText style={styles.pickupStoreName}>{pickupStoreName(option)}</ThemedText>
      {pickupAddressLines(option).map((line, index) => <ThemedText style={styles.bodyText} key={line + index} themeColor="textSecondary">{line}</ThemedText>)}
      <ThemedText style={styles.bodyText} themeColor="textSecondary">{shippingPriceAndEstimate(option)}</ThemedText>
    </View>
  </Pressable>;
}
export function Field({ label, value, setValue, placeholder, keyboardType, required = false, error = '', accessory, trailingAction, style, variant = 'default' }: { label: string; value: string; setValue: (value: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address'; required?: boolean; error?: string; accessory?: ReactNode; trailingAction?: ReactNode; style?: StyleProp<ViewStyle>; variant?: 'default' | 'personal' }) {
  const isFreeText = !keyboardType || keyboardType === 'default';
  const inputMode = isFreeText ? 'text' : keyboardType === 'email-address' ? 'email' : keyboardType === 'phone-pad' ? 'tel' : 'numeric';
  return <View style={[styles.field, variant === 'personal' && styles.personalField, style]}><ThemedText style={[styles.fieldLabel, variant === 'personal' && styles.personalFieldLabel]}>{label + (required ? ' *' : '')}</ThemedText><View style={trailingAction ? styles.fieldActionRow : undefined}><View style={trailingAction ? styles.fieldActionInput : undefined}><View style={styles.inputWrap}><TextInput value={value} onChangeText={setValue} placeholder={placeholder || label} keyboardType={keyboardType || 'default'} inputMode={inputMode} autoCapitalize={isFreeText ? 'sentences' : 'none'} autoCorrect={false} spellCheck={false} placeholderTextColor="#0a0a0a" style={[styles.input, variant === 'personal' && styles.personalInput, accessory ? styles.inputWithAccessory : undefined, error ? styles.inputError : undefined]} />{accessory && <View style={styles.fieldAccessory}>{accessory}</View>}</View></View>{trailingAction}</View>{!!error && <ThemedText style={styles.errorText}>{error}</ThemedText>}</View>;
}
export function Primary({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  const isLoading = loading ?? title.endsWith('...');
  return <Pressable disabled={isLoading} onPress={onPress} style={styles.primary}>
    {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>{title}</ThemedText>}
  </Pressable>;
}
export function Secondary({ title, onPress }: { title: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.secondary}><ThemedText style={styles.secondaryText}>{title}</ThemedText></Pressable>; }
export function Radio({ selected }: { selected: boolean }) { return <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>; }
export function Summary({ orderForm, shippingPrice }: { orderForm: OrderForm; shippingPrice?: number }) {
  const itemsTotal = orderForm.items.reduce((total, item) => total + item.price * item.quantity, 0);
  const shippingLabel = shippingPrice === undefined ? 'A calcular' : shippingPrice === 0 ? 'Grátis' : money(shippingPrice);
  return <Card style={styles.summaryCard}><ThemedText style={styles.summaryTitle}>Resumo</ThemedText><View style={styles.summary}><ThemedText style={styles.bodyText}>Subtotal</ThemedText><ThemedText style={styles.bodyText}>{money(itemsTotal)}</ThemedText></View><View style={styles.summary}><ThemedText style={styles.bodyText}>Entrega</ThemedText><ThemedText style={styles.bodyText}>{shippingLabel}</ThemedText></View><View style={[styles.summary, styles.summaryTotal]}><ThemedText style={styles.sectionTitle}>Total</ThemedText><ThemedText style={styles.sectionTitle}>{money(orderForm.value)}</ThemedText></View></Card>;
}
export function FreeShippingProgress({ value }: { value: number }) {
  const target = 249;
  const remaining = Math.max(0, target - value);
  const progress = Math.min(1, value / target);
  return <View style={styles.progressCard}><View style={styles.progressLabel}><TruckIcon color="#0a0a0a" size={18} /><ThemedText style={styles.dataLabel}>{remaining > 0 ? 'Faltam ' + money(remaining) + ' para Frete Grátis' : 'Você ganhou Frete Grátis'}</ThemedText></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: (progress * 100 + '%') as `${number}%` }]} /></View></View>;
}
export function ReviewHeader({ icon, title }: { icon: 'user' | 'truck' | 'card'; title: string }) {
  return <View style={styles.reviewHeader}>{icon === 'user' && <UserIcon color="#0a0a0a" size={20} />}{icon === 'truck' && <TruckIcon color="#0a0a0a" size={20} />}{icon === 'card' && <CreditCardIcon color="#0a0a0a" size={20} />}<ThemedText style={styles.sectionTitle}>{title}</ThemedText></View>;
}

export function ReviewItemsDisclosure({ items, expanded, onToggle }: { items: CartItem[]; expanded: boolean; onToggle: () => void }) {
  return <View style={styles.reviewItemsSection}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={styles.reviewItemsToggle}>
      <ThemedText style={styles.reviewItemsToggleLabel}>Ver detalhes do produto</ThemedText>
      <View style={[styles.reviewItemsChevron, expanded && styles.reviewItemsChevronExpanded]}>
        <ChevronRightIcon color="#0a0a0a" size={16} />
      </View>
    </Pressable>
    {expanded
      ? <View style={styles.reviewItemsExpanded}>{items.map((item) => <View key={item.id + '-' + item.index + '-review'} style={styles.reviewItem}>
        <CheckoutProductImage imageUrl={item.imageUrl} label={item.name} style={styles.reviewItemImage} />
        <View style={styles.reviewItemDetails}>
          <ThemedText numberOfLines={3} style={styles.reviewItemName}>{item.name}</ThemedText>
          <ThemedText style={styles.reviewItemQuantity}>{`Qtd: ${item.quantity}`}</ThemedText>
          <ThemedText style={styles.reviewItemPrice}>{money(item.price)}</ThemedText>
        </View>
      </View>)}</View>
      : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewItemsPreview}>
        {items.map((item) => <View key={item.id + '-' + item.index + '-preview'} style={styles.reviewItemPreview}>
          <CheckoutProductImage imageUrl={item.imageUrl} label={item.name} style={styles.reviewItemPreviewImage} />
        </View>)}
      </ScrollView>}
  </View>;
}

export function GiftCardPaymentSection({ voucher, onVoucherChange, voucherLoading, saving, onApply, appliedGiftCards, orderValue, removingGiftCard, onRemove, voucherMessage, voucherMessageType, onContinue, selected, giftCardAvailability, giftCardIdentityVerified, giftCardCreditsHidden, availableGiftCards, giftCardDetailsLoading, applyingAvailableGiftCard, onShowCredits, onApplyAvailableGiftCard }: { voucher: string; onVoucherChange: (value: string) => void; voucherLoading: boolean; saving: boolean; onApply: () => void; appliedGiftCards: GiftCard[]; orderValue: number; removingGiftCard: string | null; onRemove: (giftCard: GiftCard) => void; voucherMessage: string; voucherMessageType: 'success' | 'error' | null; onContinue: () => void; selected: boolean; giftCardAvailability: GiftCardAvailability; giftCardIdentityVerified: boolean; giftCardCreditsHidden: boolean; availableGiftCards: GiftCard[]; giftCardDetailsLoading: boolean; applyingAvailableGiftCard: string | null; onShowCredits: () => void; onApplyAvailableGiftCard: (giftCard: GiftCard) => void }) {
  const appliedValue = giftCardsTotal(appliedGiftCards);
  const canContinue = appliedGiftCards.length > 0 && giftCardsCoverOrder(appliedGiftCards, orderValue);
  const remainingValue = Math.max(0, orderValue - appliedValue);
  const appliedKeys = new Set(appliedGiftCards.map((giftCard) => giftCard.id || giftCard.redemptionCode));
  const unappliedGiftCards = availableGiftCards.filter((giftCard) => !appliedKeys.has(giftCard.id || giftCard.redemptionCode));
  return <View style={styles.giftCardSection}>
    {giftCardAvailability === 'loading' && <View style={styles.giftCardLookup}><ActivityIndicator size="small" color="#0a0a0a" /><ThemedText style={styles.bodyText} themeColor="textSecondary">Consultando créditos disponíveis...</ThemedText></View>}
    {giftCardAvailability === 'available' && !giftCardIdentityVerified && <Pressable accessibilityRole="button" onPress={onShowCredits} style={styles.giftCardNotice}><ThemedText style={styles.giftCardNoticeText}>Você possui créditos para usar na compra! Deseja exibi-los?</ThemedText></Pressable>}
    {giftCardIdentityVerified && giftCardDetailsLoading && <View style={styles.giftCardLookup}><ActivityIndicator size="small" color="#0a0a0a" /><ThemedText style={styles.bodyText} themeColor="textSecondary">Carregando seus créditos...</ThemedText></View>}
    {giftCardIdentityVerified && !giftCardCreditsHidden && !giftCardDetailsLoading && unappliedGiftCards.length > 0 && <View style={styles.availableGiftCardsCard}>
      <ThemedText style={styles.sectionTitle}>Créditos disponíveis</ThemedText>
      <ThemedText style={styles.bodyText} themeColor="textSecondary">Escolha um vale-presente para usar nesta compra.</ThemedText>
      {unappliedGiftCards.map((giftCard, index) => {
        const key = giftCard.id || giftCard.redemptionCode || String(index);
        const applying = applyingAvailableGiftCard === key;
        return <View key={key} style={styles.availableGiftCardRow}>
          <View style={styles.giftCardDetails}>
            <ThemedText style={styles.giftCardCode}>{giftCardCreditLabel(giftCard)}</ThemedText>
            <ThemedText style={styles.giftCardAmount}>{money(giftCardAppliedValue(giftCard))}</ThemedText>
          </View>
          <Pressable disabled={saving || voucherLoading || Boolean(applyingAvailableGiftCard)} onPress={() => onApplyAvailableGiftCard(giftCard)} style={[styles.smallButton, (saving || voucherLoading || Boolean(applyingAvailableGiftCard)) && styles.giftCardButtonDisabled]}>
            {applying ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>Usar</ThemedText>}
          </Pressable>
        </View>;
      })}
    </View>}
    <View style={[styles.paymentCard, selected && styles.paymentCardSelected]}>
      <ThemedText style={styles.sectionTitle}>Vale presente</ThemedText>
      <View style={styles.paymentDivider} />
      <View style={styles.inline}>
        <TextInput value={voucher} onChangeText={onVoucherChange} autoCapitalize="characters" autoCorrect={false} placeholder="Insira o código do vale-presente" style={[styles.input, styles.flex]} />
        <Pressable disabled={saving || voucherLoading} onPress={onApply} style={[styles.smallButton, (saving || voucherLoading) && styles.giftCardButtonDisabled]}>
          {voucherLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>Adicionar</ThemedText>}
        </Pressable>
      </View>
      {appliedGiftCards.map((giftCard, index) => <View key={(giftCard.id || giftCard.redemptionCode) + '-' + index} style={styles.giftCardRow}>
        <View style={styles.giftCardDetails}>
          <ThemedText style={styles.giftCardCode}>{giftCardDisplayCode(giftCard)}</ThemedText>
          <ThemedText style={styles.giftCardAmount}>{money(giftCardAppliedValue(giftCard))}</ThemedText>
        </View>
        <Pressable disabled={saving || removingGiftCard === (giftCard.redemptionCode || giftCard.id)} onPress={() => onRemove(giftCard)}>
          <ThemedText style={styles.giftCardRemove}>{removingGiftCard === (giftCard.redemptionCode || giftCard.id) ? 'Removendo...' : 'Remover'}</ThemedText>
        </Pressable>
      </View>)}
      {appliedGiftCards.length > 0 && !canContinue && <ThemedText style={styles.giftCardRemaining}>Pagamento restante de {money(remainingValue)}. Por favor, combine com outra forma de pagamento</ThemedText>}
      {!!voucherMessage && <ThemedText style={voucherMessageType === 'success' ? styles.successText : styles.errorText}>{voucherMessage}</ThemedText>}
      {canContinue && <Pressable disabled={saving || voucherLoading} onPress={onContinue} style={[styles.giftCardContinueButton, (saving || voucherLoading) && styles.giftCardButtonDisabled]}><ThemedText style={styles.buttonText}>Continuar</ThemedText></Pressable>}
    </View>
  </View>;
}

type GiftCardIdentityModalProps = {
  visible: boolean;
  checkoutEmail: string;
  onClose: () => void;
  onAuthenticated: (email: string) => Promise<void>;
};

type GiftCardIdentityView = 'choice' | 'password' | 'email' | 'code';

export function GiftCardIdentityModal({ visible, checkoutEmail, onClose, onAuthenticated }: GiftCardIdentityModalProps) {
  const [view, setView] = useState<GiftCardIdentityView>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [authenticationToken, setAuthenticationToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible) return;
    setView('choice');
    setEmail(checkoutEmail.trim().toLowerCase());
    setPassword('');
    setShowPassword(false);
    setAccessCode('');
    setAuthenticationToken('');
    setLoading(false);
    setMessage('');
  }, [visible, checkoutEmail]);

  function ensureIdentityEmail() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!validEmail(normalizedEmail)) {
      setMessage('Informe um e-mail válido.');
      return '';
    }
    if (normalizedEmail !== checkoutEmail.trim().toLowerCase()) {
      setMessage('Use o mesmo e-mail informado no checkout.');
      return '';
    }
    return normalizedEmail;
  }

  async function authenticate(normalizedEmail: string, action: () => Promise<void>) {
    try {
      setMessage('');
      setLoading(true);
      await action();
      // Confirmar a identidade do vale-presente não é login na conta. A
      // sessão persistente deve ser criada somente pelos fluxos da conta.
      await onAuthenticated(normalizedEmail);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível confirmar sua identidade.');
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword() {
    const normalizedEmail = ensureIdentityEmail();
    if (!normalizedEmail) return;
    if (!password.trim()) {
      setMessage('Informe sua senha.');
      return;
    }
    await authenticate(normalizedEmail, () => loginVtexPassword(normalizedEmail, password).then(() => undefined));
  }

  async function requestCode() {
    const normalizedEmail = ensureIdentityEmail();
    if (!normalizedEmail) return;
    await authenticateCodeRequest(normalizedEmail);
  }

  async function authenticateCodeRequest(normalizedEmail: string) {
    try {
      setMessage('');
      setLoading(true);
      const token = await startVtexAuthentication();
      await sendVtexAccessKey(normalizedEmail, token);
      setAuthenticationToken(token);
      setAccessCode('');
      setView('code');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar o código.');
    } finally {
      setLoading(false);
    }
  }

  async function validateCode() {
    const normalizedEmail = ensureIdentityEmail();
    if (!normalizedEmail) return;
    if (!accessCode.trim()) {
      setMessage('Informe o código enviado para o seu e-mail.');
      return;
    }
    await authenticate(normalizedEmail, () => validateVtexAccessKey(normalizedEmail, accessCode.trim(), authenticationToken).then(() => undefined));
  }

  async function resendCode() {
    const normalizedEmail = ensureIdentityEmail();
    if (!normalizedEmail) return;
    await authenticateCodeRequest(normalizedEmail);
  }

  const title = view === 'choice' ? 'Use uma das opções para confirmar sua identidade' : view === 'password' ? 'Login com e-mail e senha' : view === 'email' ? 'Receba seu código de acesso' : 'Digite o código enviado por e-mail';
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
    <View style={styles.giftCardIdentityOverlay}>
      <Pressable accessibilityLabel="Fechar confirmação de identidade" onPress={onClose} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.giftCardIdentityKeyboard}>
        <ThemedView style={styles.giftCardIdentityModalCard}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.giftCardIdentityModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.giftCardIdentityScroll}
          >
            <View style={styles.giftCardIdentityHeader}><ThemedText style={styles.giftCardIdentityTitle}>{title}</ThemedText><Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.giftCardIdentityClose}><ThemedText style={styles.giftCardIdentityCloseText}>✕</ThemedText></Pressable></View>
            {view === 'choice' && <>
              <ThemedText style={styles.bodyText} themeColor="textSecondary">Para exibir os créditos vinculados ao seu e-mail, confirme sua identidade.</ThemedText>
              <Pressable disabled={loading} onPress={() => { setMessage(''); setView('email'); }} style={styles.giftCardIdentityPrimary}><ThemedText style={styles.buttonText}>Receber código de acesso por e-mail</ThemedText></Pressable>
              <Pressable disabled={loading} onPress={() => { setMessage(''); setShowPassword(false); setView('password'); }} style={styles.giftCardIdentityPrimary}><ThemedText style={styles.buttonText}>Entrar com e-mail e senha</ThemedText></Pressable>
            </>}
            {view === 'password' && <>
              <Field label="E-mail" value={email} setValue={setEmail} keyboardType="email-address" placeholder="seu@email.com" style={styles.giftCardIdentityField} />
              <View style={[styles.field, styles.giftCardIdentityField]}>
                <ThemedText style={styles.fieldLabel}>Senha</ThemedText>
                <View style={styles.giftCardIdentityPasswordWrap}>
                  <TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} placeholder="Digite sua senha" placeholderTextColor="#0a0a0a" style={[styles.input, styles.giftCardIdentityInput, styles.giftCardIdentityPasswordInput]} />
                  <Pressable accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'} accessibilityRole="button" hitSlop={8} onPress={() => setShowPassword((current) => !current)} style={styles.giftCardIdentityPasswordToggle}><EyeIcon color="#0a0a0a" size={20} off={!showPassword} /></Pressable>
                </View>
              </View>
              {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
              <View style={styles.giftCardIdentityActionRow}><Pressable disabled={loading} onPress={() => setView('choice')} style={[styles.modalCancelButton, styles.giftCardIdentityCancelButton]}><ThemedText style={styles.dataLabel}>Voltar</ThemedText></Pressable><Pressable disabled={loading} onPress={() => { void submitPassword(); }} style={[styles.giftCardIdentityPrimary, styles.giftCardIdentityPrimaryInRow]}>{loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>Entrar</ThemedText>}</Pressable></View>
            </>}
            {view === 'email' && <>
              <Field label="E-mail" value={email} setValue={setEmail} keyboardType="email-address" placeholder="seu@email.com" style={styles.giftCardIdentityField} />
              {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
              <Pressable disabled={loading} onPress={() => { void requestCode(); }} style={styles.giftCardIdentityPrimary}>{loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>Enviar código</ThemedText>}</Pressable>
              <Pressable disabled={loading} onPress={() => setView('choice')} style={styles.modalCancelButton}><ThemedText style={styles.dataLabel}>Voltar</ThemedText></Pressable>
            </>}
            {view === 'code' && <>
              <ThemedText style={styles.bodyText} themeColor="textSecondary">Enviamos um código para {email}.</ThemedText>
              <View style={[styles.field, styles.giftCardIdentityField]}><ThemedText style={styles.fieldLabel}>Código de acesso</ThemedText><TextInput value={accessCode} onChangeText={setAccessCode} keyboardType="numeric" autoCapitalize="none" autoCorrect={false} placeholder="Digite o código" placeholderTextColor="#0a0a0a" style={[styles.input, styles.giftCardIdentityInput]} /></View>
              {!!message && <ThemedText style={styles.errorText}>{message}</ThemedText>}
              <Pressable disabled={loading} onPress={() => { void validateCode(); }} style={styles.giftCardIdentityPrimary}>{loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.buttonText}>Confirmar e exibir créditos</ThemedText>}</Pressable>
              <Pressable disabled={loading} onPress={() => { void resendCode(); }} style={styles.modalCancelButton}><ThemedText style={styles.dataLabel}>Reenviar código</ThemedText></Pressable>
              <Pressable disabled={loading} onPress={() => setView('email')} style={styles.giftCardIdentityLinkButton}><ThemedText style={styles.link}>Alterar e-mail</ThemedText></Pressable>
            </>}
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}

export function GiftCardPaymentReview({ giftCards }: { giftCards: GiftCard[] }) {
  return <View style={styles.giftCardReview}>
    <ThemedText style={styles.giftCardReviewTitle}>Pagamento com vale presente:</ThemedText>
    {giftCards.map((giftCard, index) => <View key={(giftCard.id || giftCard.redemptionCode) + '-review-' + index} style={styles.giftCardReviewRow}>
      <View style={styles.giftCardReviewColumn}>
        <ThemedText style={styles.giftCardReviewLabel}>Código</ThemedText>
        <ThemedText style={styles.giftCardReviewCode}>{giftCardDisplayCode(giftCard)}</ThemedText>
      </View>
      <View style={[styles.giftCardReviewColumn, styles.giftCardReviewColumnRight]}>
        <ThemedText style={styles.giftCardReviewLabel}>Valor</ThemedText>
        <ThemedText style={styles.giftCardReviewValue}>{money(giftCardAppliedValue(giftCard))}</ThemedText>
      </View>
    </View>)}
  </View>;
}

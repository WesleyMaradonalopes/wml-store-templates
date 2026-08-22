import { Image } from 'expo-image';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export type PaymentBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'diners' | 'pix' | 'generic';

const assets: Partial<Record<PaymentBrand, number>> = {
  visa: require('../../assets/payment-brands/Visa.svg'),
  mastercard: require('../../assets/payment-brands/Mastercard.svg'),
  amex: require('../../assets/payment-brands/AmericanExpress.svg'),
  elo: require('../../assets/payment-brands/Elo.svg'),
  hipercard: require('../../assets/payment-brands/Hipercard.svg'),
  diners: require('../../assets/payment-brands/Diners.svg'),
  pix: require('../../assets/payment-brands/pix.png'),
};

export function paymentBrandFromLabel(value?: string | null): PaymentBrand {
  const label = String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (label.includes('american express') || label.includes('amex')) return 'amex';
  if (label.includes('mastercard') || label.includes('master card')) return 'mastercard';
  if (label.includes('hipercard') || label.includes('hiper card')) return 'hipercard';
  if (label.includes('diners')) return 'diners';
  if (label.includes('visa')) return 'visa';
  if (label.includes('elo')) return 'elo';
  if (label.includes('pix')) return 'pix';
  return 'generic';
}

export function PaymentBrandIcon({
  brand,
  width = 42,
  height = 27,
  style,
}: {
  brand: PaymentBrand;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const source = assets[brand];
  if (!source) return null;
  return <View style={[styles.container, { width, height }, style]}>
    <Image source={source} contentFit="contain" style={styles.image} />
  </View>;
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', borderRadius: 4, backgroundColor: '#ffffff' },
  image: { width: '100%', height: '100%' },
});

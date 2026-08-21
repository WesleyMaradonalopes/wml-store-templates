import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Spacing } from '@/constants/theme';
import type { Product, ProductVariant } from '@/services/catalog';

import CloseIcon from './icons/CloseIcon';
import { ThemedText } from './themed-text';

export type AddedProductInfo = {
  product: Product;
  variant?: ProductVariant;
  selectedOptions?: Record<string, string>;
  price?: number | null;
};

type AddedToCartModalProps = {
  item: AddedProductInfo | null;
  visible: boolean;
  onClose: () => void;
  onViewCart: () => void;
};

function money(value: number | null | undefined) {
  return value === null || value === undefined ? '' : `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function variationLabel(item: AddedProductInfo) {
  const selectedValues = Object.values(item.selectedOptions ?? {}).filter(Boolean);
  const variantValues = Object.values(item.variant?.variations ?? {}).filter(Boolean);
  const values = selectedValues.length > 0 ? selectedValues : variantValues;
  return Array.from(new Set([item.product.color, ...values].filter(Boolean))).join(' - ');
}

export function AddedToCartModal({ item, visible, onClose, onViewCart }: AddedToCartModalProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  useEffect(() => {
    if (!visible || !item) {
      setFeedbackVisible(false);
      return;
    }

    setFeedbackVisible(true);
    const timeout = setTimeout(() => setFeedbackVisible(false), 2600);
    return () => clearTimeout(timeout);
  }, [item, visible]);

  if (!item) return null;

  const imageUrl = item.variant?.images?.[0] ?? item.product.imageUrl ?? item.product.images[0];
  const details = variationLabel(item);
  const price = item.variant?.price ?? item.price ?? item.product.price;
  const horizontalPadding = width < 420 ? 20 : 28;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="Fechar confirmação de adição" onPress={onClose} style={styles.dismissArea} />
        <View style={[styles.modalStack, { marginBottom: insets.bottom }]}>
          {feedbackVisible && (
            <View pointerEvents="none" style={styles.feedbackToast}>
              <ThemedText style={styles.feedbackText}>Adicionado à sacola com sucesso!</ThemedText>
            </View>
          )}
          <View style={[styles.sheet, { paddingHorizontal: horizontalPadding }]}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>Adicionado à sacola</ThemedText>
              <Pressable accessibilityLabel="Fechar confirmação de adição" onPress={onClose} style={styles.closeButton}>
                <CloseIcon color="#0a0a0a" size={24} />
              </Pressable>
            </View>

            <View style={styles.productRow}>
              {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.productImage} contentFit="cover" /> : <View style={[styles.productImage, styles.productImagePlaceholder]} />}
              <View style={styles.productCopy}>
                <ThemedText numberOfLines={3} style={styles.productName}>{item.product.name}</ThemedText>
                {!!details && <ThemedText numberOfLines={2} style={styles.productDetails}>{details}</ThemedText>}
                {!!money(price) && <ThemedText style={styles.productPrice}>{money(price)}</ThemedText>}
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onViewCart}
                style={({ pressed }) => [styles.actionButton, styles.secondaryButton, pressed && styles.pressed]}>
                <ThemedText style={styles.secondaryButtonText}>Ver a sacola</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.actionButton, styles.primaryButton, pressed && styles.pressed]}>
                <ThemedText style={styles.primaryButtonText}>Continuar comprando</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  dismissArea: { ...StyleSheet.absoluteFill },
  modalStack: {
    width: '100%',
    maxWidth: 770,
    position: 'relative',
  },
  feedbackToast: {
    position: 'absolute',
    bottom: '100%',
    alignSelf: 'center',
    marginBottom: Spacing.two,
    maxWidth: '92%',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#358846',
    shadowColor: '#0a0a0a',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    zIndex: 2,
  },
  feedbackText: { color: '#FFFFFF', textAlign: 'center', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  sheet: {
    width: '100%',
    paddingTop: 24,
    paddingBottom: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0a0a0a',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 12,
  },
  header: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  title: { flex: 1, fontSize: 20, lineHeight: 25, fontFamily: Fonts.semibold },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  productRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingTop: 14, paddingBottom: 18 },
  productImage: { width: 96, height: 126, borderRadius: 10, backgroundColor: '#e9e4dd' },
  productImagePlaceholder: { borderWidth: 1, borderColor: '#ded7cf' },
  productCopy: { flex: 1, minWidth: 0, paddingTop: 2, gap: 5 },
  productName: { fontSize: 14, lineHeight: 19, fontFamily: Fonts.medium },
  productDetails: { color: '#625d57', fontSize: 13, lineHeight: 18 },
  productPrice: { color: '#0a0a0a', fontSize: 15, lineHeight: 20, fontFamily: Fonts.semibold },
  actions: { flexDirection: 'row', gap: Spacing.three },
  actionButton: { flex: 1, minHeight: 50, paddingHorizontal: Spacing.three, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { borderWidth: 1, borderColor: '#e0dbd4', backgroundColor: '#FFFFFF' },
  primaryButton: { backgroundColor: '#0a0a0a' },
  secondaryButtonText: { color: '#0a0a0a', fontSize: 13, lineHeight: 17, fontFamily: Fonts.semibold },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, lineHeight: 17, fontFamily: Fonts.semibold, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});

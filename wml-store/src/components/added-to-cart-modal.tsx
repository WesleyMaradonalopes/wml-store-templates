import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Spacing } from '@/constants/theme';
import type { Product, ProductVariant } from '@/services/catalog';

import { BottomSheetHandle } from './bottom-sheet-handle';
import CloseIcon from './icons/CloseIcon';
import { ThemedText } from './themed-text';

export type AddedProductInfo = {
  product: Product;
  variant?: ProductVariant;
  selectedOptions?: Record<string, string>;
  price?: number | null;
};

type AddedToCartModalProps = {
  item: AddedProductInfo | AddedProductInfo[] | null;
  visible: boolean;
  onClose: () => void;
  onViewCart: () => void;
  viewCartLabel?: string;
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

export function AddedToCartModal({ item, visible, onClose, onViewCart, viewCartLabel = 'Ver a sacola' }: AddedToCartModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const items = item ? (Array.isArray(item) ? item : [item]) : [];

  useEffect(() => {
    if (!visible || items.length === 0) {
      setFeedbackVisible(false);
      return;
    }

    setFeedbackVisible(true);
    const timeout = setTimeout(() => setFeedbackVisible(false), 2600);
    return () => clearTimeout(timeout);
  }, [item, visible]);

  if (items.length === 0) return null;
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
            <BottomSheetHandle />
            <View style={styles.header}>
              <ThemedText style={styles.title}>{items.length === 1 ? 'Adicionado à sacola' : 'Adicionados à sacola'}</ThemedText>
              <Pressable accessibilityLabel="Fechar confirmação de adição" onPress={onClose} style={styles.closeButton}>
                <CloseIcon color="#0a0a0a" size={24} />
              </Pressable>
            </View>

            {items.length > 1 && <ThemedText style={styles.quantityText}>{items.length} produtos adicionados</ThemedText>}
            <ScrollView
              style={[styles.productList, { maxHeight: Math.min(height * 0.45, 340) }]}
              contentContainerStyle={styles.productListContent}
              showsVerticalScrollIndicator={items.length > 2}>
              {items.map((addedItem, index) => {
                const imageUrl = addedItem.variant?.images?.[0] ?? addedItem.product.imageUrl ?? addedItem.product.images[0];
                const details = variationLabel(addedItem);
                const price = addedItem.variant?.price ?? addedItem.price ?? addedItem.product.price;
                return (
                  <View key={`${addedItem.product.id}-${addedItem.variant?.itemId ?? index}`} style={[styles.productRow, index < items.length - 1 && styles.productRowDivider]}>
                    {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.productImage} contentFit="cover" /> : <View style={[styles.productImage, styles.productImagePlaceholder]} />}
                    <View style={styles.productCopy}>
                      <ThemedText numberOfLines={3} style={styles.productName}>{addedItem.product.name}</ThemedText>
                      {!!details && <ThemedText numberOfLines={2} style={styles.productDetails}>{details}</ThemedText>}
                      {!!money(price) && <ThemedText style={styles.productPrice}>{money(price)}</ThemedText>}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={onViewCart}
                style={({ pressed }) => [styles.actionButton, styles.secondaryButton, pressed && styles.pressed]}>
                <ThemedText style={styles.secondaryButtonText}>{viewCartLabel}</ThemedText>
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
    borderRadius: 8,
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
    width: '95%',
    paddingTop: 4,
    paddingBottom: 22,
		margin: 'auto',
		marginBottom: 20,
		borderRadius: 24,
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
  quantityText: { color: '#625d57', fontSize: 13, lineHeight: 18, fontFamily: Fonts.medium },
  productList: { flexGrow: 0 },
  productListContent: { paddingTop: 8 },
  productRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingTop: 8, paddingBottom: 14 },
  productRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e0d9' },
  productImage: { width: 96, height: 126, borderRadius: 8, backgroundColor: '#e9e4dd' },
  productImagePlaceholder: { borderWidth: 1, borderColor: '#ded7cf' },
  productCopy: { flex: 1, minWidth: 0, paddingTop: 2, gap: 5 },
  productName: { fontSize: 14, lineHeight: 19, fontFamily: Fonts.medium },
  productDetails: { color: '#625d57', fontSize: 13, lineHeight: 18 },
  productPrice: { color: '#0a0a0a', fontSize: 15, lineHeight: 20, fontFamily: Fonts.semibold },
  actions: { flexDirection: 'row', gap: Spacing.three },
  actionButton: { flex: 1, minHeight: 40, paddingHorizontal: Spacing.three, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { borderWidth: 1, borderColor: '#0a0a0a', backgroundColor: '#FFFFFF' },
  primaryButton: { backgroundColor: '#0a0a0a' },
  secondaryButtonText: { color: '#0a0a0a', fontSize: 12, lineHeight: 16, fontFamily: Fonts.semibold },
  primaryButtonText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontFamily: Fonts.semibold, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { addItemToCart, getOrderForm } from '@/services/cart';
import { getProduct, type Product, type ProductVariant } from '@/services/catalog';
import { buildVariationGroups } from '@/utils/product-variations';

import { AddToCartFeedback } from './add-to-cart-feedback';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type QuickViewProps = {
  product: Product;
  visible: boolean;
  onClose: () => void;
  onAdded?: (product: Product) => void;
};

type QuickViewButtonProps = {
  product: Product;
  label?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onAdded?: (product: Product) => void;
};

function money(value: number | null) {
  return value === null ? '' : `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function matchesSelection(variant: ProductVariant, selected: Record<string, string>, ignoredName?: string) {
  return Object.entries(selected).every(([name, value]) => name === ignoredName || variant.variations[name] === value);
}

export function ProductQuickView({ product, visible, onClose, onAdded }: QuickViewProps) {
  const router = useRouter();
  const [details, setDetails] = useState(product);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setDetails(product);
    setSelectedOptions({});
    setMessage('');
    setLoading(true);
    getProduct(product.id)
      .then((value) => { if (active) setDetails(value); })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product, visible]);

  const variationGroups = useMemo(() => buildVariationGroups(details), [details]);
  const variationNames = Object.keys(variationGroups);
  const selectionComplete = variationNames.every((name) => Boolean(selectedOptions[name]));
  const selectedVariant = useMemo(() => {
    if (variationNames.length === 0) return details.variants.find((variant) => variant.available) ?? details.variants[0];
    if (!selectionComplete) return undefined;
    return details.variants.find((variant) => matchesSelection(variant, selectedOptions));
  }, [details, selectedOptions, selectionComplete, variationNames.length]);

  const gallery = useMemo(() => Array.from(new Set([
    ...(selectedVariant?.images ?? []),
    ...details.images,
    ...details.variants.flatMap((variant) => variant.images),
  ].filter(Boolean))), [details, selectedVariant]);

  function optionAvailable(name: string, value: string) {
    return details.variants.some((variant) => (
      variant.available
      && variant.variations[name] === value
      && matchesSelection(variant, selectedOptions, name)
    ));
  }

  async function addSelectedProduct() {
    if (variationNames.length > 0 && !selectionComplete) {
      setMessage(`Escolha ${variationNames.map((name) => name.toLowerCase()).join(' e ')}.`);
      return;
    }
    if (!selectedVariant?.available) {
      setMessage('Esta combinação está indisponível no momento.');
      return;
    }
    setAdding(true);
    setMessage('');
    try {
      const orderForm = await getOrderForm();
      await addItemToCart({
        orderFormId: orderForm.orderFormId,
        itemId: selectedVariant.itemId,
        sellerId: selectedVariant.sellerId,
      });
      setMessage('Produto adicionado à sacola.');
      onAdded?.(details);
    } catch {
      setMessage('Não foi possível adicionar o produto agora.');
    } finally {
      setAdding(false);
    }
  }

  function openProduct() {
    onClose();
    router.push(`/product/${details.id}`);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Fechar visualização rápida" onPress={onClose} style={styles.dismissArea} />
        <ThemedView style={styles.sheet}>
          <SafeAreaView edges={['bottom']} style={styles.safeArea}>
            <View style={styles.header}>
              <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>{details.name}</ThemedText>
              <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.closeButton}>
                <ThemedText style={styles.closeText}>✕</ThemedText>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {loading && <ActivityIndicator color="#0a0a0a" />}
              {gallery.length > 0 && (
                <FlatList
                  data={gallery}
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(image, index) => `${image}-${index}`}
                  contentContainerStyle={styles.gallery}
                  snapToInterval={172}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} contentFit="cover" />}
                />
              )}
              {(selectedVariant?.price ?? details.price) !== null && (
                <ThemedText type="subtitle">{money(selectedVariant?.price ?? details.price)}</ThemedText>
              )}
              {variationNames.map((name) => (
                <View key={name} style={styles.variationGroup}>
                  <ThemedText type="smallBold">
                    {name}: <ThemedText>{selectedOptions[name] || `Escolha ${name.toLowerCase()}`}</ThemedText>
                  </ThemedText>
                  <View style={styles.options}>
                    {variationGroups[name].map((value) => {
                      const available = optionAvailable(name, value);
                      const selected = selectedOptions[name] === value;
                      return (
                        <Pressable
                          key={value}
                          disabled={!available}
                          accessibilityState={{ disabled: !available, selected }}
                          onPress={() => { setMessage(''); setSelectedOptions((current) => ({ ...current, [name]: value })); }}
                          style={[styles.option, selected && styles.selectedOption, !available && styles.unavailableOption]}>
                          <ThemedText style={[selected && styles.selectedOptionText, !available && styles.unavailableText]}>{value}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              {!!message && !message.toLowerCase().includes('adicionad') && <ThemedText style={styles.messageText}>{message}</ThemedText>}
              <Pressable onPress={openProduct} style={styles.productButton}>
                <ThemedText type="smallBold">Ir para o produto</ThemedText>
              </Pressable>
              <Pressable disabled={adding} onPress={addSelectedProduct} style={styles.addButton}>
                {adding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.addButtonText}>Adicionar à sacola</ThemedText>}
              </Pressable>
            </ScrollView>
            <AddToCartFeedback message={message} />
          </SafeAreaView>
        </ThemedView>
      </View>
    </Modal>
  );
}

export function ProductQuickViewButton({ product, label = 'Adicionar', accessibilityLabel, disabled, buttonStyle, textStyle, onAdded }: QuickViewButtonProps) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable
        disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={(event) => { event.stopPropagation(); setVisible(true); }}
        style={({ pressed }) => [buttonStyle, pressed && styles.pressed, disabled && styles.disabled]}>
        <ThemedText style={textStyle}>{label}</ThemedText>
      </Pressable>
      <ProductQuickView product={product} visible={visible} onClose={() => setVisible(false)} onAdded={onAdded} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.62)' },
  dismissArea: { flex: 1 },
  sheet: { maxHeight: '84%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  safeArea: { maxHeight: '100%' },
  header: { minHeight: 64, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ece8e2' },
  title: { flex: 1, paddingRight: Spacing.three },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 24, lineHeight: 28, color: '#0a0a0a', fontWeight: '400' },
  content: { gap: Spacing.three, padding: Spacing.four, paddingBottom: Spacing.five },
  gallery: { gap: 12, paddingRight: Spacing.four },
  image: { width: 160, height: 220, borderRadius: 8, backgroundColor: '#e8e8ea' },
  variationGroup: { gap: Spacing.two },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { minWidth: 42, minHeight: 42, paddingHorizontal: Spacing.three, borderRadius: 21, borderWidth: 1, borderColor: '#d6d0c8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  selectedOption: { borderColor: '#0a0a0a', backgroundColor: '#0a0a0a' },
  selectedOptionText: { color: '#FFFFFF', fontWeight: '700' },
  unavailableOption: { opacity: 0.35, backgroundColor: '#eeeae4' },
  unavailableText: { textDecorationLine: 'line-through' },
  messageText: { color: '#B42318', fontWeight: '600' },
  productButton: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  addButton: { minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  addButtonText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});

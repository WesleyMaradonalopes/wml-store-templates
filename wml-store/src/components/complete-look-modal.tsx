import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isSizeVariationName, sortVariationValues } from '@/constants/sizes';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addItemToCart, getOrderForm } from '@/services/cart';
import type { Product, ProductInstallment, ProductKitItem } from '@/services/catalog';

import type { AddedProductInfo } from './added-to-cart-modal';
import ChevronRightIcon from './icons/ChevronRightIcon';
import CloseIcon from './icons/CloseIcon';
import { emptyKitSelection, KitSelector, type KitSelection } from './kit-selector';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type CompleteLookModalProps = {
  products: Product[];
  visible: boolean;
  onClose: () => void;
  onAdded: (items: AddedProductInfo[]) => void;
};

type ProductSizeInfo = {
  name: string;
  options: Array<{ value: string; available: boolean }>;
};

function money(value: number | null | undefined) {
  return value === null || value === undefined ? '' : `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function sizeInfo(product: Product): ProductSizeInfo {
  const variationNames = Array.from(new Set(product.variants.flatMap((variant) => Object.keys(variant.variations))));
  const name = variationNames.find(isSizeVariationName);
  if (!name) return { name: '', options: [] };

  const values = sortVariationValues(name, Array.from(new Set(
    product.variants.map((variant) => variant.variations[name]).filter(Boolean),
  )));
  return {
    name,
    options: values.map((value) => ({
      value,
      available: product.variants.some((variant) => variant.available && variant.variations[name] === value),
    })),
  };
}

function availableVariant(product: Product, sizeName: string, selectedSize?: string) {
  const available = product.variants.filter((variant) => variant.available);
  if (sizeName) return available.find((variant) => variant.variations[sizeName] === selectedSize);
  return available[0];
}

function bestInstallment(installments: ProductInstallment[] = []) {
  return installments.reduce<ProductInstallment | null>((best, item) => (
    !best || item.count > best.count ? item : best
  ), null);
}

function selectedKitItems(product: Product, selection: KitSelection) {
  return product.kitGroups
    .map((group) => group.items.find((item) => item.itemId === selection.selectedSizes[group.productId]))
    .filter((item): item is ProductKitItem => Boolean(item));
}

function hasCompleteSelection(product: Product, selectedSize: string | undefined, selection: KitSelection) {
  if (product.isKit) {
    return product.kitGroups.length > 0
      && product.kitGroups.every((group) => Boolean(
        selection.checkedProducts[group.productId]
        && group.items.some((item) => item.itemId === selection.selectedSizes[group.productId] && item.available),
      ));
  }

  const size = sizeInfo(product);
  return Boolean(availableVariant(product, size.name, selectedSize))
    || (product.variants.length === 0 && Boolean(product.itemId));
}

export function CompleteLookModal({ products, visible, onClose, onAdded }: CompleteLookModalProps) {
  const theme = useTheme();
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [bundleSelection, setBundleSelection] = useState<Record<string, boolean>>({});
  const [kitSelections, setKitSelections] = useState<Record<string, KitSelection>>({});
  const [openSizeProductId, setOpenSizeProductId] = useState<string | null>(null);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [buyingTogether, setBuyingTogether] = useState(false);
  const [selectionErrors, setSelectionErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const productIdsKey = JSON.stringify(products.map((product) => product.id));

  useEffect(() => {
    if (visible) {
      const productIds = JSON.parse(productIdsKey) as string[];
      setBundleSelection(Object.fromEntries(productIds.map((productId) => [productId, true])));
    }
  }, [productIdsKey, visible]);

  const productRows = useMemo(() => products.map((product) => {
    const size = sizeInfo(product);
    const variant = product.isKit ? undefined : availableVariant(product, size.name, selectedSizes[product.id]);
    const kitSelection = kitSelections[product.id] ?? emptyKitSelection();
    return {
      product,
      size,
      variant,
      kitSelection,
      selectedKitItems: product.isKit ? selectedKitItems(product, kitSelection) : [],
      selectionComplete: hasCompleteSelection(product, selectedSizes[product.id], kitSelection),
    };
  }), [kitSelections, products, selectedSizes]);

  const selectedRows = productRows.filter((item) => bundleSelection[item.product.id] !== false);
  const total = selectedRows.reduce((sum, item) => sum + (item.variant?.price ?? item.product.price ?? 0), 0);
  const busy = buyingTogether || addingProductId !== null;

  function addedProductInfo(item: (typeof productRows)[number]): AddedProductInfo {
    const selectedOptions: Record<string, string> = {};
    if (item.product.isKit) {
      for (const group of item.product.kitGroups) {
        const selectedItem = item.selectedKitItems.find((kitItem) => kitItem.itemId === item.kitSelection.selectedSizes[group.productId]);
        const sizeName = selectedItem && Object.keys(selectedItem.variations).find(isSizeVariationName);
        if (selectedItem && sizeName) selectedOptions[group.productName] = selectedItem.variations[sizeName];
      }
    } else {
      Object.assign(selectedOptions, item.variant?.variations ?? {});
    }

    return {
      product: item.product,
      variant: item.variant,
      selectedOptions,
      price: item.variant?.price ?? item.product.price,
    };
  }

  function changeSize(productId: string, value: string) {
    setSelectedSizes((current) => ({ ...current, [productId]: value }));
    setSelectionErrors((current) => { const next = { ...current }; delete next[productId]; return next; });
    setOpenSizeProductId(null);
    setFeedback(null);
  }

  function changeKitSelection(productId: string, selection: KitSelection) {
    setKitSelections((current) => ({ ...current, [productId]: selection }));
    setSelectionErrors((current) => { const next = { ...current }; delete next[productId]; return next; });
    setFeedback(null);
  }

  function toggleBundleProduct(productId: string) {
    setBundleSelection((current) => ({ ...current, [productId]: current[productId] === false }));
    setSelectionErrors((current) => { const next = { ...current }; delete next[productId]; return next; });
    setFeedback(null);
  }

  async function addOne(productId: string) {
    if (busy) return;
    const item = productRows.find((row) => row.product.id === productId);
    if (!item) return;
    if (!item.selectionComplete) {
      setSelectionErrors((current) => ({ ...current, [productId]: 'Selecione um tamanho disponível.' }));
      return;
    }

    setAddingProductId(productId);
    setSelectionErrors((current) => { const next = { ...current }; delete next[productId]; return next; });
    setFeedback(null);
    try {
      let orderForm = await getOrderForm();
      if (item.product.isKit) {
        for (const kitItem of item.selectedKitItems) {
          orderForm = await addItemToCart({
            orderFormId: orderForm.orderFormId,
            itemId: kitItem.itemId,
            sellerId: kitItem.sellerId,
            quantity: kitItem.amount,
          });
        }
      } else if (item.variant) {
        orderForm = await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: item.variant.itemId, sellerId: item.variant.sellerId });
      } else if (item.product.itemId && item.product.variants.length === 0) {
        orderForm = await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: item.product.itemId, sellerId: item.product.sellerId });
      }
      onAdded([addedProductInfo(item)]);
    } catch {
      setFeedback({ text: 'Não foi possível adicionar o produto agora.', error: true });
    } finally {
      setAddingProductId(null);
    }
  }

  async function buyTogether() {
    if (busy || selectedRows.length === 0) return;
    const missing = selectedRows.filter((item) => !item.selectionComplete);
    if (missing.length > 0) {
      setSelectionErrors(Object.fromEntries(missing.map((item) => [item.product.id, 'Selecione um tamanho disponível.'])));
      setFeedback({ text: 'Selecione o tamanho de cada produto marcado.', error: true });
      return;
    }

    setBuyingTogether(true);
    setFeedback(null);
    try {
      let orderForm = await getOrderForm();
      for (const item of selectedRows) {
        if (item.product.isKit) {
          for (const kitItem of item.selectedKitItems) {
            orderForm = await addItemToCart({
              orderFormId: orderForm.orderFormId,
              itemId: kitItem.itemId,
              sellerId: kitItem.sellerId,
              quantity: kitItem.amount,
            });
          }
        } else if (item.variant) {
          orderForm = await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: item.variant.itemId, sellerId: item.variant.sellerId });
        } else if (item.product.itemId && item.product.variants.length === 0) {
          orderForm = await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: item.product.itemId, sellerId: item.product.sellerId });
        }
      }
      onAdded(selectedRows.map(addedProductInfo));
    } catch {
      setFeedback({ text: 'Não foi possível adicionar todos os produtos agora.', error: true });
    } finally {
      setBuyingTogether(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { borderBottomColor: '#dddddd', boxShadow: '0px 7px 10px 1px rgba(0, 0, 0, 0.1)' }]}>
            <ThemedText type="subtitle" style={styles.headerTitle}>COMPRE O LOOK</ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar compre o look" onPress={onClose} style={styles.closeButton}>
              <CloseIcon color={theme.text} size={22} />
            </Pressable>
          </View>

          <FlatList
            data={productRows}
            numColumns={2}
            keyExtractor={(item) => item.product.id}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const { product, size, variant, kitSelection } = item;
              const installment = bestInstallment(variant?.installments ?? product.variants.find((entry) => entry.available)?.installments);
              const price = variant?.price ?? product.price;
              const listPrice = variant?.listPrice ?? product.listPrice;
              return (
                <View style={[styles.card, openSizeProductId === product.id && styles.cardOpen]}>
                  <View style={styles.imageWrap}>
                    {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" accessibilityLabel={product.name} />}
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={`${bundleSelection[product.id] !== false ? 'Desmarcar' : 'Selecionar'} ${product.name} para comprar junto`}
                      accessibilityState={{ checked: bundleSelection[product.id] !== false, disabled: busy }}
                      disabled={busy}
                      onPress={() => toggleBundleProduct(product.id)}
                      style={[styles.productCheckbox, bundleSelection[product.id] !== false && styles.productCheckboxChecked, busy && styles.disabledButton]}>
                      {bundleSelection[product.id] !== false && <ThemedText style={styles.productCheckboxMark}>✓</ThemedText>}
                    </Pressable>
                  </View>
                  <ThemedText numberOfLines={2} style={styles.productName}>{product.name}</ThemedText>
                  {listPrice !== null && price !== null && listPrice > price && <ThemedText style={[styles.listPrice, { color: theme.textSecondary }]}>{money(listPrice)}</ThemedText>}
                  <ThemedText type="smallBold" style={styles.price}>{money(price)}</ThemedText>
                  {!!installment && <ThemedText themeColor="textSecondary" style={styles.installment}>{installment.count}x de {money(installment.value)}</ThemedText>}

                  {product.isKit ? (
                    <KitSelector
                      groups={product.kitGroups}
                      selection={kitSelection}
                      onChange={(selection) => changeKitSelection(product.id, selection)}
                      showLabel={false}
                      style={styles.kitSelector}
                    />
                  ) : size.name ? (
                    <View style={[styles.selectorWrap, openSizeProductId === product.id && styles.selectorWrapOpen]}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Selecionar tamanho de ${product.name}`}
                        accessibilityState={{ expanded: openSizeProductId === product.id }}
                        onPress={() => setOpenSizeProductId((current) => current === product.id ? null : product.id)}
                        style={[styles.sizeSelect, { borderColor: theme.borderStrong }, selectionErrors[product.id] && styles.sizeSelectError]}>
                        <ThemedText style={styles.sizeSelectText}>{selectedSizes[product.id] || 'Tamanho'}</ThemedText>
                        <View style={[styles.chevron, openSizeProductId === product.id && styles.chevronOpen]}>
                          <ChevronRightIcon color="#625d57" size={14} />
                        </View>
                      </Pressable>
                      {openSizeProductId === product.id && <View style={[styles.sizeOptions, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                        {size.options.map((option) => (
                          <Pressable
                            key={option.value}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !option.available, selected: selectedSizes[product.id] === option.value }}
                            disabled={!option.available}
                            onPress={() => changeSize(product.id, option.value)}
                            style={[styles.sizeOption, !option.available && styles.unavailableOption]}>
                            <ThemedText style={[styles.sizeOptionText, !option.available && styles.unavailableOptionText]}>{option.value}</ThemedText>
                          </Pressable>
                        ))}
                      </View>}
                    </View>
                  ) : null}

                  {!!selectionErrors[product.id] && <ThemedText style={styles.selectionError}>{selectionErrors[product.id]}</ThemedText>}
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => void addOne(product.id)}
                    style={[styles.addButton, { backgroundColor: theme.primary }, busy && styles.disabledButton]}>
                    {addingProductId === product.id
                      ? <ActivityIndicator size="small" color={theme.onPrimary} />
                      : <ThemedText type="smallBold" style={[styles.addButtonText, { color: theme.onPrimary }]}>Adicionar à sacola</ThemedText>}
                  </Pressable>
                </View>
              );
            }}
          />

          <View style={[styles.footer, { backgroundColor: theme.background, boxShadow: '0px 0px 10px 1px rgba(0, 0, 0, 0.1)', borderTopColor: theme.border }]}>
            {!!feedback && <ThemedText style={[styles.feedback, feedback.error && styles.feedbackError]}>{feedback.text}</ThemedText>}
            <ThemedText style={styles.totalLabel}>
              {selectedRows.length === 0
                ? 'Nenhum produto selecionado'
                : selectedRows.length === 1
                  ? 'Leve 1 produto por:'
                  : `Leve os ${selectedRows.length} produtos por:`}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.total}>{money(total)}</ThemedText>
            <Pressable
              accessibilityRole="button"
              disabled={busy || selectedRows.length === 0}
              onPress={() => void buyTogether()}
              style={[styles.buyTogetherButton, { backgroundColor: theme.primary }, busy && styles.disabledButton]}>
              {buyingTogether
                ? <ActivityIndicator size="small" color={theme.onPrimary} />
                : <ThemedText type="smallBold" style={[styles.buyTogetherText, { color: theme.onPrimary }]}>COMPRAR JUNTO</ThemedText>}
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { minHeight: 40, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 16, lineHeight: 20, textAlign: 'center' },
  closeButton: { position: 'absolute', right: Spacing.four, top: 0, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingHorizontal: Spacing.two, paddingTop: 10, paddingBottom: 100, gap: Spacing.three },
  gridRow: { justifyContent: 'space-between', gap: Spacing.two, alignItems: 'flex-start' },
  card: { width: '48.8%', minWidth: 0, gap: 4 },
  cardOpen: { zIndex: 20, elevation: 12 },
  imageWrap: { width: '100%', aspectRatio: 0.76, overflow: 'hidden', borderRadius: 10, backgroundColor: '#e8e8ea' },
  image: { width: '100%', height: '100%' },
  productCheckbox: { position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.94)' },
  productCheckboxChecked: { borderColor: '#0a0a0a', backgroundColor: '#0a0a0a' },
  productCheckboxMark: { color: '#FFFFFF', fontSize: 12, lineHeight: 14, fontWeight: '700' },
  productName: { minHeight: 34, fontSize: 11, lineHeight: 15 },
  listPrice: { fontSize: 10, lineHeight: 13, textDecorationLine: 'line-through' },
  price: { fontSize: 14, lineHeight: 18 },
  installment: { display: 'none', fontSize: 10, lineHeight: 13 },
  selectorWrap: { position: 'relative', zIndex: 2, marginTop: 2 },
  selectorWrapOpen: { zIndex: 30, elevation: 12 },
  sizeSelect: { minHeight: 32, paddingHorizontal: 10, borderWidth: 1, borderRadius: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sizeSelectError: { borderColor: '#ed6560' },
  sizeSelectText: { fontSize: 11, lineHeight: 15 },
  chevron: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  sizeOptions: { position: 'absolute', top: 36, left: 0, right: 0, paddingVertical: 3, borderWidth: 1, borderRadius: 10, zIndex: 30, shadowColor: '#0a0a0a', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  sizeOption: { minHeight: 32, paddingHorizontal: 12, justifyContent: 'center' },
  sizeOptionText: { fontSize: 12, lineHeight: 16 },
  unavailableOption: { opacity: 0.4 },
  unavailableOptionText: { textDecorationLine: 'line-through' },
  kitSelector: { marginTop: 3, padding: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: '#dedbd5', borderRadius: 8 },
  selectionError: { color: '#ed6560', fontSize: 10, lineHeight: 13 },
  addButton: { minHeight: 34, paddingHorizontal: 5, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  addButtonText: { fontSize: 11, lineHeight: 13, textAlign: 'center' },
  disabledButton: { opacity: 0.5 },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two, alignItems: 'center', gap: 3, borderTopWidth: StyleSheet.hairlineWidth },
  feedback: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  feedbackError: { color: '#ed6560' },
  totalLabel: { fontSize: 12, lineHeight: 17 },
  total: { fontSize: 20, lineHeight: 24 },
  buyTogetherButton: { width: '100%', minHeight: 42, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  buyTogetherText: { fontSize: 11, lineHeight: 14 },
});

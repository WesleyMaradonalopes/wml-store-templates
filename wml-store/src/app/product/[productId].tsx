import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToCartFeedback } from '@/components/add-to-cart-feedback';
import { AddedToCartModal, type AddedProductInfo } from '@/components/added-to-cart-modal';
import { CartIconButton } from '@/components/cart-icon-button';
import ArrowLeftIAIcon from '@/components/icons/ArrowLeftIAicon';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import ExchangeIcon from '@/components/icons/ExchangeIcon';
import HeartIcon from '@/components/icons/HeartIcon';
import HopeLogoIcon from '@/components/icons/HopeLogoIcon';
import SearchIcon from '@/components/icons/SearchIcon';
import ShoppingBagIcon from '@/components/icons/ShoppingBagIcon';
import TapeMeasureStrokeRoundedIcon from '@/components/icons/TapeMeasureStrokeRoundedIcon';
import { emptyKitSelection, KitSelector, type KitSelection } from '@/components/kit-selector';
import { LoginRequiredModal } from '@/components/login-required-modal';
import { ProductCarousel } from '@/components/product-carousel';
import { ProductQuickView } from '@/components/product-quick-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isSizeVariationName, sortVariationValues } from '@/constants/sizes';
import { Fonts, Spacing } from '@/constants/theme';
import { addItemToCart, getOrderForm, simulateProductShipping, type ShippingQuote } from '@/services/cart';
import { getCompleteLookProducts, getProduct, getProductColorOptions, getSimilarProducts, type Product, type ProductKitGroup, type ProductKitItem, type ProductVariant } from '@/services/catalog';
import { canSaveFavorites, getKnownFavoriteAuthState, isFavorite, toggleFavorite } from '@/services/favorites';
import { buildVariationGroups } from '@/utils/product-variations';

function money(value: number | null) {
  return value === null ? '' : `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function colorValue(name: string) {
  const color = normalizeText(name);
  if (color.includes('branco')) return '#F8F6F1';
  if (color.includes('preto')) return '#171717';
  if (color.includes('marinho')) return '#18233F';
  if (color.includes('azul')) return '#6677A8';
  if (color.includes('lilas') || color.includes('lavanda')) return '#B89BCB';
  if (color.includes('roxo')) return '#6E347E';
  if (color.includes('vermelho')) return '#C95458';
  if (color.includes('rosa')) return '#DE8D9C';
  if (color.includes('caramelo')) return '#8A4A19';
  if (color.includes('marrom') || color.includes('cafe')) return '#60320F';
  if (color.includes('bege') || color.includes('nude')) return '#D6B49A';
  if (color.includes('verde')) return '#708875';
  if (color.includes('cinza') || color.includes('mescla')) return '#999999';
  if (color.includes('laranja')) return '#D86F4E';
  return '#C9C1B7';
}

function matchesSelection(variant: ProductVariant, selected: Record<string, string>, ignoredName?: string) {
  return Object.entries(selected).every(([name, value]) => name === ignoredName || variant.variations[name] === value);
}

function estimateLabel(value: string) {
  const amount = Number(value.match(/\d+/)?.[0] ?? 0);
  if (!amount) return value;
  if (value.includes('bd')) return `até ${amount} ${amount === 1 ? 'dia útil' : 'dias úteis'}`;
  if (value.includes('h')) return `até ${amount} ${amount === 1 ? 'hora' : 'horas'}`;
  return `até ${amount} ${amount === 1 ? 'dia' : 'dias'}`;
}

export default function ProductScreen() {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  // The header and the bottom safe area handle their own insets. The gallery
  // must stay within the viewport so its overlay content is visible on load.
  const galleryHeight = screenHeight;
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [colorProducts, setColorProducts] = useState<Product[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [lookProducts, setLookProducts] = useState<Product[]>([]);
  const [lookLoading, setLookLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [addedItem, setAddedItem] = useState<AddedProductInfo | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [kitSelection, setKitSelection] = useState<KitSelection>(emptyKitSelection);
  const [selectionMessage, setSelectionMessage] = useState('');
  const [quickViewVisible, setQuickViewVisible] = useState(false);
  const [colorsVisible, setColorsVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [postalCode, setPostalCode] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [shippingMessage, setShippingMessage] = useState('');
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [careOpen, setCareOpen] = useState(false);
  const galleryListRef = useRef<FlatList<string>>(null);

  const variantGroups = useMemo(() => product?.isKit ? {} : buildVariationGroups(product), [product]);
  const variationNames = Object.keys(variantGroups);
  const activeVariant = product?.isKit
    ? product.variants.find((variant) => variant.available) ?? product.variants[0]
    : product?.variants.find((variant) => (
      variationNames.length === 0
        ? variant.available
        : variationNames.every((name) => selectedOptions[name] && variant.variations[name] === selectedOptions[name])
    ));
  const galleryImages = Array.from(new Set([...(activeVariant?.images ?? []), ...(product?.images ?? [])].filter(Boolean)));
  const visibleColorProducts = colorProducts.slice(0, 5);
  const hiddenColorCount = Math.max(0, colorProducts.length - visibleColorProducts.length);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setLoading(true);
    setError(false);
    setProduct(null);
    setColorProducts([]);
    setSimilarProducts([]);
    setLookProducts([]);
    setSelectedOptions({});
    setKitSelection(emptyKitSelection());
    setSelectionMessage('');
    setQuickViewVisible(false);
    setColorsVisible(false);
    setImageIndex(0);
    setImageViewerVisible(false);
    setViewerIndex(0);
    setScrollY(0);
    setCartMessage(null);
    setShippingQuotes([]);
    setShippingMessage('');
    getProduct(productId)
      .then((value) => {
        if (!active) return;
        setProduct(value);
        isFavorite(value.id).then((saved) => { if (active) setFavorite(saved); }).catch(() => undefined);
        getProductColorOptions(value).then((items) => { if (active) setColorProducts(items); }).catch(() => undefined);
        setSimilarLoading(true);
        getSimilarProducts(value, 12)
          .then((items) => { if (active) setSimilarProducts(items); })
          .catch(() => undefined)
          .finally(() => { if (active) setSimilarLoading(false); });
        setLookLoading(true);
        getCompleteLookProducts(value, 2)
          .then((items) => { if (active) setLookProducts([value, ...items.filter((item) => item.id !== value.id)]); })
          .catch(() => { if (active) setLookProducts([value]); })
          .finally(() => { if (active) setLookLoading(false); });
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  useEffect(() => {
    setImageIndex(0);
    setViewerIndex(0);
  }, [activeVariant?.itemId]);

  useEffect(() => {
    if (galleryImages.length < 2 || imageViewerVisible) return;
    const timer = setInterval(() => {
      const nextIndex = (imageIndex + 1) % galleryImages.length;
      galleryListRef.current?.scrollToOffset({ offset: nextIndex * screenWidth, animated: true });
      setImageIndex(nextIndex);
    }, 6000);
    return () => clearInterval(timer);
  }, [galleryImages.length, imageIndex, imageViewerVisible, screenWidth]);

  function optionAvailable(name: string, value: string) {
    return product?.variants.some((variant) => (
      variant.available
      && variant.variations[name] === value
      && matchesSelection(variant, selectedOptions, name)
    )) ?? false;
  }

  function showCartFeedback(message: string) {
    setCartMessage(null);
    setTimeout(() => setCartMessage(message), 0);
  }

  async function addProduct() {
    if (!product) return;
    if (product.isKit) {
      const missing = product.kitGroups.filter((group) => (
        !kitSelection.checkedProducts[group.productId] || !kitSelection.selectedSizes[group.productId]
      ));
      if (missing.length > 0) {
        setSelectionMessage('Por favor, selecione o tamanho de cada peça.');
        setCartMessage(null);
        return;
      }
      setAdding(true);
      setSelectionMessage('');
      setCartMessage(null);
      try {
        let orderForm = await getOrderForm();
        for (const group of product.kitGroups) {
          const selectedItem = group.items.find((item) => item.itemId === kitSelection.selectedSizes[group.productId]);
          if (!selectedItem) continue;
          orderForm = await addItemToCart({
            orderFormId: orderForm.orderFormId,
            itemId: selectedItem.itemId,
            sellerId: selectedItem.sellerId,
            quantity: selectedItem.amount,
          });
        }
        setAddedItem({ product, price: product.price });
      } catch {
        setSelectionMessage('Não foi possível adicionar o conjunto.');
        setCartMessage(null);
      } finally {
        setAdding(false);
      }
      return;
    }
    if (variationNames.some((name) => !selectedOptions[name])) {
      const hasSize = variationNames.some(isSizeVariationName);
      const selectionError = hasSize ? 'Por favor, selecione um tamanho.' : 'Por favor, selecione uma opção.';
      setSelectionMessage(selectionError);
      setCartMessage(null);
      return;
    }
    if (!activeVariant) {
      const selectionError = 'Por favor, selecione uma opção disponível.';
      setSelectionMessage(selectionError);
      setCartMessage(null);
      return;
    }
    if (!activeVariant.available) {
      const selectionError = 'Este tamanho está indisponível.';
      setSelectionMessage(selectionError);
      setCartMessage(null);
      return;
    }
    setAdding(true);
    setSelectionMessage('');
    setCartMessage(null);
    try {
      const orderForm = await getOrderForm();
      await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: activeVariant.itemId, sellerId: activeVariant.sellerId });
      setAddedItem({ product, variant: activeVariant, selectedOptions });
    } catch {
      setSelectionMessage('Não foi possível adicionar o produto.');
      setCartMessage(null);
    } finally {
      setAdding(false);
    }
  }

  async function changeFavorite() {
    if (!product || favoriteLoading) return;
    const previous = favorite;
    const authState = getKnownFavoriteAuthState();
    if (authState === 'anonymous') {
      setLoginModalVisible(true);
      return;
    }

    const nextFavorite = !previous;
    if (authState === 'authenticated') setFavorite(nextFavorite);
    setFavoriteLoading(true);
    try {
      if (authState !== 'authenticated') {
        if (!(await canSaveFavorites())) {
          setLoginModalVisible(true);
          return;
        }
        setFavorite(nextFavorite);
      }
      const result = await toggleFavorite(product, { hydrate: false });
      setFavorite(result.favorite);
    } catch (favoriteError) {
      setFavorite(previous);
      Alert.alert('Favoritos', favoriteError instanceof Error ? favoriteError.message : 'Não foi possível atualizar os favoritos.');
    } finally {
      setFavoriteLoading(false);
    }
  }

  function updatePostalCode(value: string) {
    const numbers = value.replace(/\D/g, '').slice(0, 8);
    setPostalCode(numbers.length > 5 ? `${numbers.slice(0, 5)}-${numbers.slice(5)}` : numbers);
    setShippingQuotes([]);
    setShippingMessage('');
  }

  async function calculateShipping() {
    const cep = postalCode.replace(/\D/g, '');
    if (cep.length !== 8) return setShippingMessage('Informe um CEP válido.');
    if (!activeVariant?.available) return setShippingMessage('Escolha um tamanho disponível primeiro.');
    setShippingLoading(true);
    setShippingMessage('');
    setShippingQuotes([]);
    try {
      const quotes = await simulateProductShipping({ itemId: activeVariant.itemId, sellerId: activeVariant.sellerId, postalCode: cep });
      setShippingQuotes(quotes);
      if (quotes.length === 0) setShippingMessage('Não encontramos uma entrega disponível para este CEP.');
    } catch (shippingError) {
      setShippingMessage(shippingError instanceof Error ? shippingError.message : 'Não foi possível calcular o frete.');
    } finally {
      setShippingLoading(false);
    }
  }

  function handleFloatingAdd() {
    if (product?.isKit) {
      setQuickViewVisible(true);
      return;
    }
    if (variationNames.some((name) => !selectedOptions[name])) {
      setQuickViewVisible(true);
      return;
    }
    void addProduct();
  }

  const floatingButtonThreshold = screenHeight * 0.2;
  const showFloatingButton = Boolean(product && scrollY > floatingButtonThreshold);
  const currentPrice = activeVariant?.price ?? product?.price ?? null;
  const currentListPrice = activeVariant?.listPrice ?? product?.listPrice ?? null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        {loading && <ActivityIndicator color="#0a0a0a" style={styles.loader} />}
        {error && <ThemedText style={styles.errorText}>Produto não encontrado.</ThemedText>}
        {product && (
          <ScrollView
            contentContainerStyle={[styles.content, showFloatingButton && styles.contentWithFloating]}
            onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}>
            {galleryImages.length > 0 && (
              <View style={[styles.galleryArea, { height: galleryHeight }] }>
                <FlatList
                  ref={galleryListRef}
                  key={activeVariant?.itemId ?? product.id}
                  data={galleryImages}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(image, index) => `${image}-${index}`}
                  onMomentumScrollEnd={(event) => setImageIndex(Math.round(event.nativeEvent.contentOffset.x / screenWidth))}
                  renderItem={({ item, index }) => (
                    <Pressable
                      accessibilityLabel={`Abrir imagem ${index + 1}`}
                      onPress={() => {
                        setViewerIndex(index);
                        setImageViewerVisible(true);
                      }}
                      style={[styles.heroImagePressable, { width: screenWidth, height: galleryHeight }]}
                    >
                      <Image source={{ uri: item }} style={[styles.mainImage, { width: screenWidth, height: galleryHeight }]} contentFit="cover" />
                    </Pressable>
                  )}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(255, 0, 0, 0)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.7)']}
                  locations={[0, 0.46, 1]}
                  style={styles.heroShade}
                />
                {galleryImages.length > 1 && <View pointerEvents="none" style={styles.heroDots}>{galleryImages.map((_, index) => <View key={index} style={[styles.dot, imageIndex === index && styles.activeDot]} />)}</View>}
                <View style={styles.heroProductInfo}>
                  <View style={styles.heroProductRow}>
                    <View style={styles.heroProductCopy}>
                      <ThemedText numberOfLines={2} style={styles.heroProductName}>{product.name}</ThemedText>
                      {currentPrice !== null && <ThemedText type="smallBold" style={styles.heroProductPrice}>{money(currentPrice)}</ThemedText>}
                    </View>
                    <Pressable accessibilityLabel="Comprar" onPress={() => setQuickViewVisible(true)} style={styles.heroBuyButton}>
                      <ThemedText type="smallBold" style={styles.heroBuyButtonText}>Comprar</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.details}>
              <View style={styles.productHeading}>
                <View style={styles.headingText}>
                  <ThemedText style={styles.productName}>{product.name}</ThemedText>
                  {currentListPrice !== null && currentPrice !== null && currentListPrice > currentPrice && <ThemedText style={styles.listPrice}>De {money(currentListPrice)}</ThemedText>}
                  {currentPrice !== null && <ThemedText type="subtitle" style={styles.bestPrice}>{money(currentPrice)}</ThemedText>}
                </View>
                <Pressable accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} disabled={favoriteLoading} onPress={changeFavorite} style={styles.favoriteButton}>
                  <HeartIcon size={32} color={favorite ? '#C62828' : '#423d39'} filled={favorite} />
                </Pressable>
              </View>

              {colorProducts.length > 0 && (
                <View style={styles.selectorGroup}>
                  <ThemedText type="smallBold">Cor: <ThemedText>{product.color || 'Selecione'}</ThemedText></ThemedText>
                  <View style={styles.colorList}>
                    {visibleColorProducts.map((colorProduct) => {
                      const selected = colorProduct.id === product.id;
                      return <Pressable key={colorProduct.id} accessibilityLabel={colorProduct.color || colorProduct.name} accessibilityState={{ selected }} onPress={() => { if (!selected) router.push(`/product/${colorProduct.id}`); }} style={[styles.colorOption, selected && styles.selectedColorOption]}><View style={[styles.colorCircle, { backgroundColor: colorValue(colorProduct.color || colorProduct.name) }]} /></Pressable>;
                    })}
                    {hiddenColorCount > 0 && (
                      <Pressable accessibilityLabel={`Ver mais ${hiddenColorCount} cores`} onPress={() => setColorsVisible(true)} style={styles.moreColorsButton}>
                        <ThemedText type="smallBold" style={styles.moreColorsText}>Ver +{hiddenColorCount} {hiddenColorCount === 1 ? 'cor' : 'cores'} ›</ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              {product.isKit ? (
                product.kitGroups.length > 0 ? (
                  <KitSelector
                    groups={product.kitGroups}
                    selection={kitSelection}
                    onChange={(nextSelection) => {
                      setKitSelection(nextSelection);
                      setSelectionMessage('');
                      setCartMessage(null);
                    }}
                  />
                ) : <ActivityIndicator color="#0a0a0a" />
              ) : Object.entries(variantGroups).map(([name, values]) => (
                <View key={name} style={styles.selectorGroup}>
                  <ThemedText type="smallBold">{name}: <ThemedText>{selectedOptions[name] || 'Selecione'}</ThemedText></ThemedText>
                  <View style={styles.variantOptions}>
                    {values.map((value) => {
                      const available = optionAvailable(name, value);
                      const selected = selectedOptions[name] === value;
                      return <Pressable key={value} disabled={!available} accessibilityState={{ disabled: !available, selected }} onPress={() => { setSelectionMessage(''); setCartMessage(null); setSelectedOptions((current) => ({ ...current, [name]: value })); }} style={[styles.variantOption, selected && styles.selectedVariant, !available && styles.unavailableVariant]}><ThemedText style={[selected && styles.selectedVariantText, !available && styles.unavailableVariantText]}>{value}</ThemedText></Pressable>;
                    })}
                  </View>
                </View>
              ))}
              {!!selectionMessage && <ThemedText style={styles.selectionMessage}>{selectionMessage}</ThemedText>}

              <Pressable disabled={adding} onPress={addProduct} style={[styles.mainAddButton, styles.mainAddButtonHidden]}>
                {/*<ShoppingBagIcon size={18} color="#FFFFFF" />*/}
                {adding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.mainAddText}>Adicionar à sacola</ThemedText>}
              </Pressable>
              <View style={styles.helperButtons}>
                <Pressable onPress={() => Alert.alert('Provador Virtual', 'O provador virtual será conectado nesta etapa da migração.')} style={styles.helperButton}><ThemedText>♧</ThemedText><ThemedText type="smallBold">Provador Virtual</ThemedText></Pressable>
                <Pressable onPress={() => Alert.alert('Tabela de medidas', 'A tabela de medidas será aberta aqui.')} style={styles.helperButton}><TapeMeasureStrokeRoundedIcon color="#0a0a0a" size={17} /><ThemedText type="smallBold">Tabela de medidas</ThemedText></Pressable>
              </View>

              <View style={styles.shippingSection}>
                <ThemedText style={styles.sectionTitle}>Calcule o frete e prazo de entrega</ThemedText>
                <View style={styles.shippingRow}>
                  <TextInput value={postalCode} onChangeText={updatePostalCode} placeholder="Digite seu CEP" keyboardType="number-pad" maxLength={9} style={styles.shippingInput} />
                  <Pressable disabled={shippingLoading} onPress={calculateShipping} style={styles.shippingButton}><ThemedText style={styles.shippingButtonText}>{shippingLoading ? 'Calculando...' : 'Calcular'}</ThemedText></Pressable>
                </View>
                {!!shippingMessage && <ThemedText style={styles.messageText}>{shippingMessage}</ThemedText>}
                {shippingQuotes.map((quote) => <View key={`${quote.deliveryChannel || 'delivery'}-${quote.name}`} style={styles.shippingQuote}><View><ThemedText type="smallBold">{quote.name}</ThemedText><ThemedText themeColor="textSecondary">{quote.isPickupInPoint ? 'Retire em ' : 'Receba em '}{estimateLabel(quote.shippingEstimate)}</ThemedText></View><ThemedText type="smallBold">{quote.price === 0 ? 'Grátis' : money(quote.price)}</ThemedText></View>)}
              </View>

              <Accordion title="Descrição" open={descriptionOpen} onToggle={() => setDescriptionOpen((value) => !value)}>
                <ThemedText style={styles.accordionText}>{product.description || 'Descrição não cadastrada.'}</ThemedText>
              </Accordion>
              <Accordion title="Composição" open={compositionOpen} onToggle={() => setCompositionOpen((value) => !value)}>
                <ThemedText style={styles.accordionText}>{product.composition || 'Informações não cadastradas.'}</ThemedText>
              </Accordion>
              <Accordion title="Cuidados" open={careOpen} onToggle={() => setCareOpen((value) => !value)}>
                <ThemedText style={styles.accordionText}>{product.care || 'Informações não cadastradas.'}</ThemedText>
              </Accordion>

              {lookLoading && <ActivityIndicator color="#0a0a0a" />}
              {!lookLoading && lookProducts.length > 1 && <CompleteLook products={lookProducts} onFeedback={showCartFeedback} />}

              <View style={styles.similarSection}>
                <ThemedText style={styles.similarProducts} type="subtitle">Produtos similares</ThemedText>
                {similarLoading && <ActivityIndicator color="#0a0a0a" />}
                {!similarLoading && similarProducts.length > 0 && <ProductCarousel products={similarProducts} nestedScrollEnabled leftInset={Spacing.four} rightInset={Spacing.four} />}
              </View>
            </View>
          </ScrollView>
        )}

        <PdpHeader scrolled={!product || scrollY > 24} onBack={() => router.back()} onLogo={() => router.replace('/')} onSearch={() => router.push('/search')} onCart={() => router.push('/checkout')} />
        {showFloatingButton && product && (
          <View style={styles.floatingBar}>
            <View style={styles.floatingInfo}>
              <ThemedText numberOfLines={1} style={styles.floatingName}>{product.name}</ThemedText>
              {selectedOptions.Tamanho && <ThemedText themeColor="textSecondary" numberOfLines={1}>{selectedOptions.Tamanho}</ThemedText>}
              {currentPrice !== null && <ThemedText type="smallBold">{money(currentPrice)}</ThemedText>}
            </View>
            <Pressable disabled={adding} onPress={handleFloatingAdd} style={[styles.floatingButton, adding && styles.disabled]}>
              {adding ? <ActivityIndicator size="small" color="#fff" /> : <><ShoppingBagIcon size={18} color="#fff" /><ThemedText type="smallBold" style={styles.floatingButtonText}>Adicionar</ThemedText></>}
            </Pressable>
          </View>
        )}
        {product && <ProductQuickView
          product={product}
          visible={quickViewVisible}
          onClose={() => setQuickViewVisible(false)}
          kitSelection={product.isKit ? kitSelection : undefined}
          onKitSelectionChange={(nextSelection) => {
            setKitSelection(nextSelection);
            setSelectionMessage('');
            setCartMessage(null);
          }}
        />}
        <ColorOptionsModal
          products={colorProducts}
          visible={colorsVisible}
          selectedProductId={product?.id}
          onClose={() => setColorsVisible(false)}
          onSelect={(colorProduct) => {
            setColorsVisible(false);
            if (colorProduct.id !== product?.id) router.replace(`/product/${colorProduct.id}`);
          }}
        />
        <ProductImageViewer
          images={galleryImages}
          visible={imageViewerVisible}
          initialIndex={viewerIndex}
          onClose={() => setImageViewerVisible(false)}
          onIndexChange={(index) => {
            setViewerIndex(index);
            setImageIndex(index);
            galleryListRef.current?.scrollToIndex({ index, animated: false });
          }}
        />
        <LoginRequiredModal
          visible={loginModalVisible}
          onClose={() => setLoginModalVisible(false)}
          onLogin={() => {
            setLoginModalVisible(false);
            router.push('/account?view=access' as never);
          }}
        />
        <AddedToCartModal
          item={addedItem}
          visible={Boolean(addedItem)}
          onClose={() => setAddedItem(null)}
          onViewCart={() => {
            setAddedItem(null);
            router.push('/checkout');
          }}
        />
        <AddToCartFeedback message={cartMessage} />
      </SafeAreaView>
    </ThemedView>
  );
}

function ProductImageViewer({
  images,
  visible,
  initialIndex,
  onClose,
  onIndexChange,
}: {
  images: string[];
  visible: boolean;
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [viewerSize, setViewerSize] = useState({ width, height });
  const [currentIndex, setCurrentIndex] = useState(0);
  const safeInitialIndex = Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0));
  const pageWidth = viewerSize.width || width;
  const pageHeight = viewerSize.height || height;

  useEffect(() => {
    if (!visible || images.length === 0) return;
    setCurrentIndex(safeInitialIndex);
    const timeout = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: safeInitialIndex, animated: false });
    }, 0);
    return () => clearTimeout(timeout);
  }, [images.length, pageWidth, safeInitialIndex, visible]);

  if (images.length === 0) return null;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <View
        style={styles.viewer}
        onLayout={(event) => {
          const nextSize = event.nativeEvent.layout;
          setViewerSize((current) => current.width === nextSize.width && current.height === nextSize.height
            ? current
            : { width: nextSize.width, height: nextSize.height });
        }}>
        <FlatList
          ref={listRef}
          data={images}
          style={styles.viewerList}
          contentContainerStyle={styles.viewerListContent}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={safeInitialIndex}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
          keyExtractor={(image, index) => `${image}-${index}`}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.min(Math.max(Math.round(event.nativeEvent.contentOffset.x / pageWidth), 0), images.length - 1);
            setCurrentIndex(nextIndex);
            onIndexChange(nextIndex);
          }}
          renderItem={({ item }) => (
            <View style={[styles.viewerPage, { width: pageWidth, height: pageHeight }]}>
              <Image source={{ uri: item }} style={[styles.viewerImage, { width: pageWidth, height: pageHeight }]} contentFit="cover" />
            </View>
          )}
        />
        <View style={[styles.viewerTopBar, { paddingTop: insets.top + 12 }]}>
          <View style={styles.viewerCounter}>
            <ThemedText style={styles.viewerText}>{currentIndex + 1}/{images.length}</ThemedText>
          </View>
          <Pressable accessibilityLabel="Fechar imagem" onPress={onClose} style={styles.viewerClose}>
            <ThemedText style={styles.viewerCloseText}>✕</ThemedText>
          </Pressable>
        </View>
        {images.length > 1 && (
          <View pointerEvents="none" style={[styles.viewerDots, { bottom: Math.max(insets.bottom, 20) + 20 }]}>
            {images.map((_, index) => <View key={index} style={[styles.viewerDot, currentIndex === index && styles.viewerDotActive]} />)}
          </View>
        )}
      </View>
    </Modal>
  );
}

function lookSizeInfo(product: Product) {
  const variationNames = Array.from(new Set(product.variants.flatMap((variant) => Object.keys(variant.variations))));
  const name = variationNames.find(isSizeVariationName);
  if (!name) return { name: '', options: [] as Array<{ value: string; available: boolean }> };
  const values = sortVariationValues(name, Array.from(new Set(product.variants.map((variant) => variant.variations[name]).filter(Boolean))));
  return {
    name,
    options: values.map((value) => ({ value, available: product.variants.some((variant) => variant.available && variant.variations[name] === value) })),
  };
}

function kitItemSize(item: ProductKitItem) {
  return Object.entries(item.variations).find(([name]) => isSizeVariationName(name))?.[1] ?? '';
}

function lookKitSizeOptions(group: ProductKitGroup) {
  const values = sortVariationValues('Tamanho', Array.from(new Set(group.items.map(kitItemSize).filter(Boolean))));
  return values.map((value) => {
    const item = group.items.find((candidate) => kitItemSize(candidate) === value && candidate.available)
      ?? group.items.find((candidate) => kitItemSize(candidate) === value);
    return { value, itemId: item?.itemId ?? '', available: Boolean(item?.available) };
  }).filter((option) => option.itemId);
}

function CompleteLook({ products, onFeedback }: { products: Product[]; onFeedback: (message: string) => void }) {
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedKitSizes, setSelectedKitSizes] = useState<Record<string, Record<string, string>>>({});
  const [openSize, setOpenSize] = useState<string | null>(null);
  const [replacementIndex, setReplacementIndex] = useState(0);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [buyingTogether, setBuyingTogether] = useState(false);
  const [selectionErrors, setSelectionErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const currentProduct = products[0];
  const recommendations = products.slice(1).filter((product, index, all) => product.id !== currentProduct?.id && all.findIndex((item) => item.id === product.id) === index).slice(0, 2);
  const displayedRecommendation = recommendations[replacementIndex % Math.max(recommendations.length, 1)];
  const rows = [currentProduct, displayedRecommendation].filter((product): product is Product => Boolean(product));
  const variants = rows.map((product) => {
    const size = lookSizeInfo(product);
    const selected = selectedSizes[product.id];
    const isKit = product.isKit;
    const kitSelections = selectedKitSizes[product.id] ?? {};
    const selectedKitItems = isKit
      ? product.kitGroups
        .map((group) => group.items.find((item) => item.itemId === kitSelections[group.productId]))
        .filter((item): item is ProductKitItem => Boolean(item))
      : [];
    return {
      product,
      size,
      isKit,
      kitSelections,
      selectedKitItems,
      selectionComplete: isKit
        ? product.kitGroups.length > 0 && selectedKitItems.length === product.kitGroups.length
        : !size.name || Boolean(product.variants.find((variant) => variant.available && variant.variations[size.name] === selected)),
      selectedVariant: !isKit && size.name
        ? product.variants.find((variant) => variant.available && variant.variations[size.name] === selected)
        : !isKit ? product.variants.find((variant) => variant.available) ?? product.variants[0] : undefined,
    };
  });
  const total = variants.reduce((sum, item) => sum + (item.selectedVariant?.price ?? item.product.price ?? 0), 0);

  function selectKitSize(productId: string, groupId: string, itemId: string) {
    setSelectedKitSizes((current) => ({
      ...current,
      [productId]: { ...(current[productId] ?? {}), [groupId]: itemId },
    }));
    setSelectionErrors((current) => { const next = { ...current }; delete next[productId]; return next; });
    setOpenSize(null);
    setMessage('');
  }

  async function addLookProduct(product: Product) {
    const item = variants.find((value) => value.product.id === product.id);
    if (!item?.selectionComplete) {
      setSelectionErrors((current) => ({ ...current, [product.id]: 'Selecione o tamanho para adicionar à sacola.' }));
      return;
    }
    setAddingId(product.id);
    setSelectionErrors((current) => { const next = { ...current }; delete next[product.id]; return next; });
    setMessage('');
    try {
      let orderForm = await getOrderForm();
      if (item.isKit) {
        for (const selectedKitItem of item.selectedKitItems) {
          orderForm = await addItemToCart({
            orderFormId: orderForm.orderFormId,
            itemId: selectedKitItem.itemId,
            sellerId: selectedKitItem.sellerId,
            quantity: selectedKitItem.amount,
          });
        }
      } else if (item.selectedVariant) {
        orderForm = await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: item.selectedVariant.itemId, sellerId: item.selectedVariant.sellerId });
      }
      onFeedback('Produto adicionado à sacola.');
    } catch {
      setMessage('Não foi possível adicionar o produto agora.');
    } finally {
      setAddingId(null);
    }
  }

  async function buyTogether() {
    const missing = variants.find((item) => !item.selectionComplete);
    if (missing) {
      setSelectionErrors(Object.fromEntries(variants.filter((item) => !item.selectionComplete).map((item) => [item.product.id, 'Selecione o tamanho para adicionar à sacola.'])));
      return;
    }
    setBuyingTogether(true);
    setMessage('');
    try {
      let orderForm = await getOrderForm();
      for (const item of variants) {
        if (item.isKit) {
          for (const selectedKitItem of item.selectedKitItems) {
            orderForm = await addItemToCart({
              orderFormId: orderForm.orderFormId,
              itemId: selectedKitItem.itemId,
              sellerId: selectedKitItem.sellerId,
              quantity: selectedKitItem.amount,
            });
          }
        } else if (item.selectedVariant) {
          orderForm = await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: item.selectedVariant.itemId, sellerId: item.selectedVariant.sellerId });
        }
      }
      onFeedback('Produtos adicionados à sacola.');
    } catch {
      setMessage('Não foi possível adicionar o conjunto agora.');
    } finally {
      setBuyingTogether(false);
    }
  }

  return (
    <View style={styles.lookSection}>
      <ThemedText style={styles.lookTitle}>Complete o look</ThemedText>
      <ThemedText style={styles.lookSubtitle}>Sinta a experiência HOPE completa.</ThemedText>
      {variants.map((lookItem, index) => {
        const { product, size, selectedVariant } = lookItem;
        const rowOpen = openSize === product.id || openSize?.startsWith(`${product.id}:`);
        return (
          <View key={product.id} style={[styles.lookRow, rowOpen && styles.lookRowOpen]}>
          <View style={styles.lookImageWrap}>
            {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} style={styles.lookImage} contentFit="cover" />}
            {index === 0 ? <View style={styles.lookTag}><ThemedText style={styles.lookTagText}>Você está vendo</ThemedText></View> : <Pressable disabled={recommendations.length < 2} onPress={() => { setReplacementIndex((value) => (value + 1) % recommendations.length); setOpenSize(null); setMessage(''); }} style={[styles.lookTag, styles.lookTagInteractive, recommendations.length < 2 && styles.lookTagDisabled]}><ExchangeIcon color="#0a0a0a" size={14} /><ThemedText style={styles.lookTagText}>Trocar</ThemedText></Pressable>}
          </View>
          <View style={styles.lookInfo}>
            <ThemedText numberOfLines={2} style={styles.lookName}>{product.name}</ThemedText>
            <ThemedText type="subtitle" style={styles.lookPrice}>{money(selectedVariant?.price ?? product.price)}</ThemedText>
            {lookItem.isKit ? (
              <View style={styles.lookKitSelectors}>
                {product.kitGroups.map((group) => {
                  const selectorKey = `${product.id}:${group.productId}`;
                  const selectedItem = group.items.find((item) => item.itemId === lookItem.kitSelections[group.productId]);
                  const options = lookKitSizeOptions(group);
                  return (
                    <View key={group.productId} style={[styles.lookSelectorWrap, openSize === selectorKey && styles.lookSelectorOpen]}>
                      <Pressable onPress={() => setOpenSize(openSize === selectorKey ? null : selectorKey)} style={[styles.lookSelect, selectionErrors[product.id] && styles.lookSelectError]}>
                        <ThemedText>{selectedItem ? kitItemSize(selectedItem) : 'Tamanho'}</ThemedText>
                        <DropdownChevron open={openSize === selectorKey} />
                      </Pressable>
                      {openSize === selectorKey && <View style={styles.lookOptions}>{options.map((option) => <Pressable key={option.itemId} disabled={!option.available} onPress={() => selectKitSize(product.id, group.productId, option.itemId)} style={[styles.lookOption, !option.available && styles.lookUnavailable]}><ThemedText style={!option.available && styles.lookUnavailableText}>{option.value}</ThemedText></Pressable>)}</View>}
                    </View>
                  );
                })}
                {!!selectionErrors[product.id] && <ThemedText style={styles.lookSelectionError}>{selectionErrors[product.id]}</ThemedText>}
              </View>
            ) : !!size.name && (
              <View style={styles.lookSelectorWrap}>
                <Pressable onPress={() => setOpenSize(openSize === product.id ? null : product.id)} style={[styles.lookSelect, selectionErrors[product.id] && styles.lookSelectError]}>
                  <ThemedText>{selectedSizes[product.id] || 'Tamanho'}</ThemedText>
                  <DropdownChevron open={openSize === product.id} />
                </Pressable>
                {openSize === product.id && <View style={styles.lookOptions}>{size.options.map((option) => <Pressable key={option.value} disabled={!option.available} onPress={() => { setSelectedSizes((current) => ({ ...current, [product.id]: option.value })); setSelectionErrors((current) => { const next = { ...current }; delete next[product.id]; return next; }); setOpenSize(null); setMessage(''); }} style={[styles.lookOption, !option.available && styles.lookUnavailable]}><ThemedText style={!option.available && styles.lookUnavailableText}>{option.value}</ThemedText></Pressable>)}</View>}
                {!!selectionErrors[product.id] && <ThemedText style={styles.lookSelectionError}>{selectionErrors[product.id]}</ThemedText>}
              </View>
            )}
            <Pressable disabled={addingId === product.id} onPress={() => addLookProduct(product)} style={styles.lookAddButton}>
              {addingId === product.id ? <ActivityIndicator size="small" color="#0a0a0a" /> : <ThemedText type="smallBold">Adicionar à sacola</ThemedText>}
            </Pressable>
          </View>
        </View>
        );
      })}
      <View style={styles.lookSummary}>
        <ThemedText>Leve os {rows.length} produtos por:</ThemedText>
        <ThemedText type="subtitle" style={styles.lookTotal}>{money(total)}</ThemedText>
        <Pressable disabled={buyingTogether} onPress={buyTogether} style={styles.lookBuyButton}>
          {buyingTogether ? <ActivityIndicator size="small" color="#0a0a0a" /> : <ThemedText type="smallBold">Comprar junto</ThemedText>}
        </Pressable>
      </View>
      {!!message && <ThemedText style={styles.messageText}>{message}</ThemedText>}
    </View>
  );
}

function PdpHeader({ scrolled, onBack, onLogo, onSearch, onCart }: { scrolled: boolean; onBack: () => void; onLogo: () => void; onSearch: () => void; onCart: () => void }) {
  const insets = useSafeAreaInsets();
  const heroMode = !scrolled;
  return (
    <View style={[styles.header, { paddingTop: insets.top, minHeight: 52 + insets.top }, heroMode ? styles.heroHeader : styles.scrolledHeader]}>
      <View style={styles.headerSide}>
        <Pressable accessibilityLabel="Voltar" onPress={onBack} style={[styles.headerButton, heroMode && styles.heroHeaderButton]}>
          <ArrowLeftIAIcon color="#0a0a0a" size={21} />
        </Pressable>
      </View>
      {heroMode ? <View style={styles.logoPlaceholder} /> : <Pressable accessibilityLabel="Ir para o início" onPress={onLogo} style={styles.logoButton}><HopeLogoIcon color="#0a0a0a" width={76} height={20} /></Pressable>}
      <View style={[styles.headerSide, styles.headerActions]}>
        <Pressable accessibilityLabel="Buscar" onPress={onSearch} style={[styles.headerButton, heroMode && styles.heroHeaderButton]}>
          <SearchIcon size={21} color="#0a0a0a" />
        </Pressable>
        <CartIconButton color="#0a0a0a" onPress={onCart} style={[styles.headerButton, heroMode && styles.heroHeaderButton]} />
      </View>
    </View>
  );
}

function Accordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return <View style={styles.accordion}><Pressable accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.accordionHeader}><ThemedText style={styles.accordionTitle}>{title}</ThemedText><DropdownChevron open={open} /></Pressable>{open && <View style={styles.accordionContent}>{children}</View>}</View>;
}

function DropdownChevron({ open }: { open: boolean }) {
  return <View style={[styles.dropdownChevron, open && styles.dropdownChevronOpen]}><ChevronRightIcon color="#625d57" size={16} /></View>;
}

function ColorOptionsModal({ products, visible, selectedProductId, onClose, onSelect }: { products: Product[]; visible: boolean; selectedProductId?: string; onClose: () => void; onSelect: (product: Product) => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ThemedView style={styles.colorModal}>
        <SafeAreaView style={styles.colorModalSafeArea}>
          <View style={styles.colorModalHeader}>
            <ThemedText style={styles.titleColorModal} type="subtitle">Ver cores ({products.length})</ThemedText>
            <Pressable accessibilityLabel="Fechar cores" onPress={onClose} style={styles.colorModalClose}>
              <ThemedText style={styles.colorModalCloseText}>✕</ThemedText>
            </Pressable>
          </View>
          <FlatList
            data={products}
            numColumns={3}
            keyExtractor={(item) => item.id}
            columnWrapperStyle={styles.colorModalRow}
            contentContainerStyle={styles.colorModalList}
            renderItem={({ item }) => {
              const selected = item.id === selectedProductId;
              return (
                <Pressable accessibilityState={{ selected }} onPress={() => onSelect(item)} style={[styles.colorModalItem, selected && styles.selectedColorModalItem]}>
                  {!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.colorModalImage} contentFit="cover" />}
                  <ThemedText type="smallBold" numberOfLines={2} style={styles.colorModalName}>{item.color || item.name}</ThemedText>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, position: 'relative' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 20, elevation: 0 },
  heroHeader: { borderBottomWidth: 0, backgroundColor: 'transparent' },
  scrolledHeader: { borderBottomWidth: 1, borderBottomColor: '#ece8e2', backgroundColor: '#ffffff' },
  headerSide: { width: 80, flexDirection: 'row', alignItems: 'center' },
  headerActions: { justifyContent: 'flex-end', gap: Spacing.one },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  heroHeaderButton: { borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.62)' },
  logoButton: { minWidth: 90, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  logoPlaceholder: { minWidth: 90, minHeight: 38 },
  loader: { marginTop: Spacing.five },
  errorText: { padding: Spacing.four },
  content: { paddingBottom: Spacing.five },
  contentWithFloating: { paddingBottom: 120 },
  galleryArea: { position: 'relative', backgroundColor: '#e8e8ea' },
  heroImagePressable: { flex: 1 },
  mainImage: { backgroundColor: '#e8e8ea' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 190 },
  heroDots: { position: 'absolute', left: Spacing.four, bottom: 110, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.7)' },
  activeDot: { width: 28, backgroundColor: '#FFFFFF' },
  heroProductInfo: { position: 'absolute', left: Spacing.four, right: Spacing.four, bottom: 35 },
  heroProductRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  heroProductCopy: { flex: 1, gap: 3 },
  heroProductName: { color: '#FFFFFF', fontSize: 14, lineHeight: 18 },
  heroProductPrice: { color: '#FFFFFF', fontSize: 14 },
  heroBuyButton: { minWidth: 86, minHeight: 40, paddingHorizontal: Spacing.three, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  heroBuyButtonText: { color: '#0a0a0a' },
  viewer: { flex: 1, backgroundColor: '#fff' },
  viewerList: { flex: 1, backgroundColor: '#fff' },
  viewerListContent: { backgroundColor: '#fff' },
  viewerPage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  viewerImage: { backgroundColor: '#fff' },
  viewerTopBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 },
  viewerCounter: { minWidth: 48, height: 36, paddingHorizontal: Spacing.three, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.34)' },
  viewerClose: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.34)' },
  viewerText: { color: '#FFFFFF', fontSize: 14, lineHeight: 18, fontWeight: '600' },
  viewerCloseText: { color: '#FFFFFF', fontSize: 20, fontWeight: '400' },
  viewerDots: { position: 'absolute', left: 0, right: 0, bottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 5 },
  viewerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fff' },
  viewerDotActive: { width: 20, backgroundColor: '#fff' },
  details: { gap: Spacing.four, padding: Spacing.four, backgroundColor: '#FFFFFF' },
  productHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headingText: { flex: 1, gap: 4 },
  productName: { fontSize: 16, lineHeight: 23 },
  favoriteButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  listPrice: { color: '#8c8781', fontSize: 16, textDecorationLine: 'line-through'  },
	bestPrice: { color: '#0a0a0a', fontSize: 20},
  selectorGroup: { gap: Spacing.two },
  colorList: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  colorOption: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#d7d2ca', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  selectedColorOption: { borderWidth: 2, borderColor: '#0a0a0a' },
  colorCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#d7d2ca' },
  moreColorsButton: { minHeight: 38, paddingHorizontal: Spacing.three, borderRadius: 19, borderWidth: 1, borderColor: '#d7d2ca', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  moreColorsText: { fontSize: 12 },
	titleColorModal: { fontSize: 16 },
  variantOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  variantOption: { minWidth: 42, height: 42, paddingHorizontal: Spacing.three, borderRadius: 21, borderWidth: 1, borderColor: '#d7d3cc', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  selectedVariant: { backgroundColor: '#0a0a0a', borderColor: '#0a0a0a' },
  selectedVariantText: { color: '#FFFFFF', fontWeight: '700' },
  unavailableVariant: { opacity: 0.35, backgroundColor: '#eeeae4' },
  unavailableVariantText: { textDecorationLine: 'line-through' },
  selectionMessage: { marginTop: -Spacing.two, color: '#B42318', fontWeight: '600' },
  mainAddButton: { minHeight: 50, borderRadius: 8, flexDirection: 'row', gap: Spacing.two, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  mainAddButtonHidden: { display: 'none' },
  mainAddText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.45 },
  messageText: { color: '#B42318' },
  helperButtons: { flexDirection: 'row', gap: Spacing.two },
  helperButton: { flex: 1, minHeight: 44, paddingHorizontal: Spacing.two, borderRadius: 8, borderWidth: 1, borderColor: '#bdb6ad', flexDirection: 'row', gap: Spacing.one, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  shippingSection: { gap: Spacing.three, paddingTop: Spacing.two },
  sectionTitle: { fontSize: 17, lineHeight: 23 },
  shippingRow: { minHeight: 48, flexDirection: 'row' },
  shippingInput: { flex: 1, paddingHorizontal: Spacing.three, borderWidth: 1, borderColor: '#cfc8bf', borderTopLeftRadius: 8, borderBottomLeftRadius: 8, backgroundColor: '#FFFFFF', fontFamily: Fonts.sans },
  shippingButton: { minWidth: 108, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#0a0a0a' },
  shippingButtonText: { color: '#FFFFFF', fontWeight: '700' },
  shippingQuote: { padding: Spacing.three, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, backgroundColor: '#f7f4ef' },
  accordion: { marginHorizontal: -Spacing.four, borderTopWidth: 1, borderTopColor: '#e5e0d9' },
  accordionHeader: { minHeight: 52, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accordionContent: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  accordionTitle: { fontSize: 16, lineHeight: 23, fontWeight: '500' },
  accordionText: { color: '#625d57', lineHeight: 21, fontSize: 12 },
  dropdownChevron: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  dropdownChevronOpen: { transform: [{ rotate: '-90deg' }] },
  floatingBar: { position: 'absolute', left: 10, right: 10, bottom: 20, minHeight: 50, borderRadius: 50, paddingHorizontal: 20, paddingVertical: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: '#fff', shadowColor: '#0a0a0a', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  floatingInfo: { flex: 1, gap: 2 },
  floatingName: { fontSize: 12 },
  floatingButton: { minWidth: 122, minHeight: 46, paddingHorizontal: Spacing.three, borderRadius: 8, flexDirection: 'row', gap: Spacing.two, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  floatingButtonText: { color: '#FFFFFF' },
  lookSection: { gap: Spacing.three, paddingTop: Spacing.four, borderTopWidth: 1, borderTopColor: '#e5e0d9' },
  lookTitle: { fontSize: 25, lineHeight: 31, fontFamily: Fonts.semibold },
  lookSubtitle: { fontSize: 16 },
  lookRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  lookRowOpen: { zIndex: 20 },
  lookImageWrap: { width: 150, height: 208, position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#e8e8ea' },
  lookImage: { width: '100%', height: '100%' },
  lookTag: { position: 'absolute', left: 5, right: 5, bottom: 6, minHeight: 25, paddingHorizontal: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.86)' },
  lookTagInteractive: { flexDirection: 'row', gap: 4 },
  lookTagDisabled: { opacity: 0.7 },
  lookTagText: { fontSize: 12 },
  lookInfo: { flex: 1, gap: Spacing.two },
  lookName: { fontSize: 15, lineHeight: 20 },
  lookPrice: { fontSize: 20, lineHeight: 24 },
  lookSelect: { minHeight: 54, paddingHorizontal: Spacing.three, borderRadius: 6, borderWidth: 1, borderColor: '#d2ccc4', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lookSelectError: { borderColor: '#D92D20' },
  lookKitSelectors: { gap: Spacing.two },
  lookSelectorWrap: { position: 'relative', zIndex: 10 },
  lookSelectorOpen: { zIndex: 40, elevation: 12 },
  lookOptions: { position: 'absolute', left: 0, right: 0, top: 56, paddingVertical: Spacing.one, borderWidth: 1, borderColor: '#d2ccc4', borderRadius: 6, backgroundColor: '#FFFFFF', zIndex: 30, shadowColor: '#0a0a0a', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  lookOption: { minHeight: 34, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  lookUnavailable: { opacity: 0.45 },
  lookUnavailableText: { textDecorationLine: 'line-through' },
  lookSelectionError: { color: '#D92D20', fontSize: 13, lineHeight: 18 },
  lookAddButton: { minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  lookSummary: { gap: Spacing.three, padding: Spacing.four, borderRadius: 20, alignItems: 'center', backgroundColor: '#f0efed' },
  lookTotal: { fontSize: 24, lineHeight: 30 },
  lookBuyButton: { minWidth: 166, minHeight: 44, paddingHorizontal: Spacing.four, borderRadius: 8, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  colorModal: { flex: 1, backgroundColor: '#FFFFFF' },
  colorModalSafeArea: { flex: 1 },
  colorModalHeader: { minHeight: 64, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e8e3dc' },
  colorModalClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  colorModalCloseText: { fontSize: 24, lineHeight: 28, color: '#0a0a0a', fontWeight: '400' },
  colorModalList: { padding: Spacing.three, paddingBottom: Spacing.five },
  colorModalRow: { gap: Spacing.two },
  colorModalItem: { width: '31.5%', minWidth: 0, marginBottom: Spacing.three, padding: 3, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', backgroundColor: '#FFFFFF' },
  selectedColorModalItem: { borderColor: '#0a0a0a' },
  colorModalImage: { width: '100%', aspectRatio: 0.72, borderRadius: 8, backgroundColor: '#e8e8ea' },
  colorModalName: { minHeight: 34, paddingTop: Spacing.one, fontSize: 11, lineHeight: 15 },
  similarSection: { gap: Spacing.three, marginTop: Spacing.three },
	similarProducts: { fontSize: 16 },
});

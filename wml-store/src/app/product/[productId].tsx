import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddToCartFeedback } from '@/components/add-to-cart-feedback';
import { CartIconButton } from '@/components/cart-icon-button';
import { LoginRequiredModal } from '@/components/login-required-modal';
import ArrowLeftIAIcon from '@/components/icons/ArrowLeftIAicon';
import HeartIcon from '@/components/icons/HeartIcon';
import HopeLogoIcon from '@/components/icons/HopeLogoIcon';
import SearchIcon from '@/components/icons/SearchIcon';
import ShoppingBagIcon from '@/components/icons/ShoppingBagIcon';
import { ProductCard } from '@/components/product-card';
import { ProductQuickView } from '@/components/product-quick-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { addItemToCart, getOrderForm, simulateProductShipping, type ShippingQuote } from '@/services/cart';
import { getCompleteLookProducts, getProduct, getProductColorOptions, getSimilarProducts, type Product, type ProductVariant } from '@/services/catalog';
import { canSaveFavorites, getKnownFavoriteAuthState, isFavorite, toggleFavorite } from '@/services/favorites';

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

function buildVariationGroups(product: Product | null) {
  return product?.variants.reduce<Record<string, string[]>>((groups, variant) => {
    Object.entries(variant.variations).forEach(([name, value]) => {
      groups[name] = groups[name] ? Array.from(new Set([...groups[name], value])) : [value];
    });
    return groups;
  }, {}) ?? {};
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
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectionMessage, setSelectionMessage] = useState('');
  const [quickViewVisible, setQuickViewVisible] = useState(false);
  const [colorsVisible, setColorsVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [detailsY, setDetailsY] = useState(0);
  const [buttonLayout, setButtonLayout] = useState<{ y: number; height: number } | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [postalCode, setPostalCode] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingQuotes, setShippingQuotes] = useState<ShippingQuote[]>([]);
  const [shippingMessage, setShippingMessage] = useState('');
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const galleryListRef = useRef<FlatList<string>>(null);

  const variantGroups = useMemo(() => buildVariationGroups(product), [product]);
  const variationNames = Object.keys(variantGroups);
  const activeVariant = product?.variants.find((variant) => (
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

  async function addProduct() {
    if (!product) return;
    if (variationNames.some((name) => !selectedOptions[name])) {
      const hasSize = variationNames.some((name) => normalizeText(name).includes('tamanho'));
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
      setCartMessage('Produto adicionado à sacola.');
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
    if (variationNames.some((name) => !selectedOptions[name])) {
      setQuickViewVisible(true);
      return;
    }
    void addProduct();
  }

  const buttonVisible = buttonLayout
    ? detailsY + buttonLayout.y - scrollY < viewportHeight && detailsY + buttonLayout.y + buttonLayout.height - scrollY > 0
    : true;
  const showFloatingButton = Boolean(product && buttonLayout && viewportHeight > 0 && !buttonVisible);
  const currentPrice = activeVariant?.price ?? product?.price ?? null;
  const currentListPrice = activeVariant?.listPrice ?? product?.listPrice ?? null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        {loading && <ActivityIndicator color="#000000" style={styles.loader} />}
        {error && <ThemedText style={styles.errorText}>Produto não encontrado.</ThemedText>}
        {product && (
          <ScrollView
            contentContainerStyle={[styles.content, showFloatingButton && styles.contentWithFloating]}
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}>
            {galleryImages.length > 0 && (
              <View style={[styles.galleryArea, { height: screenHeight }] }>
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
                      style={[styles.heroImagePressable, { width: screenWidth, height: screenHeight }]}
                    >
                      <Image source={{ uri: item }} style={[styles.mainImage, { width: screenWidth, height: screenHeight }]} contentFit="cover" />
                    </Pressable>
                  )}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.7)']}
                  locations={[0, 0.46, 1]}
                  style={styles.heroShade}
                />
                {galleryImages.length > 1 && <View pointerEvents="none" style={styles.heroDots}>{galleryImages.map((_, index) => <View key={index} style={[styles.dot, imageIndex === index && styles.activeDot]} />)}</View>}
                <View style={styles.heroProductInfo}>
                  <View style={styles.heroProductCopy}>
                    <ThemedText numberOfLines={2} style={styles.heroProductName}>{product.name}</ThemedText>
                    {currentPrice !== null && <ThemedText type="smallBold" style={styles.heroProductPrice}>{money(currentPrice)}</ThemedText>}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.details} onLayout={(event) => setDetailsY(event.nativeEvent.layout.y)}>
              <View style={styles.productHeading}>
                <View style={styles.headingText}>
                  <ThemedText style={styles.productName}>{product.name}</ThemedText>
                  {!!product.brand && <ThemedText themeColor="textSecondary">{product.brand}</ThemedText>}
                  {currentListPrice !== null && currentPrice !== null && currentListPrice > currentPrice && <ThemedText style={styles.listPrice}>De {money(currentListPrice)}</ThemedText>}
                  {currentPrice !== null && <ThemedText type="subtitle">{money(currentPrice)}</ThemedText>}
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

              {Object.entries(variantGroups).map(([name, values]) => (
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

              <Pressable disabled={adding} onLayout={(event) => setButtonLayout({ y: event.nativeEvent.layout.y, height: event.nativeEvent.layout.height })} onPress={addProduct} style={styles.mainAddButton}>
                {/*<ShoppingBagIcon size={18} color="#FFFFFF" />*/}
                {adding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <ThemedText style={styles.mainAddText}>Adicionar à sacola</ThemedText>}
              </Pressable>
              <View style={styles.helperButtons}>
                <Pressable onPress={() => Alert.alert('Provador Virtual', 'O provador virtual será conectado nesta etapa da migração.')} style={styles.helperButton}><ThemedText>♧</ThemedText><ThemedText type="smallBold">Provador Virtual</ThemedText></Pressable>
                <Pressable onPress={() => Alert.alert('Tabela de medidas', 'A tabela de medidas será aberta aqui.')} style={styles.helperButton}><ThemedText>↔</ThemedText><ThemedText type="smallBold">Tabela de medidas</ThemedText></Pressable>
              </View>

              <View style={styles.shippingSection}>
                <ThemedText style={styles.sectionTitle}>Calcule o frete e prazo de entrega</ThemedText>
                <View style={styles.shippingRow}>
                  <TextInput value={postalCode} onChangeText={updatePostalCode} placeholder="Digite seu CEP" keyboardType="number-pad" maxLength={9} style={styles.shippingInput} />
                  <Pressable disabled={shippingLoading} onPress={calculateShipping} style={styles.shippingButton}><ThemedText style={styles.shippingButtonText}>{shippingLoading ? 'Calculando...' : 'Calcular'}</ThemedText></Pressable>
                </View>
                {!!shippingMessage && <ThemedText style={styles.messageText}>{shippingMessage}</ThemedText>}
                {shippingQuotes.map((quote) => <View key={quote.id} style={styles.shippingQuote}><View><ThemedText type="smallBold">{quote.name}</ThemedText><ThemedText themeColor="textSecondary">Receba em {estimateLabel(quote.shippingEstimate)}</ThemedText></View><ThemedText type="smallBold">{quote.price === 0 ? 'Grátis' : money(quote.price)}</ThemedText></View>)}
              </View>

              <Accordion title="Descrição" open={descriptionOpen} onToggle={() => setDescriptionOpen((value) => !value)}>
                <ThemedText style={styles.accordionText}>{product.description || 'Descrição não cadastrada.'}</ThemedText>
              </Accordion>
              <Accordion title="Composição e Cuidados" open={compositionOpen} onToggle={() => setCompositionOpen((value) => !value)}>
                {!!product.composition && <ThemedText style={styles.accordionText}><ThemedText type="smallBold">Composição: </ThemedText>{product.composition}</ThemedText>}
                {!!product.care && <ThemedText style={styles.accordionText}><ThemedText type="smallBold">Cuidados: </ThemedText>{product.care}</ThemedText>}
                {!product.composition && !product.care && <ThemedText style={styles.accordionText}>Informações não cadastradas.</ThemedText>}
              </Accordion>

              {lookLoading && <ActivityIndicator color="#000000" />}
              {!lookLoading && lookProducts.length > 1 && <CompleteLook products={lookProducts} />}

              <View style={styles.similarSection}>
                <ThemedText type="subtitle">Produtos similares</ThemedText>
                {similarLoading && <ActivityIndicator color="#000000" />}
                {!similarLoading && similarProducts.length > 0 && <FlatList data={similarProducts} horizontal nestedScrollEnabled snapToInterval={232} decelerationRate="fast" disableIntervalMomentum showsHorizontalScrollIndicator={false} keyExtractor={(item) => item.id} contentContainerStyle={styles.similarList} renderItem={({ item }) => <ProductCard product={item} style={styles.similarCard} />} />}
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
        {product && <ProductQuickView product={product} visible={quickViewVisible} onClose={() => setQuickViewVisible(false)} />}
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
  const name = variationNames.find((key) => normalizeText(key).includes('tamanho') || normalizeText(key).includes('size'));
  if (!name) return { name: '', options: [] as Array<{ value: string; available: boolean }> };
  const values = Array.from(new Set(product.variants.map((variant) => variant.variations[name]).filter(Boolean)));
  return {
    name,
    options: values.map((value) => ({ value, available: product.variants.some((variant) => variant.available && variant.variations[name] === value) })),
  };
}

function CompleteLook({ products }: { products: Product[] }) {
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
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
    return {
      product,
      size,
      selectedVariant: size.name
        ? product.variants.find((variant) => variant.available && variant.variations[size.name] === selected)
        : product.variants.find((variant) => variant.available) ?? product.variants[0],
    };
  });
  const total = variants.reduce((sum, item) => sum + (item.selectedVariant?.price ?? item.product.price ?? 0), 0);

  async function addLookProduct(product: Product) {
    const item = variants.find((value) => value.product.id === product.id);
    if (!item?.selectedVariant) {
      setSelectionErrors((current) => ({ ...current, [product.id]: 'Selecione o tamanho para adicionar à sacola.' }));
      return;
    }
    setAddingId(product.id);
    setSelectionErrors((current) => { const next = { ...current }; delete next[product.id]; return next; });
    setMessage('');
    try {
      const orderForm = await getOrderForm();
      await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: item.selectedVariant.itemId, sellerId: item.selectedVariant.sellerId });
      setMessage('Produto adicionado à sacola.');
    } catch {
      setMessage('Não foi possível adicionar o produto agora.');
    } finally {
      setAddingId(null);
    }
  }

  async function buyTogether() {
    const missing = variants.find((item) => !item.selectedVariant);
    if (missing) {
      setSelectionErrors(Object.fromEntries(variants.filter((item) => !item.selectedVariant).map((item) => [item.product.id, 'Selecione o tamanho para adicionar à sacola.'])));
      return;
    }
    setBuyingTogether(true);
    setMessage('');
    try {
      let orderForm = await getOrderForm();
      for (const item of variants) {
        if (!item.selectedVariant) continue;
        orderForm = await addItemToCart({ orderFormId: orderForm.orderFormId, itemId: item.selectedVariant.itemId, sellerId: item.selectedVariant.sellerId });
      }
      setMessage('Produtos adicionados à sacola.');
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
      {variants.map(({ product, size, selectedVariant }, index) => (
        <View key={product.id} style={[styles.lookRow, openSize === product.id && styles.lookRowOpen]}>
          <View style={styles.lookImageWrap}>
            {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} style={styles.lookImage} contentFit="cover" />}
            {index === 0 ? <View style={styles.lookTag}><ThemedText style={styles.lookTagText}>Você está vendo</ThemedText></View> : <Pressable disabled={recommendations.length < 2} onPress={() => { setReplacementIndex((value) => (value + 1) % recommendations.length); setOpenSize(null); setMessage(''); }} style={[styles.lookTag, recommendations.length < 2 && styles.lookTagDisabled]}><ThemedText style={styles.lookTagText}>↻ Trocar</ThemedText></Pressable>}
          </View>
          <View style={styles.lookInfo}>
            <ThemedText numberOfLines={2} style={styles.lookName}>{product.name}</ThemedText>
            <ThemedText type="subtitle" style={styles.lookPrice}>{money(selectedVariant?.price ?? product.price)}</ThemedText>
            {!!size.name && (
              <View style={styles.lookSelectorWrap}>
                <Pressable onPress={() => setOpenSize(openSize === product.id ? null : product.id)} style={[styles.lookSelect, selectionErrors[product.id] && styles.lookSelectError]}>
                  <ThemedText>{selectedSizes[product.id] || 'Tamanho'}</ThemedText>
                  <ThemedText>⌄</ThemedText>
                </Pressable>
                {openSize === product.id && <View style={styles.lookOptions}>{size.options.map((option) => <Pressable key={option.value} disabled={!option.available} onPress={() => { setSelectedSizes((current) => ({ ...current, [product.id]: option.value })); setSelectionErrors((current) => { const next = { ...current }; delete next[product.id]; return next; }); setOpenSize(null); setMessage(''); }} style={[styles.lookOption, !option.available && styles.lookUnavailable]}><ThemedText style={!option.available && styles.lookUnavailableText}>{option.value}</ThemedText></Pressable>)}</View>}
                {!!selectionErrors[product.id] && <ThemedText style={styles.lookSelectionError}>{selectionErrors[product.id]}</ThemedText>}
              </View>
            )}
            <Pressable disabled={addingId === product.id} onPress={() => addLookProduct(product)} style={styles.lookAddButton}>
              {addingId === product.id ? <ActivityIndicator size="small" color="#231f20" /> : <ThemedText type="smallBold">Adicionar à sacola</ThemedText>}
            </Pressable>
          </View>
        </View>
      ))}
      <View style={styles.lookSummary}>
        <ThemedText>Leve os {rows.length} produtos por:</ThemedText>
        <ThemedText type="subtitle" style={styles.lookTotal}>{money(total)}</ThemedText>
        <Pressable disabled={buyingTogether} onPress={buyTogether} style={styles.lookBuyButton}>
          {buyingTogether ? <ActivityIndicator size="small" color="#231f20" /> : <ThemedText type="smallBold">Comprar junto</ThemedText>}
        </Pressable>
      </View>
      {!!message && <ThemedText style={message.includes('adicionado') ? styles.successText : styles.messageText}>{message}</ThemedText>}
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
          <ArrowLeftIAIcon color="#231f20" size={21} />
        </Pressable>
      </View>
      {heroMode ? <View style={styles.logoPlaceholder} /> : <Pressable accessibilityLabel="Ir para o início" onPress={onLogo} style={styles.logoButton}><HopeLogoIcon color="#231f20" width={76} height={20} /></Pressable>}
      <View style={[styles.headerSide, styles.headerActions]}>
        <Pressable accessibilityLabel="Buscar" onPress={onSearch} style={[styles.headerButton, heroMode && styles.heroHeaderButton]}>
          <SearchIcon size={21} color="#231f20" />
        </Pressable>
        <CartIconButton color="#231f20" onPress={onCart} style={[styles.headerButton, heroMode && styles.heroHeaderButton]} />
      </View>
    </View>
  );
}

function Accordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return <View style={styles.accordion}><Pressable accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.accordionHeader}><ThemedText style={styles.sectionTitle}>{title}</ThemedText><ThemedText style={styles.chevron}>{open ? '⌃' : '⌄'}</ThemedText></Pressable>{open && <View style={styles.accordionContent}>{children}</View>}</View>;
}

function ColorOptionsModal({ products, visible, selectedProductId, onClose, onSelect }: { products: Product[]; visible: boolean; selectedProductId?: string; onClose: () => void; onSelect: (product: Product) => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ThemedView style={styles.colorModal}>
        <SafeAreaView style={styles.colorModalSafeArea}>
          <View style={styles.colorModalHeader}>
            <ThemedText type="subtitle">Ver cores ({products.length})</ThemedText>
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
  scrolledHeader: { borderBottomWidth: 1, borderBottomColor: '#ece8e2', backgroundColor: '#fbfaf7' },
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
  heroProductCopy: { gap: 3 },
  heroProductName: { color: '#FFFFFF', fontSize: 14, lineHeight: 18 },
  heroProductPrice: { color: '#FFFFFF', fontSize: 14 },
  viewer: { flex: 1, backgroundColor: '#fff' },
  viewerList: { flex: 1, backgroundColor: '#fff' },
  viewerListContent: { backgroundColor: '#fff' },
  viewerPage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  viewerImage: { backgroundColor: '#fff' },
  viewerTopBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 5 },
  viewerCounter: { minWidth: 48, height: 36, paddingHorizontal: Spacing.three, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.34)' },
  viewerClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.34)' },
  viewerText: { color: '#FFFFFF', fontSize: 14, lineHeight: 18, fontWeight: '600' },
  viewerCloseText: { color: '#000000', fontSize: 24, lineHeight: 28, fontWeight: '400' },
  viewerDots: { position: 'absolute', left: 0, right: 0, bottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 5 },
  viewerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', borderWidth: 1, borderColor: '#fff' },
  viewerDotActive: { width: 20, backgroundColor: '#fff' },
  details: { gap: Spacing.four, padding: Spacing.four, backgroundColor: '#FFFFFF' },
  productHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headingText: { flex: 1, gap: 4 },
  productName: { fontSize: 17, lineHeight: 23 },
  favoriteButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  listPrice: { color: '#8c8781', textDecorationLine: 'line-through' },
  selectorGroup: { gap: Spacing.two },
  colorList: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  colorOption: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#d7d2ca', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  selectedColorOption: { borderWidth: 2, borderColor: '#1e120d' },
  colorCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#d7d2ca' },
  moreColorsButton: { minHeight: 38, paddingHorizontal: Spacing.three, borderRadius: 19, borderWidth: 1, borderColor: '#d7d2ca', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  moreColorsText: { fontSize: 12 },
  variantOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  variantOption: { minWidth: 42, height: 42, paddingHorizontal: Spacing.three, borderRadius: 21, borderWidth: 1, borderColor: '#d7d3cc', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  selectedVariant: { backgroundColor: '#1e120d', borderColor: '#1e120d' },
  selectedVariantText: { color: '#FFFFFF', fontWeight: '700' },
  unavailableVariant: { opacity: 0.35, backgroundColor: '#eeeae4' },
  unavailableVariantText: { textDecorationLine: 'line-through' },
  selectionMessage: { marginTop: -Spacing.two, color: '#B42318', fontWeight: '600' },
  mainAddButton: { minHeight: 50, borderRadius: 8, flexDirection: 'row', gap: Spacing.two, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e120d' },
  mainAddText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.45 },
  successText: { color: '#26734d', fontWeight: '600' },
  messageText: { color: '#B42318' },
  helperButtons: { flexDirection: 'row', gap: Spacing.two },
  helperButton: { flex: 1, minHeight: 44, paddingHorizontal: Spacing.two, borderRadius: 8, borderWidth: 1, borderColor: '#bdb6ad', flexDirection: 'row', gap: Spacing.one, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  shippingSection: { gap: Spacing.three, paddingTop: Spacing.two },
  sectionTitle: { fontSize: 17, lineHeight: 23 },
  shippingRow: { minHeight: 48, flexDirection: 'row' },
  shippingInput: { flex: 1, paddingHorizontal: Spacing.three, borderWidth: 1, borderColor: '#cfc8bf', borderTopLeftRadius: 8, borderBottomLeftRadius: 8, backgroundColor: '#FFFFFF', fontFamily: Fonts.sans },
  shippingButton: { minWidth: 108, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#1e120d' },
  shippingButtonText: { color: '#FFFFFF', fontWeight: '700' },
  shippingQuote: { padding: Spacing.three, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, backgroundColor: '#f7f4ef' },
  accordion: { marginHorizontal: -Spacing.four, borderTopWidth: 1, borderTopColor: '#e5e0d9' },
  accordionHeader: { minHeight: 52, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accordionContent: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  accordionText: { color: '#625d57', lineHeight: 21 },
  chevron: { fontSize: 20, color: '#625d57' },
  floatingBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 92, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: '#fff', shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  floatingInfo: { flex: 1, gap: 2 },
  floatingName: { fontSize: 12 },
  floatingButton: { minWidth: 122, minHeight: 46, paddingHorizontal: Spacing.three, borderRadius: 8, flexDirection: 'row', gap: Spacing.two, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  floatingButtonText: { color: '#FFFFFF' },
  lookSection: { gap: Spacing.three, paddingTop: Spacing.four, borderTopWidth: 1, borderTopColor: '#e5e0d9' },
  lookTitle: { fontSize: 25, lineHeight: 31, fontFamily: Fonts.semibold },
  lookSubtitle: { fontSize: 16 },
  lookRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  lookRowOpen: { zIndex: 20 },
  lookImageWrap: { width: 150, height: 208, position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#e8e8ea' },
  lookImage: { width: '100%', height: '100%' },
  lookTag: { position: 'absolute', left: 5, right: 5, bottom: 6, minHeight: 25, paddingHorizontal: 8, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.86)' },
  lookTagDisabled: { opacity: 0.7 },
  lookTagText: { fontSize: 12 },
  lookInfo: { flex: 1, gap: Spacing.two },
  lookName: { fontSize: 15, lineHeight: 20 },
  lookPrice: { fontSize: 20, lineHeight: 24 },
  lookSelect: { minHeight: 54, paddingHorizontal: Spacing.three, borderRadius: 6, borderWidth: 1, borderColor: '#d2ccc4', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lookSelectError: { borderColor: '#D92D20' },
  lookSelectorWrap: { position: 'relative', zIndex: 10 },
  lookOptions: { position: 'absolute', left: 0, right: 0, top: 56, paddingVertical: Spacing.one, borderWidth: 1, borderColor: '#d2ccc4', borderRadius: 6, backgroundColor: '#FFFFFF', zIndex: 30, shadowColor: '#000000', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  lookOption: { minHeight: 34, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  lookUnavailable: { opacity: 0.45 },
  lookUnavailableText: { textDecorationLine: 'line-through' },
  lookSelectionError: { color: '#D92D20', fontSize: 13, lineHeight: 18 },
  lookAddButton: { minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#231f20', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  lookSummary: { gap: Spacing.three, padding: Spacing.four, borderRadius: 20, alignItems: 'center', backgroundColor: '#f0efed' },
  lookTotal: { fontSize: 24, lineHeight: 30 },
  lookBuyButton: { minWidth: 166, minHeight: 44, paddingHorizontal: Spacing.four, borderRadius: 8, borderWidth: 1, borderColor: '#231f20', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  colorModal: { flex: 1, backgroundColor: '#FFFFFF' },
  colorModalSafeArea: { flex: 1 },
  colorModalHeader: { minHeight: 64, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#e8e3dc' },
  colorModalClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  colorModalCloseText: { fontSize: 24, lineHeight: 28, color: '#000000', fontWeight: '400' },
  colorModalList: { padding: Spacing.three, paddingBottom: Spacing.five },
  colorModalRow: { gap: Spacing.two },
  colorModalItem: { width: '31.5%', minWidth: 0, marginBottom: Spacing.three, padding: 3, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', backgroundColor: '#FFFFFF' },
  selectedColorModalItem: { borderColor: '#1e120d' },
  colorModalImage: { width: '100%', aspectRatio: 0.72, borderRadius: 8, backgroundColor: '#e8e8ea' },
  colorModalName: { minHeight: 34, paddingTop: Spacing.one, fontSize: 11, lineHeight: 15 },
  similarSection: { gap: Spacing.three, marginTop: Spacing.three },
  similarList: { gap: 12, paddingRight: Spacing.four },
  similarCard: { width: 220 },
});

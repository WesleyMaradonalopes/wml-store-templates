import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getCompleteLookProducts, getProduct, type Product } from '@/services/catalog';

import { SkeletonBlock } from './skeleton';
import ShoppingBagIcon from './icons/ShoppingBagIcon';
import { ProductQuickViewButton } from './product-quick-view';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type ProductCollectionCarouselProps = {
  data: Record<string, unknown>;
};

const MAIN_CAROUSEL_GAP = Spacing.two;
const THUMBNAIL_CAROUSEL_GAP = Spacing.two;
const MAIN_CARD_WIDTH_RATIO = 0.72;

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function splitIds(value: unknown) {
  return text(value)
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function productIdsFromData(data: Record<string, unknown>) {
  const configuredItems = Array.isArray(data.products)
    ? data.products
    : Array.isArray(data.items)
      ? data.items
      : [];
  const itemIds = configuredItems.flatMap((item) => {
    if (typeof item === 'string') return splitIds(item);
    if (!item || typeof item !== 'object') return [];
    const value = item as Record<string, unknown>;
    return splitIds(value.productId ?? value.id ?? value.value);
  });
  const directIds = [data.productId, data.productIds, data.ids].flatMap(splitIds);
  return Array.from(new Set([...itemIds, ...directIds]));
}

function enabledFromData(value: unknown) {
  if (typeof value === 'boolean') return value;
  return !['false', '0', 'no', 'off'].includes(text(value).trim().toLowerCase());
}

function numberFromData(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(text(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function money(value: number | null) {
  return value === null ? '' : `R$ ${value.toFixed(2).replace('.', ',')}`;
}

const productColorHexPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const productColorFunctionPattern = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i;

function cmsColor(value: unknown, fallback: string) {
  const color = text(value).trim();
  if (productColorHexPattern.test(color)) return color;

  const match = color.match(productColorFunctionPattern);
  if (!match) return fallback;

  const isRgba = color.slice(0, 4).toLowerCase() === 'rgba';
  const hasAlpha = typeof match[4] === 'string';
  if (isRgba !== hasAlpha) return fallback;

  const channels = match.slice(1, 4).map(Number);
  if (channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) return fallback;

  if (hasAlpha) {
    const alpha = Number(match[4]);
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return fallback;
  }

  return color;
}

function ProductCollectionCarouselSkeleton({
  backgroundColor,
  screenWidth,
  showTitle,
  title,
}: {
  backgroundColor: string;
  screenWidth: number;
  showTitle: boolean;
  title: string;
}) {
  const mainCardWidth = Math.max(220, Math.round(screenWidth * MAIN_CARD_WIDTH_RATIO));
  const mainImageHeight = Math.min(520, Math.max(300, Math.round(mainCardWidth / 0.75)));
  const thumbnailWidth = Math.min(126, Math.max(92, Math.round(screenWidth * 0.25)));
  const thumbnailHeight = Math.round(thumbnailWidth * 1.32);

  return (
    <ThemedView style={[styles.section, { backgroundColor }]}>
      {showTitle && <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>}

      <View style={[styles.mainList, { paddingHorizontal: Math.max(0, (screenWidth - mainCardWidth) / 2) }]}>
        <View style={[styles.skeletonMainCard, { width: mainCardWidth }]}>
          <SkeletonBlock style={[styles.skeletonMainImage, { height: mainImageHeight }]} />
          <SkeletonBlock style={styles.skeletonMainName} />
        </View>
      </View>

      <View style={styles.thumbnailList}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={[styles.thumbnailCard, { width: thumbnailWidth }, item < 3 && styles.thumbnailGap]}>
            <SkeletonBlock style={[styles.skeletonThumbnailImage, { height: thumbnailHeight }]} />
            <SkeletonBlock style={styles.skeletonThumbnailPrice} />
          </View>
        ))}
      </View>
    </ThemedView>
  );
}

export function ProductCollectionCarousel({ data }: ProductCollectionCarouselProps) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [relatedProductsById, setRelatedProductsById] = useState<Record<string, Product[]>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [relatedProductsLoading, setRelatedProductsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const mainListRef = useRef<FlatList<Product>>(null);
  const thumbnailListRef = useRef<FlatList<Product | null>>(null);
  const productIds = useMemo(() => productIdsFromData(data), [data]);
  const maxItems = Math.min(12, numberFromData(data.maxItems ?? data.numberOfItems, 6));
  const enabled = enabledFromData(data.enabled);
  const title = text(data.title).trim() || 'Produtos em destaque';
  const showTitle = data.showTitle !== false;
  const backgroundColor = cmsColor(data.backgroundColor, '#FFFFFF');
  const mainCardWidth = Math.max(220, Math.round(screenWidth * MAIN_CARD_WIDTH_RATIO));
  const mainImageHeight = Math.min(520, Math.max(300, Math.round(mainCardWidth / 0.75)));
  const thumbnailWidth = Math.min(126, Math.max(92, Math.round(screenWidth * 0.25)));
  const thumbnailHeight = Math.round(thumbnailWidth * 1.32);
  const mainSnapInterval = mainCardWidth + MAIN_CAROUSEL_GAP;
  const thumbnailSnapInterval = thumbnailWidth + THUMBNAIL_CAROUSEL_GAP;
  const hasLoop = products.length > 1;

  useEffect(() => {
    let active = true;

    setProducts([]);
    setRelatedProductsById({});
    setActiveIndex(0);
    setSelectedProduct(null);
    setRelatedProductsLoading(false);

    if (!enabled || productIds.length === 0) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    void Promise.allSettled(productIds.slice(0, maxItems).map((productId) => getProduct(productId)))
      .then((results) => {
        if (!active) return;
        const loadedProducts = results.flatMap((result) => (
          result.status === 'fulfilled' && result.value ? [result.value] : []
        ));
        setProducts(Array.from(new Map(loadedProducts.map((product) => [product.id, product])).values()));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, maxItems, productIds]);

  const activeProduct = selectedProduct ?? products[activeIndex] ?? null;
  const mainProducts = useMemo(() => {
    if (!selectedProduct || !products[activeIndex]) return products;
    return products.map((product, index) => index === activeIndex ? selectedProduct : product);
  }, [activeIndex, products, selectedProduct]);
  const loopedProducts = useMemo(() => {
    if (mainProducts.length <= 1) return mainProducts;
    return [mainProducts[mainProducts.length - 1], ...mainProducts, mainProducts[0]];
  }, [mainProducts]);
  const relatedProducts = activeProduct ? relatedProductsById[activeProduct.id] ?? [] : [];
  const thumbnailProducts = activeProduct
    ? [activeProduct, ...relatedProducts.filter((product) => product.id !== activeProduct.id)]
    : [];
  const thumbnailItems: Array<Product | null> = relatedProductsLoading && activeProduct
    ? [activeProduct, null, null, null]
    : thumbnailProducts;

  function handleThumbnailPress(product: Product) {
    const configuredIndex = products.findIndex((item) => item.id === product.id);
    setSelectedProduct(product);

    if (configuredIndex < 0) return;

    setActiveIndex(configuredIndex);
    mainListRef.current?.scrollToIndex({
      index: hasLoop ? configuredIndex + 1 : configuredIndex,
      animated: true,
    });
  }

  useEffect(() => {
    if (!activeProduct) {
      setRelatedProductsLoading(false);
      return;
    }

    thumbnailListRef.current?.scrollToOffset({ offset: 0, animated: false });
    if (Object.prototype.hasOwnProperty.call(relatedProductsById, activeProduct.id)) {
      setRelatedProductsLoading(false);
      return;
    }

    let active = true;
    setRelatedProductsLoading(true);
    void getCompleteLookProducts(activeProduct, 8)
      .then((productsInLook) => {
        if (!active) return;
        setRelatedProductsById((current) => ({ ...current, [activeProduct.id]: productsInLook }));
        setRelatedProductsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setRelatedProductsById((current) => ({ ...current, [activeProduct.id]: [] }));
        setRelatedProductsLoading(false);
      });

    return () => {
      active = false;
      setRelatedProductsLoading(false);
    };
  }, [activeProduct, relatedProductsById]);

  if (!enabled || productIds.length === 0 || (!loading && products.length === 0)) return null;
  if (loading || !activeProduct) {
    return <ProductCollectionCarouselSkeleton backgroundColor={backgroundColor} screenWidth={screenWidth} showTitle={showTitle} title={title} />;
  }

  return (
    <ThemedView style={[styles.section, { backgroundColor }]}>
      {showTitle && <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>}

      <FlatList
        ref={mainListRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={mainSnapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        initialScrollIndex={hasLoop ? 1 : 0}
        getItemLayout={(_, index) => ({ length: mainSnapInterval, offset: mainSnapInterval * index, index })}
        onMomentumScrollEnd={(event) => {
          const loopIndex = Math.round(event.nativeEvent.contentOffset.x / mainSnapInterval);
          setSelectedProduct(null);

          if (hasLoop && loopIndex === 0) {
            setActiveIndex(products.length - 1);
            mainListRef.current?.scrollToIndex({ index: products.length, animated: false });
            return;
          }

          if (hasLoop && loopIndex === loopedProducts.length - 1) {
            setActiveIndex(0);
            mainListRef.current?.scrollToIndex({ index: 1, animated: false });
            return;
          }

          const nextIndex = hasLoop ? loopIndex - 1 : loopIndex;
          setActiveIndex(Math.min(products.length - 1, Math.max(0, nextIndex)));
        }}
        keyExtractor={(product, index) => `${product.id}-${index}`}
        contentContainerStyle={[styles.mainList, { paddingHorizontal: Math.max(0, (screenWidth - mainCardWidth) / 2) }]}
        data={loopedProducts}
        renderItem={({ item: product, index }) => (
          <Pressable
            accessibilityLabel={`Abrir produto ${product.name}`}
            accessibilityRole="link"
            onPress={() => router.push(`/product/${product.id}`)}
            style={({ pressed }) => [
              styles.mainCard,
              { width: mainCardWidth },
              index < loopedProducts.length - 1 && styles.mainCardGap,
              pressed && styles.mainCardPressed,
            ]}
          >
            <View style={[styles.mainImage, { height: mainImageHeight }]}>
              {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} contentFit="contain" style={StyleSheet.absoluteFill} />}
              <ProductQuickViewButton
                product={product}
                icon={<ShoppingBagIcon size={22} color="#0a0a0a" />}
                accessibilityLabel="Adicionar à sacola"
                disabled={!product.itemId}
                buttonStyle={styles.addButton}
              />
            </View>
            <ThemedText numberOfLines={2} style={styles.mainProductName}>{product.collection.trim() || product.name}</ThemedText>
          </Pressable>
        )}
      />

      <FlatList
        ref={thumbnailListRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={thumbnailSnapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        keyExtractor={(product, index) => product ? `${product.id}-${index}` : `thumbnail-skeleton-${index}`}
        contentContainerStyle={styles.thumbnailList}
        data={thumbnailItems}
        renderItem={({ item: product, index }) => product ? (
          <Pressable
            accessibilityLabel={`Selecionar ${product.name}`}
            accessibilityRole="button"
            onPress={() => handleThumbnailPress(product)}
            style={[styles.thumbnailCard, { width: thumbnailWidth }, index < thumbnailItems.length - 1 && styles.thumbnailGap]}
          >
            <View style={[styles.thumbnailImage, { height: thumbnailHeight }]}>
              {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} contentFit="contain" style={StyleSheet.absoluteFill} />}
            </View>
            {product.price !== null && <ThemedText style={styles.thumbnailPrice}>{money(product.price)}</ThemedText>}
          </Pressable>
        ) : (
          <View style={[styles.thumbnailCard, { width: thumbnailWidth }, index < thumbnailItems.length - 1 && styles.thumbnailGap]}>
            <SkeletonBlock style={[styles.skeletonThumbnailImage, { height: thumbnailHeight }]} />
            <SkeletonBlock style={styles.skeletonThumbnailPrice} />
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    width: '100%',
    overflow: 'hidden',
  },
  sectionTitle: {
    paddingHorizontal: Spacing.four,
    fontSize: 20,
    lineHeight: 28,
  },
  mainList: {
    alignItems: 'flex-start',
  },
  mainCard: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  mainCardPressed: {
    opacity: 0.82,
  },
  skeletonMainCard: {
    gap: Spacing.two,
  },
  skeletonMainImage: {
    borderRadius: 12,
  },
  skeletonMainName: {
    alignSelf: 'center',
    width: '78%',
    height: 18,
    borderRadius: 4,
  },
  mainCardGap: {
    marginRight: MAIN_CAROUSEL_GAP,
  },
  mainImage: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  addButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#c9c5c0',
  },
  mainProductName: {
    marginTop: Spacing.two,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  thumbnailList: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  thumbnailCard: {
    gap: Spacing.one,
  },
  thumbnailGap: {
    marginRight: THUMBNAIL_CAROUSEL_GAP,
  },
  thumbnailImage: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  thumbnailPrice: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  skeletonThumbnailImage: {
    borderRadius: 8,
  },
  skeletonThumbnailPrice: {
    alignSelf: 'center',
    width: '62%',
    height: 14,
    borderRadius: 4,
  },
});

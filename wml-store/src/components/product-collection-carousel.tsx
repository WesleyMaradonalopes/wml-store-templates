import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getCompleteLookProducts, getProduct, type Product } from '@/services/catalog';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type ProductCollectionCarouselProps = {
  data: Record<string, unknown>;
};

const MAIN_CAROUSEL_GAP = Spacing.two;
const THUMBNAIL_CAROUSEL_GAP = Spacing.two;

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

export function ProductCollectionCarousel({ data }: ProductCollectionCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [products, setProducts] = useState<Product[]>([]);
  const [relatedProductsById, setRelatedProductsById] = useState<Record<string, Product[]>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const mainListRef = useRef<FlatList<Product>>(null);
  const thumbnailListRef = useRef<FlatList<Product>>(null);
  const productIds = useMemo(() => productIdsFromData(data), [data]);
  const maxItems = Math.min(12, numberFromData(data.maxItems ?? data.numberOfItems, 6));
  const enabled = enabledFromData(data.enabled);
  const title = text(data.title).trim() || 'Produtos em destaque';
  const showTitle = data.showTitle !== false;
  const mainCardWidth = Math.max(220, screenWidth - Spacing.four * 2);
  const mainImageHeight = Math.min(520, Math.max(300, Math.round(mainCardWidth / 0.72)));
  const thumbnailWidth = Math.min(126, Math.max(92, Math.round(screenWidth * 0.25)));
  const thumbnailHeight = Math.round(thumbnailWidth * 1.28);
  const mainSnapInterval = mainCardWidth + MAIN_CAROUSEL_GAP;
  const thumbnailSnapInterval = thumbnailWidth + THUMBNAIL_CAROUSEL_GAP;

  useEffect(() => {
    let active = true;

    setProducts([]);
    setRelatedProductsById({});
    setActiveIndex(0);

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

  const activeProduct = products[activeIndex] ?? null;
  const relatedProducts = activeProduct ? relatedProductsById[activeProduct.id] ?? [] : [];
  const thumbnailProducts = activeProduct
    ? [activeProduct, ...relatedProducts.filter((product) => product.id !== activeProduct.id)]
    : [];

  useEffect(() => {
    if (!activeProduct) return;

    thumbnailListRef.current?.scrollToOffset({ offset: 0, animated: false });
    if (Object.prototype.hasOwnProperty.call(relatedProductsById, activeProduct.id)) return;

    let active = true;
    void getCompleteLookProducts(activeProduct, 8)
      .then((productsInLook) => {
        if (!active) return;
        setRelatedProductsById((current) => ({ ...current, [activeProduct.id]: productsInLook }));
      })
      .catch(() => {
        if (active) setRelatedProductsById((current) => ({ ...current, [activeProduct.id]: [] }));
      });

    return () => {
      active = false;
    };
  }, [activeProduct, relatedProductsById]);

  if (!enabled || (!loading && products.length === 0)) return null;
  if (loading || !activeProduct) return null;

  return (
    <ThemedView style={styles.section}>
      {showTitle && <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>}

      <FlatList
        ref={mainListRef}
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={mainSnapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        initialScrollIndex={activeIndex}
        getItemLayout={(_, index) => ({ length: mainSnapInterval, offset: mainSnapInterval * index, index })}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / mainSnapInterval);
          setActiveIndex(Math.min(products.length - 1, Math.max(0, nextIndex)));
        }}
        keyExtractor={(product) => product.id}
        contentContainerStyle={[styles.mainList, { paddingHorizontal: Math.max(0, (screenWidth - mainCardWidth) / 2) }]}
        renderItem={({ item: product, index }) => (
          <View style={[styles.mainCard, { width: mainCardWidth }, index < products.length - 1 && styles.mainCardGap]}>
            <View style={[styles.mainImage, { height: mainImageHeight }]}>
              {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} contentFit="contain" style={StyleSheet.absoluteFill} />}
            </View>
            <ThemedText numberOfLines={2} style={styles.mainProductName}>{product.name}</ThemedText>
          </View>
        )}
      />

      <FlatList
        ref={thumbnailListRef}
        data={thumbnailProducts}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={thumbnailSnapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        keyExtractor={(product) => product.id}
        contentContainerStyle={styles.thumbnailList}
        renderItem={({ item: product, index }) => (
          <View style={[styles.thumbnailCard, { width: thumbnailWidth }, index < thumbnailProducts.length - 1 && styles.thumbnailGap]}>
            <View style={[styles.thumbnailImage, { height: thumbnailHeight }]}>
              {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} contentFit="contain" style={StyleSheet.absoluteFill} />}
            </View>
            {product.price !== null && <ThemedText style={styles.thumbnailPrice}>{money(product.price)}</ThemedText>}
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
  mainCardGap: {
    marginRight: MAIN_CAROUSEL_GAP,
  },
  mainImage: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
  },
  mainProductName: {
    marginTop: Spacing.two,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  thumbnailList: {
    alignItems: 'flex-start',
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
    backgroundColor: '#f1f1f1',
  },
  thumbnailPrice: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

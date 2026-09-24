import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CloseCircleIcon from '@/components/icons/CloseCircleIcon';
import ShoppingBagIcon from '@/components/icons/ShoppingBagIcon';
import SpeakerIcon from '@/components/icons/SpeakerIcon';
import { ProductQuickView } from '@/components/product-quick-view';
import { Spacing } from '@/constants/theme';
import { getCompleteLookProducts, getProduct, type Product } from '@/services/catalog';
import { getWiddeStories, type WiddeStory } from '@/services/widde';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { WiddeStoryPlayback } from './widde-video';

type WiddeHomeVideoCarouselProps = {
  data: Record<string, unknown>;
};

type HomeVideoItem = {
  product: Product;
  story: WiddeStory;
};

type CarouselVideoItem = {
  key: string;
  item: HomeVideoItem;
};

const LOOP_COPIES = 3;
const ACTIVE_CARD_SCALE = 1.05;
const INACTIVE_CARD_SCALE = 1;
const CAROUSEL_GAP = 20;

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
  const inlineIds = [data.productIds, data.ids].flatMap(splitIds);
  return Array.from(new Set([...itemIds, ...inlineIds]));
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

export function WiddeHomeVideoCarousel({ data }: WiddeHomeVideoCarouselProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [items, setItems] = useState<HomeVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<HomeVideoItem | null>(null);
  const [lookProducts, setLookProducts] = useState<Product[]>([]);
  const [selectedLookIndex, setSelectedLookIndex] = useState(0);
  const [quickViewVisible, setQuickViewVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const listRef = useRef<FlatList<CarouselVideoItem>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const centeredIndexRef = useRef(0);
  const productIds = useMemo(() => productIdsFromData(data), [data]);
  const productIdsSignature = productIds.join('|');
  const enabled = enabledFromData(data.enabled);
  const maxItems = Math.min(12, numberFromData(data.maxItems ?? data.numberOfItems, 8));
  const title = text(data.title).trim() || 'Vídeos dos produtos';
  const cardWidth = Math.min(310, Math.max(210, Math.round(screenWidth * 0.68)));
  const cardHeight = Math.round(cardWidth / 0.58);
  const snapInterval = cardWidth + CAROUSEL_GAP;
  const lookCardWidth = Math.min(
    screenWidth - Spacing.two * 2,
    Math.max(260, screenWidth * 0.84),
  );
  const lookSnapInterval = lookCardWidth + Spacing.two;
  const carouselItems = useMemo<CarouselVideoItem[]>(() => {
    const copies = items.length > 1 ? LOOP_COPIES : 1;
    return Array.from({ length: copies }, (_, copyIndex) => items.map((item) => ({
      key: `${copyIndex}-${item.product.id}`,
      item,
    }))).flat();
  }, [items]);
  const initialCarouselIndex = items.length > 1 ? items.length : 0;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setItems([]);
    setActiveCarouselIndex(0);
    setSelectedItem(null);
    setQuickViewVisible(false);

    if (!enabled || productIds.length === 0) {
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    void Promise.allSettled(productIds.slice(0, maxItems).map(async (productId) => {
      const product = await getProduct(productId);
      const stories = await getWiddeStories(product.linkText, controller.signal);
      const story = stories[0];
      return story ? { product, story } : null;
    }))
      .then((results) => {
        if (!active) return;
        setItems(results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : []));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, maxItems, productIds, productIdsSignature]);

  useEffect(() => {
    let active = true;

    if (!selectedItem) {
      setLookProducts([]);
      setSelectedLookIndex(0);
      return () => {
        active = false;
      };
    }

    setLookProducts([selectedItem.product]);
    setSelectedLookIndex(0);

    void getCompleteLookProducts(selectedItem.product, 4)
      .then((products) => {
        if (!active) return;
        const allProducts = [
          selectedItem.product,
          ...products.filter((product) => product.id !== selectedItem.product.id),
        ];
        setLookProducts(Array.from(new Map(allProducts.map((product) => [product.id, product])).values()).slice(0, 5));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [selectedItem]);

  useEffect(() => {
    if (items.length === 0) return;

    centeredIndexRef.current = initialCarouselIndex;
    scrollX.setValue(initialCarouselIndex * snapInterval);
    setActiveCarouselIndex(initialCarouselIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initialCarouselIndex, animated: false });
    });
  }, [initialCarouselIndex, items.length, scrollX, snapInterval]);

  const handleCarouselScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offset = Math.max(0, event.nativeEvent.contentOffset.x);
    scrollX.setValue(offset);

    if (carouselItems.length === 0) return;
    const nextIndex = Math.max(0, Math.min(
      carouselItems.length - 1,
      Math.round(offset / snapInterval),
    ));
    if (centeredIndexRef.current === nextIndex) return;

    centeredIndexRef.current = nextIndex;
    setActiveCarouselIndex(nextIndex);
  }, [carouselItems.length, scrollX, snapInterval]);

  function handleCarouselScrollEnd(event: { nativeEvent: { contentOffset: { x: number } } }) {
    if (items.length === 0) return;

    const rawIndex = Math.max(0, Math.round(event.nativeEvent.contentOffset.x / snapInterval));
    const logicalIndex = rawIndex % items.length;
    const isLoopBoundary = items.length > 1 && (rawIndex < items.length || rawIndex >= items.length * 2);
    const normalizedIndex = isLoopBoundary ? items.length + logicalIndex : rawIndex;

    centeredIndexRef.current = normalizedIndex;
    scrollX.setValue(normalizedIndex * snapInterval);
    setActiveCarouselIndex(normalizedIndex);

    if (isLoopBoundary) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: normalizedIndex, animated: false });
      });
    }
  }

  function closeVideo() {
    setQuickViewVisible(false);
    setSelectedItem(null);
  }

  const selectedLookProduct = lookProducts[selectedLookIndex] || selectedItem?.product || null;
  const hasCompleteLook = lookProducts.length > 1;

  if (!enabled || (!loading && items.length === 0)) return null;
  if (loading) return null;

  return (
    <ThemedView style={styles.section}>
      {data.showTitle !== false && (
        <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>
      )}
      <FlatList
        ref={listRef}
        data={carouselItems}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        initialScrollIndex={initialCarouselIndex}
        getItemLayout={(_, index) => ({ length: snapInterval, offset: snapInterval * index, index })}
        onScroll={handleCarouselScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleCarouselScrollEnd}
        keyExtractor={(carouselItem) => carouselItem.key}
        contentContainerStyle={[styles.list, {
          paddingHorizontal: Math.max(0, (screenWidth - cardWidth) / 2),
          paddingVertical: Math.round(cardHeight * (ACTIVE_CARD_SCALE - 1) / 2),
        }]}
        renderItem={({ item: carouselItem, index }) => {
          const isActive = !selectedItem && index === activeCarouselIndex;
          const scale = scrollX.interpolate({
            inputRange: [
              (index - 1) * snapInterval,
              index * snapInterval,
              (index + 1) * snapInterval,
            ],
            outputRange: [INACTIVE_CARD_SCALE, ACTIVE_CARD_SCALE, INACTIVE_CARD_SCALE],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              style={[
                styles.card,
                { width: cardWidth, transform: [{ scale }] },
                index < carouselItems.length - 1 && styles.cardGap,
                isActive && styles.activeCard,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir vídeo de ${carouselItem.item.product.name}`}
                onPress={() => {
                  setMuted(true);
                  setSelectedItem(carouselItem.item);
                }}
                style={({ pressed }) => [styles.cardPressable, pressed && styles.pressed]}
              >
                <View style={[styles.media, { height: cardHeight }]}>
                  {!!carouselItem.item.story.thumbnailUrl && <Image source={{ uri: carouselItem.item.story.thumbnailUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />}
                  {isActive && (
                    <WiddeStoryPlayback
                      source={carouselItem.item.story.videoUrl}
                      active
                      loop
                      muted
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        }}
      />

      {selectedItem && (
        <Modal
          visible
          animationType="fade"
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={closeVideo}
        >
          <View style={styles.fullscreen}>
            {!!selectedItem.story.thumbnailUrl && <Image source={{ uri: selectedItem.story.thumbnailUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />}
            <WiddeStoryPlayback
              source={selectedItem.story.videoUrl}
              active
              loop
              muted={muted}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
              <View style={[styles.fullscreenActions, { top: insets.top + Spacing.four }]}>
                <Pressable accessibilityLabel="Fechar vídeo" onPress={closeVideo} style={styles.actionButton}>
                  <CloseCircleIcon color="#FFFFFF" size={28} />
                </Pressable>
                <Pressable accessibilityLabel={muted ? 'Ativar som' : 'Desativar som'} onPress={() => setMuted((value) => !value)} style={styles.actionButton}>
                  <SpeakerIcon color="#FFFFFF" muted={muted} size={28} />
                </Pressable>
              </View>
              <View style={[styles.fullscreenProduct, hasCompleteLook && styles.fullscreenProductCarousel, { bottom: Math.max(insets.bottom + Spacing.two, Spacing.three) }]}>
                {hasCompleteLook ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={lookSnapInterval}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    disableIntervalMomentum
                    onMomentumScrollEnd={(event) => {
                      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / lookSnapInterval);
                      setSelectedLookIndex(Math.min(lookProducts.length - 1, Math.max(0, nextIndex)));
                    }}
                    contentContainerStyle={styles.lookCarouselContent}
                  >
                    {lookProducts.map((lookProduct, index) => (
                      <View
                        key={lookProduct.id}
                        style={[
                          styles.lookCard,
                          { width: lookCardWidth },
                          index < lookProducts.length - 1 && styles.lookCardGap,
                        ]}
                      >
                        <View style={styles.fullscreenProductInfo}>
                          {!!lookProduct.imageUrl && <Image source={{ uri: lookProduct.imageUrl }} contentFit="cover" style={styles.productImage} />}
                          <View style={styles.productCopy}>
                            <ThemedText numberOfLines={2} style={styles.fullscreenProductName}>{lookProduct.name}</ThemedText>
                            {lookProduct.price !== null && <ThemedText style={styles.fullscreenProductPrice}>{money(lookProduct.price)}</ThemedText>}
                          </View>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Adicionar à sacola"
                          onPress={() => {
                            setSelectedLookIndex(index);
                            setQuickViewVisible(true);
                          }}
                          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                        >
                          <ShoppingBagIcon color="#FFFFFF" size={18} />
                          <ThemedText style={styles.addButtonText}>Adicionar à sacola</ThemedText>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                ) : selectedLookProduct ? (
                  <>
                    <View style={styles.fullscreenProductInfo}>
                      {!!selectedLookProduct.imageUrl && <Image source={{ uri: selectedLookProduct.imageUrl }} contentFit="cover" style={styles.productImage} />}
                      <View style={styles.productCopy}>
                        <ThemedText numberOfLines={2} style={styles.fullscreenProductName}>{selectedLookProduct.name}</ThemedText>
                        {selectedLookProduct.price !== null && <ThemedText style={styles.fullscreenProductPrice}>{money(selectedLookProduct.price)}</ThemedText>}
                      </View>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => setQuickViewVisible(true)} style={styles.addButton}>
                      <ShoppingBagIcon color="#FFFFFF" size={18} />
                      <ThemedText style={styles.addButtonText}>Adicionar à sacola</ThemedText>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {selectedItem && (
        <ProductQuickView
          product={selectedLookProduct || selectedItem.product}
          visible={quickViewVisible}
          onClose={() => setQuickViewVisible(false)}
          viewCartLabel="Ver a sacola"
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  sectionTitle: {
    paddingHorizontal: Spacing.four,
    fontSize: 20,
    lineHeight: 28,
  },
  list: {
    alignItems: 'flex-start',
  },
  card: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#0a0a0a',
  },
  cardPressable: {
    flex: 1,
  },
  activeCard: {
    zIndex: 2,
  },
  cardGap: {
    marginRight: CAROUSEL_GAP,
  },
  media: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  fullscreenActions: {
    position: 'absolute',
    right: Spacing.two,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: Spacing.one,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 5,
  },
  actionButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenProduct: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 6,
  },
  fullscreenProductCarousel: {
    padding: 0,
    overflow: 'visible',
    backgroundColor: 'transparent',
  },
  lookCarouselContent: {
    alignItems: 'stretch',
  },
  lookCard: {
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  lookCardGap: {
    marginRight: Spacing.two,
  },
  fullscreenProductInfo: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  productImage: {
    width: 54,
    height: 78,
    borderRadius: 4,
    backgroundColor: '#e9e4dd',
  },
  productCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  fullscreenProductName: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
  },
  fullscreenProductPrice: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  addButton: {
    minHeight: 50,
    marginTop: Spacing.two,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#0a0a0a',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
});

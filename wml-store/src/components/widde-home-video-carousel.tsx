import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CloseCircleIcon from '@/components/icons/CloseCircleIcon';
import ShoppingBagIcon from '@/components/icons/ShoppingBagIcon';
import SpeakerIcon from '@/components/icons/SpeakerIcon';
import { ProductQuickView } from '@/components/product-quick-view';
import { Spacing } from '@/constants/theme';
import { getProduct, type Product } from '@/services/catalog';
import { getWiddeStories, type WiddeStory } from '@/services/widde';
import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [items, setItems] = useState<HomeVideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<HomeVideoItem | null>(null);
  const [quickViewVisible, setQuickViewVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const productIds = useMemo(() => productIdsFromData(data), [data]);
  const productIdsSignature = productIds.join('|');
  const enabled = enabledFromData(data.enabled);
  const maxItems = Math.min(12, numberFromData(data.maxItems ?? data.numberOfItems, 8));
  const title = text(data.title).trim() || 'Vídeos dos produtos';
  const cardWidth = Math.min(280, Math.max(220, Math.round(screenWidth * 0.72)));
  const cardHeight = Math.round(cardWidth / 0.64);
  const snapInterval = cardWidth + Spacing.two;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setItems([]);
    setActiveIndex(0);
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

  function closeVideo() {
    setQuickViewVisible(false);
    setSelectedItem(null);
  }

  if (!enabled || (!loading && items.length === 0)) return null;
  if (loading) return null;

  return (
    <ThemedView style={styles.section}>
      {data.showTitle !== false && (
        <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
          setActiveIndex(Math.max(0, Math.min(items.length - 1, nextIndex)));
        }}
        contentContainerStyle={styles.list}
      >
        {items.map((item, index) => (
          <Pressable
            key={item.product.id}
            accessibilityRole="button"
            accessibilityLabel={`Abrir vídeo de ${item.product.name}`}
            onPress={() => {
              setMuted(true);
              setSelectedItem(item);
            }}
            style={({ pressed }) => [
              styles.card,
              { width: cardWidth },
              index < items.length - 1 && styles.cardGap,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.media, { height: cardHeight }]}>
              {!!item.story.thumbnailUrl && <Image source={{ uri: item.story.thumbnailUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />}
              <WiddeStoryPlayback
                source={item.story.previewUrl}
                active={!selectedItem && index === activeIndex}
                loop
                muted
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.mediaBadge}>
                <ThemedText style={styles.mediaBadgeText}>WIDDE</ThemedText>
              </View>
            </View>
            <View style={[styles.productInfo, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText numberOfLines={2} style={styles.productName}>{item.product.name}</ThemedText>
              {item.product.price !== null && <ThemedText style={styles.productPrice}>{money(item.product.price)}</ThemedText>}
            </View>
          </Pressable>
        ))}
      </ScrollView>

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
              <View style={[styles.fullscreenProduct, { bottom: Math.max(insets.bottom + Spacing.two, Spacing.three) }]}>
                <View style={styles.fullscreenProductInfo}>
                  {!!selectedItem.product.imageUrl && <Image source={{ uri: selectedItem.product.imageUrl }} contentFit="cover" style={styles.productImage} />}
                  <View style={styles.productCopy}>
                    <ThemedText numberOfLines={2} style={styles.fullscreenProductName}>{selectedItem.product.name}</ThemedText>
                    {selectedItem.product.price !== null && <ThemedText style={styles.fullscreenProductPrice}>{money(selectedItem.product.price)}</ThemedText>}
                  </View>
                </View>
                <Pressable accessibilityRole="button" onPress={() => setQuickViewVisible(true)} style={styles.addButton}>
                  <ShoppingBagIcon color="#FFFFFF" size={18} />
                  <ThemedText style={styles.addButtonText}>Adicionar produto</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {selectedItem && (
        <ProductQuickView
          product={selectedItem.product}
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
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#15110f',
  },
  cardGap: {
    marginRight: Spacing.two,
  },
  media: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#15110f',
  },
  mediaBadge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  productInfo: {
    minHeight: 70,
    gap: Spacing.one,
    padding: Spacing.two,
  },
  productName: {
    fontSize: 13,
    lineHeight: 17,
  },
  productPrice: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
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
    backgroundColor: 'rgba(91, 60, 40, 0.86)',
    zIndex: 6,
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

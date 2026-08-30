import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { Product } from '@/services/catalog';

import { ProductCard } from './product-card';

export const PRODUCT_CAROUSEL_GAP = 16;

export function productCarouselCardWidth(screenWidth: number) {
  return Math.min(300, Math.max(220, Math.round(screenWidth * 0.72)));
}

type ProductCarouselProps = {
  products: Product[];
  favoriteIds?: string[];
  onFavoriteChange?: (product: Product, favorite: boolean) => void;
  onAdded?: (product: Product) => void;
  showAddedModal?: boolean;
  nestedScrollEnabled?: boolean;
  leftInset?: number;
  rightInset?: number;
};

export function ProductCarousel({
  products,
  favoriteIds,
  onFavoriteChange,
  onAdded,
  showAddedModal = true,
  nestedScrollEnabled = false,
  leftInset,
  rightInset = 16,
}: ProductCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = productCarouselCardWidth(screenWidth);
  const effectiveLeftInset = leftInset ?? rightInset;
  const productSignature = products.map((product) => product.id).join('|');

  useEffect(() => {
    setActiveIndex(0);
  }, [productSignature]);

  function updateActiveIndex(offset: number) {
    if (products.length === 0) return;
    const index = Math.round(offset / (cardWidth + PRODUCT_CAROUSEL_GAP));
    setActiveIndex(Math.max(0, Math.min(index, products.length - 1)));
  }

  return (
    <>
      <FlatList
        data={products}
        horizontal
        nestedScrollEnabled={nestedScrollEnabled}
        snapToInterval={cardWidth + PRODUCT_CAROUSEL_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        keyExtractor={(product) => product.id}
        style={[styles.viewport, { marginLeft: -effectiveLeftInset, marginRight: -rightInset }]}
        contentContainerStyle={[styles.list, { paddingLeft: effectiveLeftInset, paddingRight: rightInset }]}
        onMomentumScrollEnd={(event) => updateActiveIndex(event.nativeEvent.contentOffset.x)}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            style={{ width: cardWidth }}
            favorite={favoriteIds?.includes(item.id)}
            onFavoriteChange={(favorite) => onFavoriteChange?.(item, favorite)}
            onAdded={onAdded}
            showAddedModal={showAddedModal}
          />
        )}
      />
      {products.length > 0 && (
        <View accessibilityLabel={`Produto ${Math.min(activeIndex + 1, products.length)} de ${products.length}`} style={styles.pagination}>
          {products.map((product, index) => (
            <View key={product.id} style={[styles.dot, index === activeIndex && styles.activeDot]} />
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  viewport: {},
  list: { gap: PRODUCT_CAROUSEL_GAP },
  pagination: { minHeight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#b9b4ae' },
  activeDot: { width: 18, backgroundColor: '#0a0a0a' },
});

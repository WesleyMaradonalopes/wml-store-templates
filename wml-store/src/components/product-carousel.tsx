import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions } from 'react-native';

import { useAppTheme } from '@/context/theme-context';
import type { Product } from '@/services/catalog';
import { useTheme } from '@/hooks/use-theme';

import { AnimatedPaginationDots } from './animated-pagination-dots';
import { ProductCard } from './product-card';

export const PRODUCT_CAROUSEL_GAP = 16;

export function productCarouselCardWidth(screenWidth: number) {
  return Math.min(300, Math.max(220, Math.round(screenWidth * 0.72)));
}

type ProductCarouselProps = {
  products: Product[];
  variant?: 'default' | 'home';
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
  variant = 'default',
  favoriteIds,
  onFavoriteChange,
  onAdded,
  showAddedModal = true,
  nestedScrollEnabled = false,
  leftInset,
  rightInset = 16,
}: ProductCarouselProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { colorScheme } = useAppTheme();
  const theme = useTheme();
  const dark = colorScheme === 'dark';
  const isHome = variant === 'home';
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = productCarouselCardWidth(screenWidth);
  const effectiveLeftInset = leftInset ?? (isHome ? 0 : rightInset);
  const viewportStyle = isHome
    ? [styles.viewport, styles.homeViewport]
    : [styles.viewport, { marginLeft: -effectiveLeftInset, marginRight: -rightInset }];
  const contentContainerStyle = isHome
    ? [styles.list, styles.homeList]
    : [styles.list, { paddingLeft: effectiveLeftInset, paddingRight: rightInset }];
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
        style={viewportStyle}
        contentContainerStyle={contentContainerStyle}
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
        <AnimatedPaginationDots
          count={products.length}
          activeIndex={activeIndex}
          activeWidth={18}
          activeColor={dark ? theme.text : '#0a0a0a'}
          inactiveColor={dark ? theme.border : '#b9b4ae'}
          accessibilityLabel={`Produto ${Math.min(activeIndex + 1, products.length)} de ${products.length}`}
          style={[styles.pagination, isHome && styles.homePagination]}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  viewport: {},
  list: { gap: PRODUCT_CAROUSEL_GAP },
  homeViewport: { marginLeft: 0, marginRight: 0, backgroundColor: '#fff' },
  homeList: { paddingLeft: 10, paddingRight: 10 },
  homePagination: { paddingTop: 2 },
  pagination: { minHeight: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 2 },
});

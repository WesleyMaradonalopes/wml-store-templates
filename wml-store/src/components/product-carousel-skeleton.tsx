import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { productCarouselCardWidth } from './product-carousel';
import { ProductCardSkeleton } from './product-card-skeleton';

type Props = {
  variant?: 'default' | 'home';
};

export function ProductCarouselSkeleton({ variant = 'default' }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const isHome = variant === 'home';
  const cardWidth = productCarouselCardWidth(screenWidth);

  return (
    <View style={[styles.viewport, isHome && styles.homeViewport]}>
      <View style={[styles.list, isHome ? styles.homeList : styles.defaultList]}>
        <ProductCardSkeleton style={{ width: cardWidth }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    marginLeft: -16,
    marginRight: -16,
    overflow: 'hidden',
  },
  homeViewport: {
    marginLeft: 0,
    marginRight: 0,
  },
  list: {
    flexDirection: 'row',
    gap: 16,
  },
  defaultList: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  homeList: {
    paddingLeft: 10,
    paddingRight: 10,
  },
});

import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ProductCardSkeleton } from './product-card-skeleton';

type Props = {
  variant?: 'default' | 'plp';
};

export function ProductGridSkeleton({ variant = 'default' }: Props) {
  if (variant === 'plp') {
    return (
      <View style={styles.plpGrid}>
        <View style={styles.row}>
          <ProductCardSkeleton style={styles.card} />
          <ProductCardSkeleton style={styles.card} />
        </View>
        <View style={styles.row}>
          <ProductCardSkeleton style={styles.card} />
          <ProductCardSkeleton style={styles.card} />
        </View>
        <View style={styles.row}>
          <ProductCardSkeleton style={styles.featuredCard} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((item) => (
        <ProductCardSkeleton key={item} style={styles.card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  plpGrid: {
    gap: Spacing.three,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  featuredCard: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    width: '48.7%',
  },
});

import { StyleSheet, View } from 'react-native';

import { ProductCardSkeleton } from './product-card-skeleton';

export function ProductGridSkeleton() {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((item) => (
        <ProductCardSkeleton key={item} style={styles.card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '48.7%',
  },
});

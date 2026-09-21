import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { type Product } from '@/services/catalog';

import { ProductCard } from './product-card';

export type ProductGridRow = {
  key: string;
  products: Product[];
  featured: boolean;
};

export function buildProductGridRows(products: Product[]): ProductGridRow[] {
  const rows: ProductGridRow[] = [];

  for (let groupStart = 0; groupStart < products.length; groupStart += 5) {
    const regularProducts = products.slice(groupStart, groupStart + 4);

    for (let rowStart = 0; rowStart < regularProducts.length; rowStart += 2) {
      const rowProducts = regularProducts.slice(rowStart, rowStart + 2);
      rows.push({
        key: `regular-${rowProducts.map((product) => product.id).join('-')}`,
        products: rowProducts,
        featured: false,
      });
    }

    const featuredProduct = products[groupStart + 4];
    if (featuredProduct) {
      rows.push({
        key: `featured-${featuredProduct.id}`,
        products: [featuredProduct],
        featured: true,
      });
    }
  }

  return rows;
}

type ProductGridRowViewProps = {
  row: ProductGridRow;
  favoriteIds?: string[];
  onFavoriteChange?: (product: Product, favorite: boolean) => void;
  onAdded?: (product: Product) => void;
  showAddedModal?: boolean;
};

export function ProductGridRowView({ row, favoriteIds, onFavoriteChange, onAdded, showAddedModal = true }: ProductGridRowViewProps) {
  return (
    <View style={styles.row}>
      {row.products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          style={row.featured ? styles.featuredCard : styles.card}
          favorite={favoriteIds ? favoriteIds.includes(product.id) : undefined}
          onFavoriteChange={(favorite) => onFavoriteChange?.(product, favorite)}
          onAdded={onAdded}
          showAddedModal={showAddedModal}
        />
      ))}
    </View>
  );
}

type ProductPlpGridProps = Omit<ProductGridRowViewProps, 'row'> & {
  products: Product[];
};

export function ProductPlpGrid({ products, ...props }: ProductPlpGridProps) {
  return (
    <View style={styles.grid}>
      {buildProductGridRows(products).map((row) => (
        <ProductGridRowView key={row.key} row={row} {...props} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.three,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    width: '48.7%',
    minWidth: 0,
  },
  featuredCard: {
    width: '100%',
    minWidth: 0,
  },
});

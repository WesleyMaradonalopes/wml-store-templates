import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { usePageTheme } from '@/context/page-theme-context';
import { useTheme } from '@/hooks/use-theme';
import { type Product } from '@/services/catalog';

import SimilarAiIcon from './icons/SimilarAiIcon';
import ShoppingBagIcon from './icons/ShoppingBagIcon';
import { ProductFavoriteButton } from './product-favorite-button';
import { ProductQuickViewButton } from './product-quick-view';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type Props = {
  product: Product;
  style?: StyleProp<ViewStyle>;
  favorite?: boolean;
  onFavoriteChange?: (favorite: boolean) => void;
  onAdded?: (product: Product) => void;
  showAddedModal?: boolean;
  onSimilar?: () => void;
  similarLoading?: boolean;
};

function money(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function discountPercentage(product: Product) {
  if (product.listPrice === null || product.price === null || product.listPrice <= product.price || product.listPrice <= 0) return 0;
  return Math.round((1 - product.price / product.listPrice) * 100);
}

export function ProductCard({ product, style, favorite: controlledFavorite, onFavoriteChange, onAdded, showAddedModal = true, onSimilar, similarLoading = false }: Props) {
  const router = useRouter();
  const pageTheme = usePageTheme();
  const theme = useTheme();
  const dark = pageTheme.isDark;
  const discount = discountPercentage(product);

  return (
    <ThemedView style={[styles.card, style]}>
      <Pressable onPress={() => router.push(`/product/${product.id}`)} style={styles.productLink}>
        <View style={styles.imageArea}>
          {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} style={[styles.image, dark && { backgroundColor: theme.surfaceMuted }]} contentFit="cover" />}
          {(product.isNewProduct || discount > 0) && (
            <View pointerEvents="none" style={styles.badges}>
              {product.isNewProduct && <View style={[styles.badge, styles.newBadge, dark && { backgroundColor: theme.primary }]}><ThemedText style={[styles.badgeText, dark && { color: theme.onPrimary }]}>Novo</ThemedText></View>}
              {discount > 0 && <View style={[styles.badge, styles.discountBadge]}><ThemedText style={styles.badgeText}>{discount}%</ThemedText></View>}
            </View>
          )}
          <ProductFavoriteButton
            product={product}
            favorite={controlledFavorite}
            onFavoriteChange={onFavoriteChange}
            buttonStyle={styles.favoriteButton}
          />
          {onSimilar && (
            <Pressable
              accessibilityLabel="Ver produtos similares"
              disabled={similarLoading}
              onPress={(event) => { event.stopPropagation(); onSimilar(); }}
              style={[styles.similarButton, dark && { backgroundColor: theme.background, borderColor: theme.border }, similarLoading && styles.disabledButton]}>
              <SimilarAiIcon color={dark ? theme.text : '#0a0a0a'} size={21} />
            </Pressable>
          )}
          <ProductQuickViewButton
            product={product}
            icon={<ShoppingBagIcon size={20} color={dark ? theme.text : '#0a0a0a'} />}
            accessibilityLabel="Adicionar à sacola"
            disabled={!product.itemId}
            buttonStyle={[styles.addButton, dark && { backgroundColor: theme.background, borderColor: theme.border }]}
            onAdded={() => onAdded?.(product)}
            showAddedModal={showAddedModal}
          />
        </View>
        <ThemedText numberOfLines={2} style={styles.name}>{product.name}</ThemedText>
        <View style={styles.priceArea}>
          {product.listPrice !== null && product.price !== null && product.listPrice > product.price && (
            <ThemedText style={styles.listPrice}>{money(product.listPrice)}</ThemedText>
          )}
          {product.price !== null && <ThemedText type="smallBold" style={styles.price}>{money(product.price)}</ThemedText>}
        </View>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 0, gap: Spacing.two, backgroundColor: 'transparent' },
  productLink: { gap: 5 },
  imageArea: { position: 'relative', width: '100%' },
  image: { width: '100%', aspectRatio: 0.76, borderRadius: 8, backgroundColor: '#e8e8ea' },
  badges: { position: 'absolute', left: 5, top: 5, zIndex: 10, alignItems: 'flex-start', gap: 4 },
  badge: { minHeight: 20, paddingHorizontal: 5, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  newBadge: { backgroundColor: '#0a0a0a' },
  discountBadge: { backgroundColor: '#cf242c' },
  badgeText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16 },
  favoriteButton: { position: 'absolute', right: 5, top: 5, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  similarButton: { position: 'absolute', right: 8, bottom: 52, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#c9c5c0' },
  name: { minHeight: 38, fontSize: 13, lineHeight: 18 },
  priceArea: { minHeight: 22, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  listPrice: { color: '#8a857f', fontSize: 11, textDecorationLine: 'line-through' },
  price: { fontSize: 14 },
  addButton: { position: 'absolute', right: 8, bottom: 8, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#c9c5c0' },
  disabledButton: { opacity: 0.5 },
});

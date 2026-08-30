import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { type Product } from '@/services/catalog';
import { canSaveFavorites, getKnownFavoriteAuthState, isFavorite, toggleFavorite } from '@/services/favorites';

import HeartIcon from './icons/HeartIcon';
import ShoppingBagIcon from './icons/ShoppingBagIcon';
import { LoginRequiredModal } from './login-required-modal';
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
};

function money(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function ProductCard({ product, style, favorite: controlledFavorite, onFavoriteChange, onAdded, showAddedModal = true }: Props) {
  const router = useRouter();
  const [localFavorite, setLocalFavorite] = useState(Boolean(controlledFavorite));
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const favorite = controlledFavorite ?? localFavorite;

  useEffect(() => {
    if (controlledFavorite !== undefined) {
      setLocalFavorite(controlledFavorite);
      return;
    }
    let active = true;
    isFavorite(product.id).then((value) => { if (active) setLocalFavorite(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [controlledFavorite, product.id]);

  function updateFavorite(value: boolean, notify = true) {
    setLocalFavorite(value);
    if (notify) onFavoriteChange?.(value);
  }

  async function changeFavorite() {
    if (favoriteLoading) return;
    const previous = favorite;
    const authState = getKnownFavoriteAuthState();
    if (authState === 'anonymous') {
      setLoginModalVisible(true);
      return;
    }

    const nextFavorite = !previous;
    if (authState === 'authenticated') updateFavorite(nextFavorite);
    setFavoriteLoading(true);
    try {
      if (authState !== 'authenticated') {
        if (!(await canSaveFavorites())) {
          setLoginModalVisible(true);
          return;
        }
        updateFavorite(nextFavorite);
      }
      const result = await toggleFavorite(product, { hydrate: false });
      updateFavorite(result.favorite);
    } catch (error) {
      updateFavorite(previous);
      Alert.alert('Favoritos', error instanceof Error ? error.message : 'Não foi possível atualizar os favoritos.');
    } finally {
      setFavoriteLoading(false);
    }
  }

  return (
    <ThemedView style={[styles.card, style]}>
      <Pressable onPress={() => router.push(`/product/${product.id}`)} style={styles.productLink}>
        <View style={styles.imageArea}>
          {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" />}
          <Pressable
            accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            accessibilityState={{ selected: favorite }}
            disabled={favoriteLoading}
            onPress={(event) => { event.stopPropagation(); void changeFavorite(); }}
            style={styles.favoriteButton}>
            <HeartIcon size={28} color={favorite ? '#C62828' : '#514c47'} filled={favorite} />
          </Pressable>
          <ProductQuickViewButton
            product={product}
            icon={<ShoppingBagIcon size={20} color="#000000" />}
            accessibilityLabel="Adicionar à sacola"
            disabled={!product.itemId}
            buttonStyle={styles.addButton}
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
      <LoginRequiredModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        onLogin={() => {
          setLoginModalVisible(false);
          router.push('/account?view=access' as never);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 0, gap: Spacing.two, backgroundColor: 'transparent' },
  productLink: { gap: 5 },
  imageArea: { position: 'relative', width: '100%' },
  image: { width: '100%', aspectRatio: 0.76, borderRadius: 12, backgroundColor: '#e8e8ea' },
  favoriteButton: { position: 'absolute', right: 5, top: 5, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  name: { minHeight: 38, fontSize: 13, lineHeight: 18 },
  priceArea: { minHeight: 22, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  listPrice: { color: '#8a857f', fontSize: 11, textDecorationLine: 'line-through' },
  price: { fontSize: 14 },
  addButton: { position: 'absolute', right: 8, bottom: 8, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#c9c5c0' },
});

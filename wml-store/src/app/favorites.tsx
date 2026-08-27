import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductShelf } from '@/components/cms-section';
import { ProductCard } from '@/components/product-card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RECENT_PRODUCTS_SHELF } from '@/constants/product-shelves';
import { Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { type Product } from '@/services/catalog';
import { getCachedFavorites, getFavorites } from '@/services/favorites';

const EMPTY_FAVORITES_SHELF: Record<string, unknown> = {
  ...RECENT_PRODUCTS_SHELF,
  title: 'Você pode gostar',
};

export default function FavoritesScreen() {
  const router = useRouter();
  const onScroll = useTabBarScroll();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoadingFavorites(true);

    // Mostra o último estado confirmado sem esperar a rede. A consulta remota
    // abaixo continua sendo a fonte de verdade e atualiza a lista quando
    // terminar, mantendo a sincronização com o site.
    getCachedFavorites().then((items) => {
      if (active && items.length > 0) {
        setFavorites(items);
        setLoadingFavorites(false);
      }
    }).catch(() => undefined);

    getFavorites()
      .then((items) => { if (active) setFavorites(items); })
      .catch(() => { if (active) setFavorites([]); })
      .finally(() => { if (active) setLoadingFavorites(false); });
    return () => { active = false; };
  }, []));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader back={false} title="Meus favoritos" titleAlign="left" showSearch={false} />
        {loadingFavorites && <ActivityIndicator color="#0a0a0a" />}
        <FlatList
          data={favorites}
          numColumns={2}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
          ListHeaderComponent={favorites.length > 0 ? (
            <View style={styles.productsHeader}>
              <ThemedText style={styles.productsCount}>({favorites.length})</ThemedText>
              <ThemedText style={styles.productsTitle}>Produtos</ThemedText>
            </View>
          ) : null}
          ListEmptyComponent={!loadingFavorites ? (
            <View style={styles.emptyState}>
              <ThemedText themeColor="textSecondary" style={styles.emptyMessage}>Você ainda não favoritou produtos.</ThemedText>
              <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.homeButton}>
                <ThemedText style={styles.homeButtonText}>Ir para Home</ThemedText>
              </Pressable>
              <ProductShelf data={EMPTY_FAVORITES_SHELF} titleStyle={styles.emptyShelfTitle} />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              style={styles.card}
              favorite
              onFavoriteChange={(favorite) => setFavorites((current) => favorite
                ? (current.some((product) => product.id === item.id) ? current : [item, ...current])
                : current.filter((product) => product.id !== item.id))}
            />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.three },
  productsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  productsCount: { fontSize: 14, color: '#8f8f8f' },
  productsTitle: { fontSize: 14 },
  list: { paddingBottom: 120, gap: Spacing.three },
  columns: { gap: Spacing.two },
  card: { width: '48.7%' },
  emptyState: { gap: Spacing.three, paddingVertical: Spacing.two },
  emptyMessage: { fontSize: 14 },
  emptyShelfTitle: { fontSize: 16, lineHeight: 22 },
  homeButton: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  homeButtonText: { color: '#FFFFFF', fontWeight: '700' },
});

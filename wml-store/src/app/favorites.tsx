import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/product-card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { type Product } from '@/services/catalog';
import { getCachedFavorites, getFavorites } from '@/services/favorites';

export default function FavoritesScreen() {
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
        <ScreenHeader showSearch={false} />
        <ThemedText type="subtitle">Favoritos</ThemedText>
        {loadingFavorites && <ActivityIndicator color="#000000" />}
        {!loadingFavorites && favorites.length === 0 && <ThemedText themeColor="textSecondary">Você ainda não salvou produtos.</ThemedText>}
        <FlatList
          data={favorites}
          numColumns={2}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
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
  list: { paddingBottom: 120, gap: Spacing.three },
  columns: { gap: Spacing.two },
  card: { width: '48.7%' },
});

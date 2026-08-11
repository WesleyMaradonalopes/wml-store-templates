import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getStores, Store } from '@/services/stores';
import { ScreenHeader } from '@/components/screen-header';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';

export default function StoresScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onScroll = useTabBarScroll();

  useEffect(() => {
    getStores()
      .then(setStores)
      .catch(() => setError('Não foi possível carregar as lojas agora.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader back={false} /><ThemedText type="subtitle">Nossas lojas</ThemedText>
        {loading && <ActivityIndicator color="#000000" style={styles.loader} />}
        {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}
        {!loading && !error && stores.length === 0 && (
          <ThemedText themeColor="textSecondary">Nenhuma loja encontrada.</ThemedText>
        )}
        <FlatList
          data={stores}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyExtractor={(store) => store.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ThemedView style={styles.card}>
              <ThemedText type="smallBold">{item.name || 'Loja LojaBL'}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {[item.address, item.city, item.state].filter(Boolean).join(', ')}
              </ThemedText>
              {!!item.phone && <ThemedText themeColor="textSecondary">{item.phone}</ThemedText>}
            </ThemedView>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  loader: { marginTop: Spacing.four },
  list: { gap: Spacing.three, paddingVertical: Spacing.three },
  card: { gap: Spacing.one, padding: Spacing.four, borderRadius: Spacing.three },
});

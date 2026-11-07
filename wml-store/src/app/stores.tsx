import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StoreLocator } from '@/components/store-locator';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ScreenHeader } from '@/components/screen-header';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { getStoreLocator, type Store } from '@/services/stores';

export default function StoresScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [title, setTitle] = useState('Nossas lojas');
  const [subtitle, setSubtitle] = useState('Encontre a loja Hope Resort mais próxima de você.');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onScroll = useTabBarScroll();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getStoreLocator({
      onRefresh: (refreshedData) => {
        if (active) {
          setStores(refreshedData.stores);
          if (refreshedData.title) setTitle(refreshedData.title);
          if (refreshedData.subtitle) setSubtitle(refreshedData.subtitle);
        }
      },
    })
      .then((nextData) => {
        if (active) {
          setStores(nextData.stores);
          if (nextData.title) setTitle(nextData.title);
          if (nextData.subtitle) setSubtitle(nextData.subtitle);
        }
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar as lojas agora.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function retry() {
    setLoading(true);
    setError(null);
    getStoreLocator()
      .then((nextData) => {
        setStores(nextData.stores);
        if (nextData.title) setTitle(nextData.title);
        if (nextData.subtitle) setSubtitle(nextData.subtitle);
      })
      .catch(() => setError('Não foi possível carregar as lojas agora.'))
      .finally(() => setLoading(false));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Nossas lojas" showSearch={false} showCart={false} variant="checkout" />
        {loading && !stores.length && <ActivityIndicator color="#0a0a0a" style={styles.loader} />}
        {error ? (
          <ThemedView style={styles.errorState}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable onPress={retry} style={styles.retryButton}>
              <ThemedText style={styles.retryText}>Tentar novamente</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <StoreLocator stores={stores} title={title} subtitle={subtitle} onScroll={onScroll} />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  loader: { marginTop: Spacing.four },
  errorState: { gap: Spacing.three, paddingVertical: Spacing.five, alignItems: 'center' },
  errorText: { color: '#ed6560', textAlign: 'center' },
  retryButton: { minHeight: 42, paddingHorizontal: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  retryText: { color: '#ffffff', fontWeight: '700' },
});

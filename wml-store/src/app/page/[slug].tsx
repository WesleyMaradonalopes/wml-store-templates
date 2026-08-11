import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CmsSectionView } from '@/components/cms-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CmsPage, getCmsPage } from '@/services/cms';
import { ScreenHeader } from '@/components/screen-header';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';

export default function CmsPageScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const onScroll = useTabBarScroll();

  useEffect(() => {
    if (!slug) return;
    getCmsPage('landingPage', slug)
      .then(setPage)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader />
        <Pressable onPress={() => router.back()} style={styles.hiddenBack}>
          <ThemedText type="link">← Voltar</ThemedText>
        </Pressable>
        <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">{page?.name ?? slug}</ThemedText>
          {loading && <ActivityIndicator color="#000000" />}
          {error && <ThemedText themeColor="textSecondary">Não foi possível carregar esta página.</ThemedText>}
          {!loading && !error && page?.sections.length === 0 && (
            <ThemedText themeColor="textSecondary">Nenhuma seção publicada nesta página.</ThemedText>
          )}
          {page?.sections.map((section, index) => (
            <CmsSectionView key={`${section.name}-${index}`} section={section} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  content: { gap: Spacing.three, paddingVertical: Spacing.three },
  hiddenBack: { display: 'none' },
});

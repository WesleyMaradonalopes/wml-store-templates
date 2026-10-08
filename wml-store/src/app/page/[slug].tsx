import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CmsSectionView } from '@/components/cms-section';
import ArrowLeftIAIcon from '@/components/icons/ArrowLeftIAicon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { PageThemeProvider, usePageTheme } from '@/context/page-theme-context';
import { CmsPage, getCmsPage } from '@/services/cms';
import { resolvePageTheme, resolvePageThemeColors } from '@/services/cms-page-theme';
import { ScreenHeader } from '@/components/screen-header';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';

export default function CmsPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isCategoryPage = typeof slug === 'string' && /^categ-/i.test(slug);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    getCmsPage('landingPage', slug, {
      onRefresh: (nextPage) => {
        if (active) setPage(nextPage);
      },
    })
      .then((nextPage) => { if (active) setPage(nextPage); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
    };
  }, [slug]);

  const pageTheme = resolvePageTheme(page);
  const customColors = resolvePageThemeColors(page);

  return (
    <PageThemeProvider theme={pageTheme} customColors={customColors}>
      <CmsPageContent page={page} slug={slug} loading={loading} error={error} isCategoryPage={isCategoryPage} />
    </PageThemeProvider>
  );
}

function CmsPageContent({ page, slug, loading, error, isCategoryPage }: { page: CmsPage | null; slug?: string; loading: boolean; error: boolean; isCategoryPage: boolean }) {
  const router = useRouter();
  const pageTheme = usePageTheme();
  const theme = pageTheme.palette;
  const onScroll = useTabBarScroll();

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader back={!isCategoryPage} />
        <Pressable onPress={() => router.back()} style={styles.hiddenBack}>
          <ArrowLeftIAIcon color={theme.text} size={16} />
          <ThemedText type="link">Voltar</ThemedText>
        </Pressable>
        <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
          {!isCategoryPage && <ThemedText type="subtitle">{page?.name ?? slug}</ThemedText>}
          {loading && <ActivityIndicator color={theme.text} />}
          {error && <ThemedText style={styles.errorText}>Não foi possível carregar esta página.</ThemedText>}
          {!loading && !error && page?.sections.length === 0 && (
            <ThemedText themeColor="textSecondary">Nenhuma seção publicada nesta página.</ThemedText>
          )}
          {page?.sections.map((section, index) => (
            <CmsSectionView key={`${section.name}-${index}`} section={section} categoryPageSlug={isCategoryPage ? slug : undefined} />
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
  errorText: { color: '#ed6560' },
});

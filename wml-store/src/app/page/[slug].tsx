import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CmsSectionView } from '@/components/cms-section';
import {
  CategoryBackground,
  CategoryBackgroundPanel,
  getCategoryBackgroundConfig,
  type CategoryBackgroundConfig,
} from '@/components/category-background';
import ArrowLeftIAIcon from '@/components/icons/ArrowLeftIAicon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PageThemeProvider, usePageTheme } from '@/context/page-theme-context';
import { CmsPage, getCmsPage } from '@/services/cms';
import { resolvePageTheme, resolvePageThemeColors } from '@/services/cms-page-theme';
import { ScreenHeader } from '@/components/screen-header';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { LinearGradient } from 'expo-linear-gradient';

export default function CmsPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [categoriesPage, setCategoriesPage] = useState<CmsPage | null>(null);
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

    if (/^categ-/i.test(slug)) {
      getCmsPage('categories', 'categorias', {
        onRefresh: (nextPage) => {
          if (active) setCategoriesPage(nextPage);
        },
      })
        .then((nextPage) => { if (active) setCategoriesPage(nextPage); })
        .catch(() => undefined);
    }

    return () => {
      active = false;
    };
  }, [slug]);

  const pageTheme = resolvePageTheme(page);
  const customColors = resolvePageThemeColors(page);
  const categoryBackground = getCategoryBackgroundConfig(page, isCategoryPage ? categoriesPage : undefined);

  return (
    <PageThemeProvider theme={pageTheme} customColors={customColors}>
      <CmsPageContent
        page={page}
        slug={slug}
        loading={loading}
        error={error}
        isCategoryPage={isCategoryPage}
        categoryBackground={categoryBackground}
      />
    </PageThemeProvider>
  );
}

function isCategoryGroupSection(section: CmsPage['sections'][number]) {
  if (section.name !== 'CategoryAccordeon' && section.name !== 'CategoryTree') return false;

  const data = section.data ?? {};
  const directItems = Array.isArray(data.content) ? data.content : [];
  const shelves = Array.isArray(data.shelves) ? data.shelves : [];
  const items = directItems.length > 0
    ? directItems
    : shelves.flatMap((shelf) => {
        if (!shelf || typeof shelf !== 'object' || Array.isArray(shelf)) return [];
        const content = (shelf as Record<string, unknown>).content;
        return Array.isArray(content) ? content : [];
      });
  const categories = items.filter((item): item is Record<string, unknown> => (
    Boolean(item && typeof item === 'object' && !Array.isArray(item))
  ));
  const hasSubcategories = categories.some((category) => (
    Array.isArray(category.subcategories) && category.subcategories.length > 0
  ));

  return categories.length > 0 && (section.name === 'CategoryAccordeon' || hasSubcategories);
}

function CmsPageContent({ page, slug, loading, error, isCategoryPage, categoryBackground }: { page: CmsPage | null; slug?: string; loading: boolean; error: boolean; isCategoryPage: boolean; categoryBackground: CategoryBackgroundConfig }) {
  const router = useRouter();
  const pageTheme = usePageTheme();
  const theme = pageTheme.palette;
  const onScroll = useTabBarScroll();
  const backgroundColors = isCategoryPage && !pageTheme.isDark
    ? categoryBackground.surfaceColors
    : [theme.background, theme.background, theme.background] as const;

  return (
    <LinearGradient
      colors={backgroundColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>
      {isCategoryPage ? (
        <CategoryBackground config={categoryBackground} style={styles.backgroundRoot}>
          <SafeAreaView style={styles.safeArea}>
            <ScreenHeader back={false} />
            <CategoryPageContent
              page={page}
              slug={slug}
              loading={loading}
              error={error}
              onScroll={onScroll}
              router={router}
              theme={theme}
              categoryBackground={categoryBackground}
            />
          </SafeAreaView>
        </CategoryBackground>
      ) : (
        <SafeAreaView style={styles.safeArea}>
          <ScreenHeader back />
          <CategoryPageContent
            page={page}
            slug={slug}
            loading={loading}
            error={error}
            onScroll={onScroll}
            router={router}
            theme={theme}
            categoryBackground={categoryBackground}
          />
        </SafeAreaView>
      )}
    </LinearGradient>
  );
}

function CategoryPageContent({ page, slug, loading, error, onScroll, router, theme, categoryBackground }: {
  page: CmsPage | null;
  slug?: string;
  loading: boolean;
  error: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  router: ReturnType<typeof useRouter>;
  theme: ReturnType<typeof usePageTheme>['palette'];
  categoryBackground: CategoryBackgroundConfig;
}) {
  const isCategoryPage = typeof slug === 'string' && /^categ-/i.test(slug);
  const firstCategoryGroupIndex = isCategoryPage
    ? page?.sections.findIndex(isCategoryGroupSection) ?? -1
    : -1;

  return (
    <CategoryBackgroundPanel style={styles.pagePanel}>
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
          <CmsSectionView
            key={`${section.name}-${index}`}
            section={section}
            categoryPageSlug={isCategoryPage ? slug : undefined}
            categoryBackground={categoryBackground}
            showCategoryParentHeader={!isCategoryPage || index === firstCategoryGroupIndex}
          />
        ))}
      </ScrollView>
    </CategoryBackgroundPanel>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundRoot: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  pagePanel: { flex: 1 },
  content: { gap: Spacing.three, paddingVertical: Spacing.three },
  hiddenBack: { display: 'none' },
  errorText: { color: '#ed6560' },
});

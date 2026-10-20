import { CmsSectionView } from '@/components/cms-section';
import {
  CategoryBackground,
  CategoryBackgroundPanel,
  getCategoryBackgroundConfig,
  type CategoryBackgroundConfig,
} from '@/components/category-background';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PageThemeProvider, usePageTheme } from '@/context/page-theme-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { useTheme } from '@/hooks/use-theme';
import { CmsPage, getCmsPage } from '@/services/cms';
import { resolvePageTheme, resolvePageThemeColors } from '@/services/cms-page-theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CategoriesScreen() {
  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getCmsPage('categories', 'categorias', {
      onRefresh: (page) => {
        if (active) setCmsPage(page);
      },
    })
      .then((page) => { if (active) setCmsPage(page); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
    };
  }, []);

  const pageTheme = resolvePageTheme(cmsPage);
  const customColors = resolvePageThemeColors(cmsPage);
  const categoryBackground = getCategoryBackgroundConfig(cmsPage);

  return (
    <PageThemeProvider theme={pageTheme} customColors={customColors}>
      <CategoriesScreenContent
        cmsPage={cmsPage}
        loading={loading}
        error={error}
        categoryBackground={categoryBackground}
      />
    </PageThemeProvider>
  );
}

function CategoriesScreenContent({
  cmsPage,
  loading,
  error,
  categoryBackground,
}: {
  cmsPage: CmsPage | null;
  loading: boolean;
  error: boolean;
  categoryBackground: CategoryBackgroundConfig;
}) {
  const onScroll = useTabBarScroll();
  const pageTheme = usePageTheme();
  const theme = useTheme();
  const dark = pageTheme.isDark;

  return (
    <LinearGradient
      colors={dark
        ? [theme.background, theme.background, theme.background]
        : categoryBackground.surfaceColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, styles.gradientFill]}>
      <CategoryBackground config={categoryBackground} style={styles.backgroundRoot}>
        <View style={styles.backgroundOverlay}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerSurface}>
              <ScreenHeader back={false} />
            </View>
            <CategoryBackgroundPanel style={[styles.glassPanel, dark && { borderColor: theme.border }]}>
              <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
                {loading && <ThemedText themeColor="textSecondary">Carregando categorias...</ThemedText>}
                {error && <ThemedText style={styles.errorText}>Nao foi possivel carregar as categorias.</ThemedText>}
                {!loading && !error && cmsPage?.sections.length === 0 && (
                  <ThemedText themeColor="textSecondary">Nenhuma secao publicada foi encontrada.</ThemedText>
                )}
                {cmsPage?.sections.map((section, index) => (
                  <CmsSectionView
                    key={`${section.name}-${index}`}
                    section={section}
                    isCategoryScreen
                    categoryBackground={categoryBackground}
                  />
                ))}
              </ScrollView>
            </CategoryBackgroundPanel>
          </SafeAreaView>
        </View>
      </CategoryBackground>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  backgroundRoot: { flex: 1 },
  backgroundOverlay: { flex: 1, backgroundColor: 'rgba(235, 235, 235, 0)' },
  safeArea: { flex: 1, paddingHorizontal: 0, paddingVertical: 0 },
  headerSurface: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: 'transparent' },
  glassPanel: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 0,
    borderWidth: 0,
    marginTop: 10,
    marginHorizontal: 0,
    backgroundColor: 'transparent',
  },
  gradientFill: { flex: 1 },
  content: { gap: Spacing.three, paddingTop: 0, paddingHorizontal: 0, paddingBottom: 100 },
  errorText: { color: '#ed6560' },
});

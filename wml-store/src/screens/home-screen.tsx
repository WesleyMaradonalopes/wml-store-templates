import { CartIconButton } from '@/components/cart-icon-button';
import { AssistantHeaderButton } from '@/components/assistant-header-button';
import { CmsSectionView } from '@/components/cms-section';
import { HomeSkeleton } from '@/components/home-skeleton';
import HopeLogoIcon from '@/components/icons/HopeLogoIcon';
import SearchIcon from '@/components/icons/SearchIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { PageThemeProvider, usePageTheme } from '@/context/page-theme-context';
import { TabBarContext } from '@/context/tab-bar-context';
import { useTheme } from '@/hooks/use-theme';
import { CmsPage, getCmsPage } from '@/services/cms';
import { resolvePageTheme, resolvePageThemeColors } from '@/services/cms-page-theme';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [cmsError, setCmsError] = useState(false);

  useEffect(() => {
    let active = true;
    getCmsPage('home', 'home', {
      onRefresh: (page) => {
        if (active) setCmsPage(page);
      },
    })
      .then((page) => { if (active) setCmsPage(page); })
      .catch(() => { if (active) setCmsError(true); })
      .finally(() => { if (active) setCmsLoading(false); });

    return () => {
      active = false;
    };
  }, []);

  const pageTheme = resolvePageTheme(cmsPage);
  const customColors = resolvePageThemeColors(cmsPage);

  return (
    <PageThemeProvider theme={pageTheme} customColors={customColors}>
      <HomeScreenContent cmsPage={cmsPage} cmsLoading={cmsLoading} cmsError={cmsError} />
    </PageThemeProvider>
  );
}

function HomeScreenContent({ cmsPage, cmsLoading, cmsError }: { cmsPage: CmsPage | null; cmsLoading: boolean; cmsError: boolean }) {
  const router = useRouter();
  const { setHidden } = useContext(TabBarContext);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const pageTheme = usePageTheme();
  const theme = useTheme();
  const dark = pageTheme.isDark;
  const [scrollY, setScrollY] = useState(0);
  const firstSection = cmsPage?.sections[0];
  const firstSectionMode = typeof firstSection?.data?.mode === 'string' ? firstSection.data.mode : '';
  const firstSectionIsHero = firstSection?.name === 'MultipleImageBanner' && firstSectionMode === 'SliderHero';
  const transparentHeader = firstSectionIsHero && scrollY <= 8;
  const isBlackTheme = pageTheme.name === 'black';

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[firstSectionIsHero ? styles.heroContent : styles.content, { backgroundColor: theme.background }]}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const currentY = event.nativeEvent.contentOffset.y;
            setScrollY(currentY);
            if (currentY <= 8) setHidden(false);
            else if (currentY > lastScrollY.current + 4) setHidden(true);
            else if (currentY < lastScrollY.current - 4) setHidden(false);
            lastScrollY.current = currentY;
          }}>
          {cmsLoading && !cmsPage && <HomeSkeleton />}
          {cmsError && <ThemedText style={styles.errorText}>Nao foi possivel consultar o CMS agora.</ThemedText>}
          {!cmsLoading && !cmsError && cmsPage?.sections.length === 0 && <ThemedText themeColor="textSecondary">Nenhuma secao publicada foi encontrada.</ThemedText>}
          {cmsPage?.sections.map((section, index) => <CmsSectionView key={`${section.name}-${index}`} section={section} isHome />)}
        </ScrollView>
        <View style={[styles.header, { paddingTop: insets.top, minHeight: 48 + insets.top }, transparentHeader ? styles.heroHeader : [styles.scrolledHeader, dark && { backgroundColor: theme.background, borderBottomColor: theme.border }], isBlackTheme && styles.blackHeader]}>
          <Pressable accessibilityLabel="Voltar ao topo" onPress={() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); setHidden(false); }} style={styles.brandButton}>
            <HopeLogoIcon color={theme.text} width={76} height={20} />
          </Pressable>
          <View style={styles.headerActions}>
            <AssistantHeaderButton color='#ffffff' size={22} style={[styles.headerAction, dark && !transparentHeader && { backgroundColor: theme.background }, transparentHeader && (dark ? styles.blackHeroHeaderAction : styles.heroHeaderAction)]} />
            <Pressable onPress={() => router.push('/search')} style={[styles.headerAction, dark && !transparentHeader && { backgroundColor: theme.background }, transparentHeader && (dark ? styles.blackHeroHeaderAction : styles.heroHeaderAction)]}><SearchIcon size={20} color={theme.text} /></Pressable>
            <CartIconButton color={theme.text} style={[styles.headerAction, transparentHeader && (dark ? styles.blackHeroHeaderAction : styles.heroHeaderAction)]} />
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1, position: 'relative' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 20, elevation: 0 },
  heroHeader: { backgroundColor: 'transparent' },
  blackHeader: { backgroundColor: '#0a0a0a' },
  scrolledHeader: { borderBottomWidth: 1, borderBottomColor: '#ece8e2', backgroundColor: '#ffffff' },
  brandButton: { minWidth: 90, minHeight: 38, justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '700' }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  headerAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#ffffff' },
  heroHeaderAction: { backgroundColor: 'rgba(255, 255, 255, 0.62)' },
  blackHeroHeaderAction: { backgroundColor: 'rgba(0, 0, 0, 0.42)' },
  content: { gap: Spacing.three, paddingVertical: Spacing.five },
  errorText: { color: '#ed6560' },
  heroContent: { gap: Spacing.three, paddingBottom: Spacing.five },
});

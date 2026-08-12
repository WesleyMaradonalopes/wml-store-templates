import { CartIconButton } from '@/components/cart-icon-button';
import { CmsSectionView } from '@/components/cms-section';
import HopeLogoIcon from '@/components/icons/HopeLogoIcon';
import SearchIcon from '@/components/icons/SearchIcon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TabBarContext } from '@/context/tab-bar-context';
import { CmsPage, getCmsPage } from '@/services/cms';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [cmsError, setCmsError] = useState(false);
  const { setHidden } = useContext(TabBarContext);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [scrollY, setScrollY] = useState(0);
  const firstSection = cmsPage?.sections[0];
  const firstSectionMode = typeof firstSection?.data?.mode === 'string' ? firstSection.data.mode : '';
  const firstSectionIsHero = firstSection?.name === 'MultipleImageBanner' && (firstSectionMode === 'SliderHero' || firstSectionMode === 'FitOnScreen');
  const transparentHeader = firstSectionIsHero && scrollY <= 8;
  useEffect(() => {
    getCmsPage().then(setCmsPage).catch(() => setCmsError(true)).finally(() => setCmsLoading(false));
  }, []);
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={firstSectionIsHero ? styles.heroContent : styles.content}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const currentY = event.nativeEvent.contentOffset.y;
            setScrollY(currentY);
            if (currentY <= 8) setHidden(false);
            else if (currentY > lastScrollY.current + 4) setHidden(true);
            else if (currentY < lastScrollY.current - 4) setHidden(false);
            lastScrollY.current = currentY;
          }}>
          {cmsLoading && <ThemedText themeColor="textSecondary">Carregando conteudo da loja...</ThemedText>}
          {cmsError && <ThemedText themeColor="textSecondary">Nao foi possivel consultar o CMS agora.</ThemedText>}
          {!cmsLoading && !cmsError && cmsPage?.sections.length === 0 && <ThemedText themeColor="textSecondary">Nenhuma secao publicada foi encontrada.</ThemedText>}
          {cmsPage?.sections.map((section, index) => <CmsSectionView key={`${section.name}-${index}`} section={section} />)}
        </ScrollView>
        <View style={[styles.header, { paddingTop: insets.top, minHeight: 48 + insets.top }, transparentHeader ? styles.heroHeader : styles.scrolledHeader]}>
          <Pressable accessibilityLabel="Voltar ao topo" onPress={() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); setHidden(false); }} style={styles.brandButton}>
            <HopeLogoIcon color="#231f20" width={76} height={20} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/search')} style={[styles.headerAction, transparentHeader && styles.heroHeaderAction]}><SearchIcon size={20} color="#231f20" /></Pressable>
            <CartIconButton style={[styles.headerAction, transparentHeader && styles.heroHeaderAction]} />
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
  scrolledHeader: { borderBottomWidth: 1, borderBottomColor: '#ece8e2', backgroundColor: '#fbfaf7' },
  brandButton: { minWidth: 90, minHeight: 38, justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '700' }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  headerAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#ffffff' },
  heroHeaderAction: { backgroundColor: 'rgba(255, 255, 255, 0.62)' },
  content: { gap: Spacing.three, paddingVertical: Spacing.five },
  heroContent: { gap: Spacing.three, paddingBottom: Spacing.five },
});

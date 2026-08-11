import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import { CmsSectionView } from '@/components/cms-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CmsPage, getCmsPage } from '@/services/cms';
import { TabBarContext } from '@/context/tab-bar-context';
import { CartIconButton } from '@/components/cart-icon-button';
import SearchIcon from '@/components/icons/SearchIcon';
import HopeLogoIcon from '@/components/icons/HopeLogoIcon';

export default function HomeScreen() {
  const router = useRouter();
  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [cmsError, setCmsError] = useState(false);
  const { setHidden } = useContext(TabBarContext);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    getCmsPage().then(setCmsPage).catch(() => setCmsError(true)).finally(() => setCmsLoading(false));
  }, []);
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Voltar ao topo" onPress={() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); setHidden(false); }}>
            <HopeLogoIcon color="#231f20" width={76} height={20} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/search')} style={styles.headerAction}><SearchIcon size={20} color="#231f20" /></Pressable>
            <CartIconButton style={styles.headerAction} />
          </View>
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const currentY = event.nativeEvent.contentOffset.y;
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
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 },
  header: { minHeight: 48, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 22, fontWeight: '700' }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  headerAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: '#ffffff' },
  content: { gap: Spacing.three, paddingVertical: Spacing.five },
});

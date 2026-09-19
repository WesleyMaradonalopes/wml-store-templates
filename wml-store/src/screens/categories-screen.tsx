import { CmsSectionView } from '@/components/cms-section';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { CmsPage, getCmsPage } from '@/services/cms';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CategoriesScreen() {
  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const onScroll = useTabBarScroll();
  useEffect(() => { getCmsPage('categories', 'categorias').then(setCmsPage).catch(() => setError(true)).finally(() => setLoading(false)); }, []);
  return (
    <ImageBackground
      source={require('../../assets/images/categories-clothing-background.png')}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
      style={styles.container}>
      <View style={styles.backgroundOverlay}>
        <SafeAreaView style={styles.safeArea}>
          <ScreenHeader back={false} />
          <BlurView intensity={24} tint="light" style={styles.glassPanel}>
            <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
              {loading && <ThemedText themeColor="textSecondary">Carregando categorias...</ThemedText>}
              {error && <ThemedText themeColor="textSecondary">Nao foi possivel carregar as categorias.</ThemedText>}
              {!loading && !error && cmsPage?.sections.length === 0 && <ThemedText themeColor="textSecondary">Nenhuma secao publicada foi encontrada.</ThemedText>}
              {cmsPage?.sections.map((section, index) => <CmsSectionView key={`${section.name}-${index}`} section={section} />)}
            </ScrollView>
          </BlurView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  backgroundImage: { opacity: 0.45 },
  backgroundOverlay: { flex: 1, backgroundColor: 'rgba(235, 235, 235, 0.5)' },
  safeArea: { flex: 1, paddingHorizontal: 20, paddingVertical: 0 },
  glassPanel: { flex: 1, overflow: 'hidden', borderRadius: 16, borderWidth: 1, marginHorizontal: 0, borderColor: 'rgba(255, 255, 255, 0.5)', backgroundColor: 'rgba(255, 255, 255, 0.65)', boxShadow: '0px 0px 10px 1px rgba(0, 0, 0, 0.1)' },
  content: { gap: Spacing.three, paddingTop: 16, paddingBottom: 100 },
});

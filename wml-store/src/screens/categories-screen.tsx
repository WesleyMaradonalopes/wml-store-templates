import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { CmsSectionView } from '@/components/cms-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CmsPage, getCmsPage } from '@/services/cms';
import { ScreenHeader } from '@/components/screen-header';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';

export default function CategoriesScreen() {
  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const onScroll = useTabBarScroll();
  useEffect(() => { getCmsPage('categories', 'categorias').then(setCmsPage).catch(() => setError(true)).finally(() => setLoading(false)); }, []);
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader back={false} /><ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
    <ThemedText type="subtitle">Categorias</ThemedText>
    {loading && <ThemedText themeColor="textSecondary">Carregando categorias...</ThemedText>}
    {error && <ThemedText themeColor="textSecondary">Nao foi possivel carregar as categorias.</ThemedText>}
    {!loading && !error && cmsPage?.sections.length === 0 && <ThemedText themeColor="textSecondary">Nenhuma secao publicada foi encontrada.</ThemedText>}
    {cmsPage?.sections.map((section, index) => <CmsSectionView key={`${section.name}-${index}`} section={section} />)}
  </ScrollView></SafeAreaView></ThemedView>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, safeArea: { flex: 1, padding: Spacing.four }, content: { gap: Spacing.three, paddingVertical: Spacing.five } });

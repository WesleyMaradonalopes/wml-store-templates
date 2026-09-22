import { CmsSectionView } from '@/components/cms-section';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { CmsPage, getCmsPage } from '@/services/cms';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CategoriesScreen() {
  const [cmsPage, setCmsPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const onScroll = useTabBarScroll();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useAppTheme();
  const theme = useTheme();
  const dark = colorScheme === 'dark';

  useEffect(() => {
    getCmsPage('categories', 'categorias')
      .then(setCmsPage)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
				<LinearGradient
          colors={dark ? [theme.background, theme.background, theme.background] : ['#ffffff', '#ffffff', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, styles.gradientFill]}>
					<View style={styles.backgroundOverlay}>
						<View pointerEvents="none" style={[styles.headerBackground, { height: insets.top + 58 }]} />
						<SafeAreaView style={styles.safeArea}>
							<View style={styles.headerSurface}>
								<ScreenHeader back={false} />
							</View>
							<BlurView intensity={24} tint={dark ? 'dark' : 'light'} style={[styles.glassPanel, dark && { borderColor: theme.border }]}>
									<ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
										{loading && <ThemedText themeColor="textSecondary">Carregando categorias...</ThemedText>}
										{error && <ThemedText themeColor="textSecondary">Nao foi possivel carregar as categorias.</ThemedText>}
										{!loading && !error && cmsPage?.sections.length === 0 && (
											<ThemedText themeColor="textSecondary">Nenhuma secao publicada foi encontrada.</ThemedText>
										)}
										{cmsPage?.sections.map((section, index) => (
											<CmsSectionView key={`${section.name}-${index}`} section={section} />
										))}
									</ScrollView>
							</BlurView>
						</SafeAreaView>
					</View>
				</LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  backgroundOverlay: { flex: 1, backgroundColor: 'rgba(235, 235, 235, 0)' },
  headerBackground: { position: 'absolute', top: 0, right: 0, left: 0, backgroundColor: 'transparent' },
  safeArea: { flex: 1, paddingHorizontal: 20, paddingVertical: 0 },
  headerSurface: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: 'transparent' },
  glassPanel: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    marginHorizontal: 0,
    borderColor: 'rgba(255, 255, 255, 1)',
    boxShadow: '0px 0px 10px 1px rgba(0, 0, 0, 0.1)',
  },
  gradientFill: { flex: 1 },
  content: { gap: Spacing.three, paddingTop: 16, paddingBottom: 100 },
});

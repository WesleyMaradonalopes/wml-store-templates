import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CmsRichText } from '@/components/cms-rich-text';
import ArrowUpIcon from '@/components/icons/ArrowUpIcon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { getCmsPage, type CmsPage, type CmsSection } from '@/services/cms';

const PRIVACY_POLICY_PAGE = 'politica-privacidade';

function privacyRichTextSection(page: CmsPage | null): CmsSection | null {
  return page?.sections.find((section) => section.name === 'RichText') ?? null;
}

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const onScroll = useTabBarScroll();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getCmsPage('landingPage', PRIVACY_POLICY_PAGE)
      .then((value) => { if (active) setPage(value); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const richTextSection = privacyRichTextSection(page);
  const richTextData = richTextSection?.data ?? {};

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Política de privacidade" onBack={() => router.back()} showSearch={false} />
        </View>
        <View style={styles.body}>
          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            {loading && <ActivityIndicator color="#0a0a0a" style={styles.loader} />}
            {error && <ThemedText themeColor="textSecondary">Não foi possível carregar a política de privacidade.</ThemedText>}
            {!loading && !error && richTextSection && (
              <View style={styles.card}>
                <CmsRichText data={richTextData} />
              </View>
            )}
            {!loading && !error && !richTextSection && (
              <ThemedText themeColor="textSecondary">Nenhum conteúdo publicado nesta página.</ThemedText>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
              style={styles.backToTopButton}>
              <ArrowUpIcon size={15} />
              <ThemedText style={styles.backToTopText}>Voltar ao topo</ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  header: { marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.four, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#eeeae5' },
  body: { flex: 1, marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.five, backgroundColor: '#f7f7f7' },
  content: { gap: Spacing.three, paddingTop: Spacing.four, paddingBottom: 70 },
  loader: { marginTop: Spacing.four },
  card: { padding: Spacing.five, paddingTop: 15, borderRadius: 16, borderWidth: 1, borderColor: '#e6e1dc', backgroundColor: '#ffffff' },
  backToTopButton: { alignSelf: 'center', minHeight: 40, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e6e1dc', backgroundColor: '#ffffff' },
  backToTopText: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18, color: '#0a0a0a' },
});

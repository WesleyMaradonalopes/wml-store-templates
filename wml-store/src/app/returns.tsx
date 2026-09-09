import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CmsRichText } from '@/components/cms-rich-text';
import ArrowUpIcon from '@/components/icons/ArrowUpIcon';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { getCmsPage, type CmsPage, type CmsSection } from '@/services/cms';

const RETURNS_PAGE = 'trocas-e-devolucoes';

function richTextSections(page: CmsPage | null): CmsSection[] {
  return page?.sections.filter((section) => section.name === 'RichText') ?? [];
}

function valueText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function DropdownChevron({ open }: { open: boolean }) {
  return (
    <View style={[styles.dropdownChevron, open && styles.dropdownChevronOpen]}>
      <ChevronRightIcon color="#625d57" size={16} />
    </View>
  );
}

function ReturnsAccordion({ section, open, onToggle }: { section: CmsSection; open: boolean; onToggle: () => void }) {
  const data = section.data ?? {};
  const title = valueText(data.title).trim();

  return (
    <View style={styles.accordionCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={styles.accordionHeader}>
        <ThemedText style={styles.accordionTitle}>{title}</ThemedText>
        <DropdownChevron open={open} />
      </Pressable>
      {open && (
        <View style={styles.accordionContent}>
          <CmsRichText data={{ content: data.content }} textStyle={styles.accordionText} />
        </View>
      )}
    </View>
  );
}

export default function ReturnsScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const onScroll = useTabBarScroll();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;
    getCmsPage('landingPage', RETURNS_PAGE)
      .then((value) => { if (active) setPage(value); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const sections = richTextSections(page);
  const introSection = sections[0];
  const accordionSections = sections.slice(1);

  function toggleSection(index: number) {
    setExpandedSections((current) => ({ ...current, [index]: !current[index] }));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Trocas e devoluções" onBack={() => router.back()} showSearch={false} />
        </View>
        <View style={styles.body}>
          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <View style={styles.inner}>
              {loading && <ActivityIndicator color="#0a0a0a" style={styles.loader} />}
              {error && <ThemedText themeColor="textSecondary">Não foi possível carregar a política de trocas e devoluções.</ThemedText>}
              {!loading && !error && introSection && (
                <View style={styles.introCard}>
                  <CmsRichText
                    data={introSection.data ?? {}}
                    titleStyle={styles.introTitle}
                    textStyle={styles.introText}
                  />
                </View>
              )}
              {!loading && !error && accordionSections.map((section, index) => (
                <ReturnsAccordion
                  key={`${valueText(section.data?.title)}-${index}`}
                  section={section}
                  open={Boolean(expandedSections[index])}
                  onToggle={() => toggleSection(index)}
                />
              ))}
              {!loading && !error && sections.length === 0 && (
                <ThemedText themeColor="textSecondary">Nenhum conteúdo publicado nesta página.</ThemedText>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                style={styles.backToTopButton}>
                <ArrowUpIcon size={15} />
                <ThemedText style={styles.backToTopText}>Voltar ao topo</ThemedText>
              </Pressable>
            </View>
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
  body: { flex: 1, marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.four, backgroundColor: '#f7f7f7' },
  content: { paddingTop: Spacing.four, paddingBottom: 70 },
  inner: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: Spacing.three },
  loader: { marginTop: Spacing.four },
  introCard: { padding: Spacing.four, borderRadius: 16, borderWidth: 1, borderColor: '#e6e1dc', backgroundColor: '#ffffff' },
  introTitle: { marginBottom: Spacing.two, color: '#1e120d', fontFamily: Fonts.bold, fontSize: 16, lineHeight: 22 },
  introText: { color: '#625d57', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 19 },
  accordionCard: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: '#e6e1dc', backgroundColor: '#ffffff' },
  accordionHeader: { minHeight: 78, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  accordionTitle: { flex: 1, color: '#1e120d', fontFamily: Fonts.medium, fontSize: 14, lineHeight: 21 },
  dropdownChevron: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  dropdownChevronOpen: { transform: [{ rotate: '-90deg' }] },
  accordionContent: { paddingHorizontal: Spacing.four, paddingTop: Spacing.one, paddingBottom: Spacing.four, borderTopWidth: 1, borderTopColor: '#eeeae5' },
  accordionText: { color: '#625d57', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  backToTopButton: { alignSelf: 'center', minHeight: 40, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e6e1dc', backgroundColor: '#ffffff' },
  backToTopText: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18, color: '#1e120d' },
});

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { searchSmartProductListing, type CatalogFacet, type SelectedFacet } from '@/services/catalog';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import ChevronRightIcon from './icons/ChevronRightIcon';

type Props = {
  visible: boolean;
  query: string;
  facets: CatalogFacet[];
  baseFacets?: SelectedFacet[];
  selectedFacets: SelectedFacet[];
  sort: string;
  resultCount: number;
  onClose: () => void;
  onApply: (facets: SelectedFacet[], sort: string) => void;
};

const SORT_OPTIONS = [
  { value: 'release:desc', label: 'Novidades' },
  { value: 'orders:desc', label: 'Mais vendidos' },
  { value: 'price:desc', label: 'Maior preço' },
  { value: 'price:asc', label: 'Menor preço' },
  { value: 'score:desc', label: 'Mais relevantes' },
  { value: 'discount:desc', label: 'Maior desconto' },
] as const;

function hasFacet(facets: SelectedFacet[], key: string, value: string) {
  return facets.some((facet) => facet.key === key && facet.value === value);
}

export function ProductFilterModal({ visible, query, facets, baseFacets = [], selectedFacets, sort, resultCount, onClose, onApply }: Props) {
  const [draftFacets, setDraftFacets] = useState<SelectedFacet[]>(selectedFacets);
  const [draftSort, setDraftSort] = useState(sort);
  const [openFacets, setOpenFacets] = useState<Record<string, boolean>>({});
  const [previewCount, setPreviewCount] = useState(resultCount);
  const [previewLoading, setPreviewLoading] = useState(false);
  const baseSignature = JSON.stringify(baseFacets);
  const draftSignature = JSON.stringify(draftFacets);
  const allSelected = [...baseFacets, ...draftFacets];

  useEffect(() => {
    if (!visible) return;
    setDraftFacets(selectedFacets);
    setDraftSort(sort);
    setPreviewCount(resultCount);
    setOpenFacets(Object.fromEntries(facets.map((facet) => [facet.key, true])));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setOpenFacets((current) => ({ ...Object.fromEntries(facets.map((facet) => [facet.key, true])), ...current }));
  }, [facets, visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setPreviewLoading(true);
    const timer = setTimeout(() => {
      searchSmartProductListing({ query, facets: [...baseFacets, ...draftFacets], sort: draftSort, count: 1 })
        .then((result) => { if (active) setPreviewCount(result.recordsFiltered); })
        .catch(() => undefined)
        .finally(() => { if (active) setPreviewLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [baseSignature, draftSignature, draftSort, query, visible]);

  function toggleFacet(key: string, value: string) {
    if (hasFacet(baseFacets, key, value)) return;
    setDraftFacets((current) => hasFacet(current, key, value)
      ? current.filter((facet) => facet.key !== key || facet.value !== value)
      : [...current, { key, value }]);
  }

  function clearFilters() {
    setDraftFacets([]);
    setDraftSort('score:desc');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Filtros</ThemedText>
            <Pressable accessibilityLabel="Fechar filtros" onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeText}>✕</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.sortSection}>
              <ThemedText type="smallBold">Ordenar por</ThemedText>
              <View style={styles.sortGrid}>
                {SORT_OPTIONS.map((option) => {
                  const selected = draftSort === option.value;
                  return (
                    <Pressable key={option.value} accessibilityState={{ selected }} onPress={() => setDraftSort(option.value)} style={[styles.sortOption, selected && styles.selectedSort]}>
                      <ThemedText style={[styles.sortText, selected && styles.selectedSortText]}>{option.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {facets.map((facet) => {
              const open = openFacets[facet.key] !== false;
              return (
                <View key={facet.key} style={styles.facetSection}>
                  <Pressable accessibilityState={{ expanded: open }} onPress={() => setOpenFacets((current) => ({ ...current, [facet.key]: !open }))} style={styles.facetHeader}>
                    <ThemedText type="smallBold">{facet.name}</ThemedText>
                    <View style={[styles.chevron, open && styles.chevronOpen]}>
                      <ChevronRightIcon color="#77716b" size={16} />
                    </View>
                  </Pressable>
                  {open && (
                    <View style={styles.facetValues}>
                      {facet.values.map((value) => {
                        const selected = hasFacet(allSelected, value.key, value.value);
                        const locked = hasFacet(baseFacets, value.key, value.value);
                        return (
                          <Pressable key={`${value.key}-${value.value}`} disabled={locked} accessibilityState={{ checked: selected, disabled: locked }} onPress={() => toggleFacet(value.key, value.value)} style={[styles.facetValue, locked && styles.lockedValue]}>
                            <View style={[styles.checkbox, selected && styles.checked]}>{selected && <ThemedText style={styles.checkmark}>✓</ThemedText>}</View>
                            <ThemedText style={styles.facetLabel}>{value.name}</ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={clearFilters} style={styles.clearButton}><ThemedText type="smallBold">Limpar filtros</ThemedText></Pressable>
            <Pressable onPress={() => onApply(draftFacets, draftSort)} style={styles.applyButton}>
              {previewLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <ThemedText style={styles.applyText}>Ver {previewCount} {previewCount === 1 ? 'resultado' : 'resultados'}</ThemedText>}
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

export function FilterGlyph() {
  return <View style={styles.glyph}><View style={[styles.glyphLine, styles.glyphLineOne]} /><View style={[styles.glyphDot, styles.glyphDotOne]} /><View style={[styles.glyphLine, styles.glyphLineTwo]} /><View style={[styles.glyphDot, styles.glyphDotTwo]} /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: { minHeight: 58, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eeeae5' },
  headerTitle: { fontSize: 18 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 24, lineHeight: 28, color: '#0a0a0a', fontWeight: '400' },
  content: { padding: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.four },
  sortSection: { gap: Spacing.two },
  sortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  sortOption: { width: '48.5%', minHeight: 38, paddingHorizontal: Spacing.two, borderRadius: 20, borderWidth: 1, borderColor: '#ddd8d2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  selectedSort: { borderColor: '#65615d', backgroundColor: '#65615d' },
  sortText: { fontSize: 12, textAlign: 'center' },
  selectedSortText: { color: '#FFFFFF' },
  facetSection: { gap: Spacing.two },
  facetHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  chevronOpen: { transform: [{ rotate: '-90deg' }] },
  facetValues: { gap: Spacing.two },
  facetValue: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  lockedValue: { opacity: 0.7 },
  checkbox: { width: 19, height: 19, borderRadius: 3, borderWidth: 1, borderColor: '#d0cbc5', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checked: { borderColor: '#aaa49c', backgroundColor: '#aaa49c' },
  checkmark: { color: '#FFFFFF', fontSize: 12, lineHeight: 14, fontWeight: '700' },
  facetLabel: { flex: 1, fontSize: 14 },
  footer: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, flexDirection: 'row', gap: Spacing.two, borderTopWidth: 1, borderTopColor: '#e8e3dd', backgroundColor: '#FFFFFF' },
  clearButton: { flex: 1, minHeight: 48, borderRadius: 6, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  applyButton: { flex: 1, minHeight: 48, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  applyText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  glyph: { width: 16, height: 16, position: 'relative' },
  glyphLine: { position: 'absolute', left: 1, right: 1, height: 1.5, backgroundColor: '#413d39' },
  glyphLineOne: { top: 4 },
  glyphLineTwo: { top: 11 },
  glyphDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, borderWidth: 1, borderColor: '#413d39', backgroundColor: '#FFFFFF' },
  glyphDotOne: { top: 2.5, left: 4 },
  glyphDotTwo: { top: 9.5, right: 3 },
});

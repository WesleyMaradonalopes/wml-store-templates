import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ArrowLeftIAIcon from '@/components/icons/ArrowLeftIAicon';
import SearchIcon from '@/components/icons/SearchIcon';
import { ProductCard } from '@/components/product-card';
import { FilterGlyph, ProductFilterModal } from '@/components/product-filter-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { getProductFacets, searchProductListing, type CatalogFacet, type Product, type SelectedFacet } from '@/services/catalog';
import { isFavorite } from '@/services/favorites';

export default function SearchScreen() {
  const router = useRouter();
  const onScroll = useTabBarScroll();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof q === 'string' ? q.trim() : '';
  const [term, setTerm] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<CatalogFacet[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacet[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(initialQuery));
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sort, setSort] = useState('score:desc');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const popularTerms = ['Sutiã', 'Naked', 'Calcinha Renda', 'Calcinhas Algodão', 'Pijama', 'Pantufa', 'Calcinha Microfibra', 'Top', 'Camisola', 'Algodão'];
  const facetSignature = JSON.stringify(selectedFacets);

  useEffect(() => {
    if (typeof q !== 'string') return;
    setTerm(q);
    setActiveQuery(q.trim());
    setSelectedFacets([]);
    setSort('score:desc');
  }, [q]);

  useEffect(() => {
    if (!activeQuery) {
      setProducts([]);
      setFacets([]);
      setResultCount(0);
      return;
    }
    let active = true;
    setLoading(true);
    setMessage(null);
    Promise.all([
      searchProductListing({ query: activeQuery, facets: selectedFacets, count: 48, sort }),
      getProductFacets({ query: activeQuery, facets: selectedFacets }),
    ])
      .then(async ([listing, availableFacets]) => {
        if (!active) return;
        setProducts(listing.products);
        setResultCount(listing.recordsFiltered);
        setFacets(availableFacets);
        const saved = await Promise.all(listing.products.map(async (product) => (await isFavorite(product.id) ? product.id : null)));
        if (active) setFavoriteIds(saved.filter((id): id is string => Boolean(id)));
      })
      .catch(() => {
        if (!active) return;
        setMessage('Não foi possível consultar os produtos agora.');
        setProducts([]);
        setResultCount(0);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeQuery, facetSignature, sort]);

  function search() {
    const value = term.trim();
    if (!value) return;
    setSelectedFacets([]);
    setSort('score:desc');
    setActiveQuery(value);
  }

  function openPopular(value: string) {
    setTerm(value);
    setSelectedFacets([]);
    setSort('score:desc');
    setActiveQuery(value);
  }

  async function loadMore() {
    if (loading || loadingMore || products.length >= resultCount) return;
    setLoadingMore(true);
    try {
      const nextPage = Math.floor(products.length / 48) + 1;
      const listing = await searchProductListing({ query: activeQuery, facets: selectedFacets, count: 48, page: nextPage, sort });
      const newProducts = listing.products.filter((product) => !products.some((current) => current.id === product.id));
      setProducts((current) => [...current, ...newProducts]);
      const saved = await Promise.all(newProducts.map(async (product) => (await isFavorite(product.id) ? product.id : null)));
      setFavoriteIds((current) => Array.from(new Set([...current, ...saved.filter((id): id is string => Boolean(id))])));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.searchHeader}>
          <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeftIAIcon color="#4b4743" size={19} />
          </Pressable>
          <View style={styles.searchInputWrap}>
            <SearchIcon size={17} color="#8b8782" />
            <TextInput value={term} onChangeText={setTerm} onSubmitEditing={search} placeholder="O que você procura?" returnKeyType="search" style={styles.searchInput} />
          </View>
          <Pressable accessibilityLabel="Fechar busca" onPress={() => router.back()} style={styles.closeButton}>
            <ThemedText style={styles.closeText}>×</ThemedText>
          </Pressable>
        </View>
        <View style={styles.body}>

        {!activeQuery && (
          <ThemedView style={styles.trending}>
            <ThemedText type="smallBold">Em alta</ThemedText>
            <View style={styles.chips}>
              {popularTerms.map((popular) => <Pressable key={popular} onPress={() => openPopular(popular)} style={styles.chip}><ThemedText style={styles.chipText}>{popular}</ThemedText></Pressable>)}
            </View>
          </ThemedView>
        )}

        {!!activeQuery && (
          <View style={styles.listingHeader}>
            <View style={styles.listingHeading}>
              <ThemedText style={styles.listingTitle}>{activeQuery}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.resultCount}>{resultCount} {resultCount === 1 ? 'peça' : 'peças'}</ThemedText>
            </View>
            <Pressable onPress={() => setFiltersVisible(true)} style={styles.filterButton}><FilterGlyph /><ThemedText type="smallBold" style={styles.filterText}>Filtrar e Ordenar</ThemedText></Pressable>
          </View>
        )}

        {!!message && <ThemedText style={message.includes('adicionado') ? styles.successText : styles.messageText}>{message}</ThemedText>}
        {loading && <ActivityIndicator color="#000000" style={styles.loader} />}
        {!loading && activeQuery && products.length === 0 && !message && <ThemedText themeColor="textSecondary">Nenhum produto encontrado.</ThemedText>}

        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
          onScroll={onScroll}
          onEndReached={() => { void loadMore(); }}
          onEndReachedThreshold={0.4}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#000000" style={styles.moreLoader} /> : null}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              style={styles.card}
              favorite={favoriteIds.includes(item.id)}
              onFavoriteChange={(favorite) => setFavoriteIds((current) => favorite ? Array.from(new Set([...current, item.id])) : current.filter((id) => id !== item.id))}
            />
          )}
          />
        </View>

        <ProductFilterModal
          visible={filtersVisible}
          query={activeQuery}
          facets={facets}
          selectedFacets={selectedFacets}
          sort={sort}
          resultCount={resultCount}
          onClose={() => setFiltersVisible(false)}
          onApply={(nextFacets, nextSort) => { setSelectedFacets(nextFacets); setSort(nextSort); setFiltersVisible(false); }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  searchHeader: { minHeight: 58, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#e7e3de', backgroundColor: '#FFFFFF' },
  backButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  searchInputWrap: { flex: 1, minHeight: 42, borderRadius: 22, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: '#f1f1f3' },
  searchInput: { flex: 1, minHeight: 40, paddingVertical: 0, fontSize: 14, color: '#3c3936', fontFamily: Fonts.sans },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 32, lineHeight: 34, color: '#55514d' },
  body: { flex: 1, paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.three },
  trending: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16, borderWidth: 1, borderColor: '#ebe7e1', backgroundColor: '#FFFFFF' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 18, borderWidth: 1, borderColor: '#d7d3cc' },
  chipText: { fontSize: 12 },
  listingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  listingHeading: { flex: 1 },
  listingTitle: { fontSize: 18 },
  resultCount: { fontSize: 12 },
  filterButton: { minHeight: 42, paddingHorizontal: Spacing.three, borderRadius: 22, borderWidth: 1, borderColor: '#6d6862', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, backgroundColor: '#FFFFFF' },
  filterText: { fontSize: 12 },
  loader: { marginTop: Spacing.four },
  moreLoader: { marginVertical: Spacing.four },
  list: { paddingBottom: 120, gap: Spacing.three },
  columns: { gap: Spacing.two },
  card: { width: '48.7%' },
  successText: { color: '#26734d', fontWeight: '600' },
  messageText: { color: '#B42318' },
});

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
import { parseCmsRouteFacets } from '@/services/cms-actions';
import { getProductFacets, resolveCategoryFacets, searchProductListing, type CatalogFacet, type Product, type SelectedFacet } from '@/services/catalog';
import { isFavorite } from '@/services/favorites';

function paramText(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function SearchScreen() {
  const router = useRouter();
  const onScroll = useTabBarScroll();
  const { q, facets: facetsParam, sort: sortParam, title: titleParam } = useLocalSearchParams<{ q?: string; facets?: string; sort?: string; title?: string }>();
  const initialQuery = paramText(q).trim();
  const initialFacets = parseCmsRouteFacets(paramText(facetsParam));
  const initialSort = paramText(sortParam) || 'score:desc';
  const initialTitle = paramText(titleParam);
  const [term, setTerm] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<CatalogFacet[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacet[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(initialQuery || initialFacets.length));
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sort, setSort] = useState(initialSort);
  const [listingTitle, setListingTitle] = useState(initialTitle);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const popularTerms = ['Sutiã', 'Naked', 'Calcinha Renda', 'Calcinhas Algodão', 'Pijama', 'Pantufa', 'Calcinha Microfibra', 'Top', 'Camisola', 'Algodão'];
  const facetSignature = JSON.stringify(selectedFacets);

  useEffect(() => {
    const nextQuery = paramText(q).trim();
    setTerm(nextQuery);
    setActiveQuery(nextQuery);
    setSelectedFacets(parseCmsRouteFacets(paramText(facetsParam)));
    setSort(paramText(sortParam) || 'score:desc');
    setListingTitle(paramText(titleParam));
  }, [facetsParam, q, sortParam, titleParam]);

  useEffect(() => {
    if (!activeQuery && selectedFacets.length === 0) {
      setProducts([]);
      setFacets([]);
      setResultCount(0);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setMessage(null);
    async function loadListing() {
      let requestFacets = selectedFacets;
      let [listing, availableFacets] = await Promise.all([
        searchProductListing({ query: activeQuery, facets: requestFacets, count: 48, sort }),
        getProductFacets({ query: activeQuery, facets: requestFacets }),
      ]);

      if (listing.recordsFiltered === 0 && listing.products.length === 0) {
        const resolvedFacets = await resolveCategoryFacets(requestFacets);
        if (JSON.stringify(resolvedFacets) !== JSON.stringify(requestFacets)) {
          requestFacets = resolvedFacets;
          [listing, availableFacets] = await Promise.all([
            searchProductListing({ query: activeQuery, facets: requestFacets, count: 48, sort }),
            getProductFacets({ query: activeQuery, facets: requestFacets }),
          ]);
          if (active) setSelectedFacets(resolvedFacets);
        }
      }

      if (!active) return;
      setProducts(listing.products);
      setResultCount(listing.recordsFiltered);
      setFacets(availableFacets);
      const saved = await Promise.all(listing.products.map(async (product) => (await isFavorite(product.id) ? product.id : null)));
      if (active) setFavoriteIds(saved.filter((id): id is string => Boolean(id)));
    }

    loadListing()
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
    setListingTitle('');
    setActiveQuery(value);
  }

  function openPopular(value: string) {
    setTerm(value);
    setSelectedFacets([]);
    setSort('score:desc');
    setListingTitle('');
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
            <ThemedText style={styles.closeText}>✕</ThemedText>
          </Pressable>
        </View>
        <View style={styles.body}>

        {!activeQuery && selectedFacets.length === 0 && (
          <ThemedView style={styles.trending}>
            <ThemedText type="smallBold">Em alta</ThemedText>
            <View style={styles.chips}>
              {popularTerms.map((popular) => <Pressable key={popular} onPress={() => openPopular(popular)} style={styles.chip}><ThemedText style={styles.chipText}>{popular}</ThemedText></Pressable>)}
            </View>
          </ThemedView>
        )}

        {(!!activeQuery || selectedFacets.length > 0) && (
          <View style={styles.listingHeader}>
            <View style={styles.listingHeading}>
              <ThemedText style={styles.listingTitle}>{listingTitle || activeQuery || 'Produtos'}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.resultCount}>{resultCount} {resultCount === 1 ? 'peça' : 'peças'}</ThemedText>
            </View>
            <Pressable onPress={() => setFiltersVisible(true)} style={styles.filterButton}><FilterGlyph /><ThemedText type="smallBold" style={styles.filterText}>Filtrar e Ordenar</ThemedText></Pressable>
          </View>
        )}

        {!!message && <ThemedText style={message.includes('adicionado') ? styles.successText : styles.messageText}>{message}</ThemedText>}
        {loading && <ActivityIndicator color="#0a0a0a" style={styles.loader} />}
        {!loading && (activeQuery || selectedFacets.length > 0) && products.length === 0 && !message && <ThemedText themeColor="textSecondary">Nenhum produto encontrado.</ThemedText>}

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
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#0a0a0a" style={styles.moreLoader} /> : null}
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
  closeText: { fontSize: 24, lineHeight: 28, color: '#0a0a0a', fontWeight: '400' },
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

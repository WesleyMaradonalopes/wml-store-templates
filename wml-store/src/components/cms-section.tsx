import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getProductFacets, Product, searchProductListing, searchProducts, type CatalogFacet, type SelectedFacet } from '@/services/catalog';
import { CmsSection } from '@/services/cms';
import { isFavorite } from '@/services/favorites';
import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { FilterGlyph, ProductFilterModal } from './product-filter-modal';
import { ProductCard } from './product-card';

type Props = { section: CmsSection };

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function richTextBlocks(value: unknown): string[] {
  let candidate = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value) as unknown;
    } catch {
      return value.trim() ? [value] : [];
    }
  }

  if (!candidate || typeof candidate !== 'object') return [];
  const blocks = (candidate as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((block) => block && typeof block === 'object' ? text((block as { text?: unknown }).text).trim() : '')
    .filter(Boolean);
}

const PRODUCT_CARD_WIDTH = 220;

function ProductShelf({ data }: { data: Record<string, unknown> }) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const tabs = Array.isArray(data.tabs)
    ? data.tabs.filter((tab): tab is Record<string, unknown> => Boolean(tab && typeof tab === 'object'))
    : [];
  const activeConfig = tabs.length > 1 ? tabs[selectedTab] ?? tabs[0] : data;

  useEffect(() => {
    const facets = Array.isArray(data.facets)
      ? data.facets.filter(
          (facet): facet is { key: string; value: string } =>
            Boolean(
              facet &&
                typeof facet === 'object' &&
                typeof (facet as Record<string, unknown>).key === 'string' &&
                typeof (facet as Record<string, unknown>).value === 'string',
            ),
        )
      : [];

    const activeFacets = Array.isArray(activeConfig.facets) ? activeConfig.facets.filter(
      (facet): facet is { key: string; value: string } => Boolean(
        facet && typeof facet === 'object' && typeof (facet as Record<string, unknown>).key === 'string' && typeof (facet as Record<string, unknown>).value === 'string',
      ),
    ) : facets;

    setLoading(true);
    searchProducts({
      query: text(activeConfig.term) || text(activeConfig.query),
      facets: activeFacets,
      sort: text(activeConfig.sort),
      count: 12,
    })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [data, selectedTab]);

  useEffect(() => {
    let active = true;
    Promise.all(products.map(async (product) => (await isFavorite(product.id) ? product.id : null)))
      .then((ids) => { if (active) setFavoriteIds(ids.filter((id): id is string => Boolean(id))); })
      .catch(() => { if (active) setFavoriteIds([]); });
    return () => { active = false; };
  }, [products]);

  return (
    <ThemedView style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle">{text(data.title) || 'Produtos'}</ThemedText>
        <Pressable onPress={() => router.push(`/search?q=${encodeURIComponent(text(activeConfig.term) || text(activeConfig.query))}` as never)}>
          <ThemedText style={styles.seeAll}>Ver tudo</ThemedText>
        </Pressable>
      </View>
      {tabs.length > 1 && (
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.tabList}
          renderItem={({ item: tab, index }) => (
            <Pressable onPress={() => setSelectedTab(index)} style={[styles.tab, selectedTab === index && styles.selectedTab]}>
              <ThemedText style={selectedTab === index ? styles.selectedTabText : undefined}>{text(tab.label) || `Opcao ${index + 1}`}</ThemedText>
            </Pressable>
          )}
        />
      )}
      {loading && <ActivityIndicator color="#000000" />}
      {!loading && products.length === 0 && (
        <ThemedText themeColor="textSecondary">Nenhum produto encontrado.</ThemedText>
      )}
      <FlatList
        data={products}
        horizontal
        snapToInterval={PRODUCT_CARD_WIDTH + 12}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        keyExtractor={(product) => product.id}
        contentContainerStyle={styles.productList}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            style={{ width: PRODUCT_CARD_WIDTH }}
            favorite={favoriteIds.includes(item.id)}
            onFavoriteChange={(favorite) => setFavoriteIds((current) => favorite ? Array.from(new Set([...current, item.id])) : current.filter((id) => id !== item.id))}
          />
        )}
      />
    </ThemedView>
  );
}

function configuredFacets(value: unknown): SelectedFacet[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((facet) => {
    if (!facet || typeof facet !== 'object') return [];
    const candidate = facet as Record<string, unknown>;
    return typeof candidate.key === 'string' && typeof candidate.value === 'string' && candidate.key && candidate.value
      ? [{ key: candidate.key, value: candidate.value }]
      : [];
  });
}

function ProductListingSection({ data }: { data: Record<string, unknown> }) {
  const query = text(data.term) || text(data.query);
  const baseFacets = configuredFacets(data.facets);
  const baseSignature = JSON.stringify(baseFacets);
  const [products, setProducts] = useState<Product[]>([]);
  const [facets, setFacets] = useState<CatalogFacet[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacet[]>([]);
  const [sort, setSort] = useState(text(data.sort) || 'score:desc');
  const [resultCount, setResultCount] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const selectedSignature = JSON.stringify(selectedFacets);
  const activeFacets = [...baseFacets, ...selectedFacets];

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      searchProductListing({ query, facets: activeFacets, sort, page: 1, count: 24 }),
      getProductFacets({ query, facets: activeFacets }),
    ])
      .then(async ([listing, availableFacets]) => {
        if (!active) return;
        setProducts(listing.products);
        setResultCount(listing.recordsFiltered);
        setFacets(availableFacets);
        const saved = await Promise.all(listing.products.map(async (product) => (await isFavorite(product.id) ? product.id : null)));
        if (active) setFavoriteIds(saved.filter((id): id is string => Boolean(id)));
      })
      .catch(() => { if (active) { setProducts([]); setFacets([]); setResultCount(0); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [baseSignature, query, selectedSignature, sort]);

  async function loadMore() {
    if (loadingMore || products.length >= resultCount) return;
    setLoadingMore(true);
    try {
      const nextPage = Math.floor(products.length / 24) + 1;
      const listing = await searchProductListing({ query, facets: activeFacets, sort, page: nextPage, count: 24 });
      const newProducts = listing.products.filter((product) => !products.some((current) => current.id === product.id));
      setProducts((current) => [...current, ...newProducts]);
      const saved = await Promise.all(newProducts.map(async (product) => (await isFavorite(product.id) ? product.id : null)));
      setFavoriteIds((current) => Array.from(new Set([...current, ...saved.filter((id): id is string => Boolean(id))])));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <ThemedView style={styles.plpSection}>
      <View style={styles.plpHeader}>
        <View style={styles.plpHeading}>
          <ThemedText style={styles.plpTitle}>{text(data.title) || query || 'Produtos'}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.plpCount}>{resultCount} {resultCount === 1 ? 'peça' : 'peças'}</ThemedText>
        </View>
        <Pressable onPress={() => setFiltersVisible(true)} style={styles.filterButton}><FilterGlyph /><ThemedText type="smallBold" style={styles.filterButtonText}>Filtrar e Ordenar</ThemedText></Pressable>
      </View>
      {loading && <ActivityIndicator color="#000000" />}
      {!loading && products.length === 0 && <ThemedText themeColor="textSecondary">Nenhum produto encontrado.</ThemedText>}
      <View style={styles.productGrid}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            style={styles.gridProductCard}
            favorite={favoriteIds.includes(product.id)}
            onFavoriteChange={(favorite) => setFavoriteIds((current) => favorite ? Array.from(new Set([...current, product.id])) : current.filter((id) => id !== product.id))}
          />
        ))}
      </View>
      {products.length < resultCount && <Pressable disabled={loadingMore} onPress={loadMore} style={styles.loadMoreButton}>{loadingMore ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.loadMoreText}>Ver mais produtos</ThemedText>}</Pressable>}
      <ProductFilterModal
        visible={filtersVisible}
        query={query}
        facets={facets}
        baseFacets={baseFacets}
        selectedFacets={selectedFacets}
        sort={sort}
        resultCount={resultCount}
        onClose={() => setFiltersVisible(false)}
        onApply={(nextFacets, nextSort) => { setSelectedFacets(nextFacets); setSort(nextSort); setFiltersVisible(false); }}
      />
    </ThemedView>
  );
}

function ContentCard({ title, description, imageUrl, action }: { title?: string; description?: string; imageUrl?: string; action?: { type?: string; value?: string } }) {
  const router = useRouter();
  function open() {
    if (!action?.value) return;
    if (action.type === 'product') router.push(`/product/${action.value}`);
    else if (action.type === 'page') router.push(`/page/${action.value}`);
    else if (action.type === 'search') router.push(`/search?q=${encodeURIComponent(action.value)}` as never);
    else if (action.type === 'link') Linking.openURL(action.value);
  }
  return <Pressable onPress={open}><ThemedView style={styles.contentCard}>{!!imageUrl && <Image source={{ uri: imageUrl }} style={styles.contentCardImage} contentFit="cover" />}<ThemedText type="smallBold">{title || 'Conteúdo'}</ThemedText>{!!description && <ThemedText themeColor="textSecondary" numberOfLines={3}>{description}</ThemedText>}</ThemedView></Pressable>;
}

function StreamShopBanner({ data }: { data: Record<string, unknown> }) {
  const content = Array.isArray(data.content) ? data.content : [];
  return <ThemedView style={styles.section}><ThemedText type="subtitle">{text(data.title) || 'Ao vivo'}</ThemedText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contentRow}>{content.map((item, index) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return <ContentCard key={index} title={text(value.title)} description={text(value.description)} imageUrl={text(value.imageUrl) || text(value.thumbnail) || text(value.image)} action={value.action as { type?: string; value?: string } | undefined} />; })}</ScrollView></ThemedView>;
}

function ProductTiles({ data }: { data: Record<string, unknown> }) {
  const shelves = Array.isArray(data.shelves) ? data.shelves.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
  return <View style={styles.tileStack}>{shelves.length ? shelves.map((shelf, index) => <ProductShelf key={index} data={shelf} />) : <ProductShelf data={data} />}</View>;
}

function ScheduleCardShelf({ data }: { data: Record<string, unknown> }) {
  const shelves = Array.isArray(data.shelves) ? data.shelves : [];
  return <ThemedView style={styles.section}><ThemedText type="subtitle">{text(data.title) || 'Agenda'}</ThemedText><View style={styles.contentRow}>{shelves.map((item, index) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return <ThemedView key={index} style={styles.scheduleCard}><ThemedText themeColor="textSecondary">{text(value.date)}</ThemedText><ThemedText type="smallBold">{text(value.title)}</ThemedText><ThemedText themeColor="textSecondary">{text(value.description)}</ThemedText></ThemedView>; })}</View></ThemedView>;
}

function CouponsList({ data }: { data: Record<string, unknown> }) {
  const coupons = Array.isArray(data.coupons) ? data.coupons : [];
  return <ThemedView style={styles.section}><ThemedText type="subtitle">Cupons</ThemedText>{coupons.map((item, index) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return <ThemedView key={index} style={styles.couponCard}><ThemedText type="smallBold">{text(value.title) || 'Cupom'}</ThemedText><ThemedText themeColor="textSecondary">{text(value.description)}</ThemedText><ThemedText style={styles.couponCode}>{text(value.code)}</ThemedText>{!!text(value.expiresAt) && <ThemedText themeColor="textSecondary">Válido até {text(value.expiresAt)}</ThemedText>}</ThemedView>; })}</ThemedView>;
}

export function CmsSectionView({ section }: Props) {
  const router = useRouter();
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRef = useRef<ScrollView | null>(null);
  const data = section.data ?? {};
  const bannerImages = section.name === 'MultipleImageBanner' && Array.isArray(data.images) ? data.images : [];
  const isHeroBanner = section.name === 'MultipleImageBanner' && (text(data.mode) === 'SliderHero' || text(data.mode) === 'FitOnScreen');
  const loopedBannerImages = bannerImages.length > 1 ? [bannerImages[bannerImages.length - 1], ...bannerImages, bannerImages[0]] : bannerImages;

  useEffect(() => {
    if (!isHeroBanner || bannerImages.length < 2) return;
    const timer = setTimeout(() => heroRef.current?.scrollTo({ x: Dimensions.get('window').width, animated: false }), 0);
    return () => clearTimeout(timer);
  }, [isHeroBanner, bannerImages.length]);

  if (section.name === 'RichText') {
    const title = text(data.title).trim();
    const blocks = richTextBlocks(data.content);
    return (
      <ThemedView style={styles.section}>
        {!!title && <ThemedText type="subtitle">{title}</ThemedText>}
        {blocks.map((block, index) => <ThemedText key={`${block}-${index}`}>{block}</ThemedText>)}
      </ThemedView>
    );
  }

  if (section.name === 'MultipleImageBanner') {
    const images = bannerImages;
    const isHero = isHeroBanner;
    const renderBanner = (item: unknown, index: number) => {
      const image = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const imageUrl = text(image.imageUrl);
      if (!imageUrl) return null;
      const action = image.action && typeof image.action === 'object'
        ? (image.action as { type?: string; value?: string })
        : undefined;
      const openBanner = () => {
        if (!action?.value) return;
        if (action.type === 'product') router.push(`/product/${action.value}`);
        if (action.type === 'page') router.push(`/page/${action.value}`);
        if (action.type === 'search') router.push(`/search?q=${encodeURIComponent(action.value)}` as never);
        if (action.type === 'link') Linking.openURL(action.value);
      };
      return (
        <Pressable key={`${imageUrl}-${index}`} onPress={openBanner} style={[styles.banner, isHero && styles.heroBanner]}>
          <Image source={{ uri: imageUrl }} style={[styles.bannerImage, isHero && styles.heroImage]} contentFit="cover" />
          <View style={styles.overlay}>
            {!!text(image.overlayTitle) && <ThemedText style={styles.overlayTitle}>{text(image.overlayTitle)}</ThemedText>}
            {!!text(image.overlaySubtitle) && <ThemedText style={styles.overlaySubtitle}>{text(image.overlaySubtitle)}</ThemedText>}
          </View>
        </Pressable>
      );
    };
    return (
      <View style={isHero ? styles.heroSection : styles.section}>
        {!!text(data.mainTitle) && <ThemedText type="subtitle">{text(data.mainTitle)}</ThemedText>}
        {isHero ? (
          <View style={styles.heroViewport}>
            <ScrollView
              ref={heroRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.heroCarousel}
              onMomentumScrollEnd={(event) => {
                const page = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                if (images.length > 1 && page === 0) {
                  heroRef.current?.scrollTo({ x: images.length * Dimensions.get('window').width, animated: false });
                  setHeroIndex(images.length - 1);
                } else if (images.length > 1 && page === loopedBannerImages.length - 1) {
                  heroRef.current?.scrollTo({ x: Dimensions.get('window').width, animated: false });
                  setHeroIndex(0);
                } else setHeroIndex(Math.max(0, page - 1));
              }}>
              {loopedBannerImages.map(renderBanner)}
            </ScrollView>
            {images.length > 1 && (
              <View pointerEvents="none" style={styles.heroDots}>
                {images.map((_, index) => <View key={index} style={[styles.dot, index === heroIndex && styles.activeDot]} />)}
              </View>
            )}
          </View>
        ) : images.map(renderBanner)}
      </View>
    );
  }

  if (section.name === 'ProductShelf' || section.name === 'HighlightedProductShelf') {
    return <ProductShelf data={data} />;
  }

  if (section.name === 'ProductInfiniteScroll') return <ProductListingSection data={data} />;
  if (section.name === 'LastSeenProducts') return <ProductShelf data={data} />;

  if (section.name === 'ProductTiles') return <ProductTiles data={data} />;
  if (section.name === 'StreamShopBanner') return <StreamShopBanner data={data} />;
  if (section.name === 'ScheduleCardShelf') return <ScheduleCardShelf data={data} />;
  if (section.name === 'CouponsList') return <CouponsList data={data} />;

  if (section.name === 'WordPressCardList') {
    const posts = Array.isArray(data.posts) ? data.posts : Array.isArray(data.content) ? data.content : [];
    return <ThemedView style={styles.section}><View style={styles.sectionHeader}><ThemedText type="subtitle">{text(data.title) || 'Confira nosso blog'}</ThemedText>{!!text(data.postUrl) && <Pressable onPress={() => Linking.openURL(text(data.postUrl))}><ThemedText style={styles.seeAll}>Ver tudo</ThemedText></Pressable>}</View><View style={styles.contentRow}>{posts.map((item, index) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return <ContentCard key={index} title={text(value.title) || text(value.name)} description={text(value.description) || text(value.excerpt)} imageUrl={text(value.imageUrl) || text(value.thumbnail)} action={{ type: 'link', value: text(value.link) }} />; })}</View>{posts.length === 0 && <ThemedText themeColor="textSecondary">Os conteúdos do blog aparecerão aqui.</ThemedText>}</ThemedView>;
  }

  if (section.name === 'CategoryListSwipe' || section.name === 'CategoryAccordeon' || section.name === 'CategoryTree') {
    const router = useRouter();
    const content = Array.isArray(data.content) ? data.content : [];
    const shelves = Array.isArray(data.shelves) ? data.shelves : [];
    const categories = content.length > 0 ? content : shelves.flatMap((shelf) => {
      if (!shelf || typeof shelf !== 'object') return [];
      const items = (shelf as Record<string, unknown>).content;
      return Array.isArray(items) ? items : [];
    });

    return (
      <ThemedView style={styles.section}>
        {!!text(data.title) && <ThemedText type="subtitle">{text(data.title)}</ThemedText>}
        <View style={styles.categoryList}>
          {categories.map((item, index) => {
            const category = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            return (
              <Pressable
                key={`${text(category.title)}-${index}`}
                onPress={() => {
                  const action = category.action as { type?: string; value?: string } | undefined;
                  if (action?.type === 'page' && action.value) router.push(`/page/${action.value}`);
                  if (action?.type === 'product' && action.value) router.push(`/product/${action.value}`);
                  if (action?.type === 'search' && action.value) router.push(`/search?q=${encodeURIComponent(action.value)}` as never);
                  if (action?.type === 'link' && action.value) Linking.openURL(action.value);
                }}>
                <ThemedView style={styles.categoryCard}>
                  {!!(text(category.imageUrl) || text(category.image)) && (
                    <Image
                      source={{ uri: text(category.imageUrl) || text(category.image) }}
                      style={styles.categoryImage}
                      contentFit="cover"
                    />
                  )}
                  <ThemedText type="smallBold">{text(category.title) || 'Categoria'}</ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold">{section.name}</ThemedText>
      <ThemedText themeColor="textSecondary">Seção recebida do Headless CMS.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8, padding: 16, borderRadius: 16, backgroundColor: '#fcfaf5' },
  // O hero escapa do padding horizontal usado pelos demais blocos da home.
  heroSection: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, backgroundColor: '#fcfaf5' },
  heroViewport: { position: 'relative', width: '100%', height: Dimensions.get('window').height },
  heroCarousel: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { textDecorationLine: 'underline', fontSize: 13 },
  tabList: { gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#111111' },
  selectedTab: { backgroundColor: '#111111' },
  selectedTabText: { color: '#FFFFFF' },
  productList: { gap: 12 },
  plpSection: { gap: Spacing.three, backgroundColor: '#fcfaf5' },
  plpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  plpHeading: { flex: 1 },
  plpTitle: { fontSize: 18 },
  plpCount: { fontSize: 12 },
  filterButton: { minHeight: 42, paddingHorizontal: Spacing.three, borderRadius: 22, borderWidth: 1, borderColor: '#6d6862', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, backgroundColor: '#FFFFFF' },
  filterButtonText: { fontSize: 12 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridProductCard: { width: '48.7%', marginBottom: Spacing.three },
  loadMoreButton: { minHeight: 48, marginTop: Spacing.two, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e120d' },
  loadMoreText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.7 },
  categoryList: { gap: 8 },
  categoryCard: { width: 150, padding: 8, gap: 8, borderRadius: 6, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  categoryImage: { width: 134, height: 110, borderRadius: 10 },
  banner: { overflow: 'hidden', borderRadius: 16, minHeight: 180 },
  bannerImage: { width: '100%', height: 180 },
  heroBanner: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, minHeight: Dimensions.get('window').height, borderRadius: 0 },
  heroImage: { width: '100%', height: Dimensions.get('window').height },
  heroDots: { position: 'absolute', left: 0, right: 0, bottom: 88, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c8c4be' },
  activeDot: { width: 20, backgroundColor: '#1e120d' },
  overlay: {
    position: 'absolute',
    left: 16,
    bottom: 16,
  },
  overlayTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  overlaySubtitle: { color: '#FFFFFF', fontSize: 14, marginTop: 4 },
  tileStack: { gap: 12 },
  contentRow: { flexDirection: 'row', gap: 12 },
  contentCard: { width: 190, gap: 8, padding: 10, borderRadius: 14, backgroundColor: '#FFFFFF' },
  contentCardImage: { width: 170, height: 130, borderRadius: 10 },
  scheduleCard: { flex: 1, minWidth: 130, gap: 6, padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' },
  couponCard: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e0ddd7' },
  couponCode: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1e120d', color: '#FFFFFF', fontWeight: '700' },
});

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { getProductFacets, Product, searchProductListing, searchProducts, type CatalogFacet, type SelectedFacet } from '@/services/catalog';
import { CmsSection } from '@/services/cms';
import { buildCmsActionRoute, readCmsAction, type CmsAction } from '@/services/cms-actions';
import { isFavorite } from '@/services/favorites';

import ArrowLeftIAIcon from './icons/ArrowLeftIAicon';
import ArrowRightAIcon from './icons/ArrowRightAicon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import { ProductCard } from './product-card';
import { ProductCarousel } from './product-carousel';
import { FilterGlyph, ProductFilterModal } from './product-filter-modal';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type Props = { section: CmsSection; categoryPageSlug?: string };

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function slugPart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isGenericCategoryTitle(value: string) {
  return /^(categorias|todas categorias|category|categories)$/i.test(value.trim());
}

function categoryTitleFromSlug(value: string) {
  const slug = value.replace(/^categ-/i, '').replace(/[-_]+/g, ' ').trim();
  if (!slug) return '';
  return slug.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function openCmsAction(router: ReturnType<typeof useRouter>, value: unknown, fallbackTitle?: string) {
  const action = readCmsAction(value);
  const effectiveAction: CmsAction = action.type && action.type !== 'none'
    ? action
    : fallbackTitle
      ? { ...action, type: 'category', value: action.value || fallbackTitle }
      : action;
  const target = effectiveAction.value?.trim() ?? '';
  if (!target || !effectiveAction.type || effectiveAction.type === 'none') return;

  const route = buildCmsActionRoute(effectiveAction);
  if (route) {
    router.push(route as never);
    return;
  }

  if (effectiveAction.type === 'link') {
    if (/^https?:\/\//i.test(target)) Linking.openURL(target);
    else router.push((target.startsWith('/') ? target : `/${target}`) as never);
  }
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

type ProductShelfProps = {
  data: Record<string, unknown>;
  titleStyle?: StyleProp<TextStyle>;
  onAdded?: (product: Product) => void;
  showAddedModal?: boolean;
};

export function ProductShelf({ data, titleStyle, onAdded, showAddedModal = true }: ProductShelfProps) {
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
        <ThemedText type="subtitle" style={titleStyle}>{text(data.title) || 'Produtos'}</ThemedText>
        {data.showSeeAll !== false && (
          <Pressable onPress={() => router.push(`/search?q=${encodeURIComponent(text(activeConfig.term) || text(activeConfig.query))}` as never)}>
            <ThemedText style={styles.seeAll}>Ver tudo</ThemedText>
          </Pressable>
        )}
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
      {loading && <ActivityIndicator color="#0a0a0a" />}
      {!loading && products.length === 0 && (
        <ThemedText themeColor="textSecondary">Nenhum produto encontrado.</ThemedText>
      )}
      <ProductCarousel
        products={products}
        favoriteIds={favoriteIds}
        onFavoriteChange={(product, favorite) => setFavoriteIds((current) => favorite ? Array.from(new Set([...current, product.id])) : current.filter((id) => id !== product.id))}
        onAdded={onAdded}
        showAddedModal={showAddedModal}
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
      {loading && <ActivityIndicator color="#0a0a0a" />}
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

function categoryListItems(data: Record<string, unknown>) {
  const content = Array.isArray(data.content) ? data.content : [];
  if (content.length > 0) return content;

  const shelves = Array.isArray(data.shelves) ? data.shelves : [];
  return shelves.flatMap((shelf) => {
    if (!shelf || typeof shelf !== 'object') return [];
    const shelfContent = (shelf as Record<string, unknown>).content;
    return Array.isArray(shelfContent) ? shelfContent : [];
  });
}

function CategorySwipeRow({ category, onPress }: { category: Record<string, unknown>; onPress: () => void }) {
  const title = text(category.title) || 'Categoria';
  const icon = text(category.icon) || text(category.imageUrl);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.categorySwipeRow, pressed && styles.pressed]}>
      {!!icon && <Image source={{ uri: icon }} style={styles.categorySwipeIcon} contentFit="contain" />}
      <ThemedText style={styles.categorySwipeRowTitle} numberOfLines={1}>{title}</ThemedText>
      <ArrowRightAIcon color="#0a0a0a" size={20} />
    </Pressable>
  );
}

function CategorySwipeSection({ data, router }: { data: Record<string, unknown>; router: ReturnType<typeof useRouter> }) {
  const categories = categoryListItems(data).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
  const [selectedCategory, setSelectedCategory] = useState<Record<string, unknown> | null>(null);
  const sectionTitle = text(data.title).trim();

  if (categories.length === 0) return null;

  const openCategory = (category: Record<string, unknown>) => {
    const subcategories = Array.isArray(category.subcategories) ? category.subcategories : [];
    if (subcategories.length > 0) {
      setSelectedCategory(category);
      return;
    }
    openCmsAction(router, category.action, text(category.title) || 'Categoria');
  };

  const selectedTitle = text(selectedCategory?.title) || 'Categoria';
  const selectedAction = readCmsAction(selectedCategory?.action);
  const selectedSubcategories = Array.isArray(selectedCategory?.subcategories)
    ? selectedCategory.subcategories.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : [];
  const selectedActionTarget = selectedAction.value
    ? selectedAction.value.replace(/\/$/, '')
    : '';

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle">{sectionTitle || 'Todas categorias'}</ThemedText>
      <View style={styles.categorySwipePanel}>
        {categories.map((item, index) => (
          <CategorySwipeRow
            key={`${text(item.title) || 'categoria'}-${index}`}
            category={item}
            onPress={() => openCategory(item)}
          />
        ))}
      </View>

      <Modal
        visible={Boolean(selectedCategory)}
        animationType="slide"
        onRequestClose={() => setSelectedCategory(null)}>
        <View style={styles.categoryModal}>
          <View style={styles.categoryModalHeader}>
            <Pressable
              accessibilityLabel="Voltar para categorias"
              onPress={() => setSelectedCategory(null)}
              style={styles.categoryModalBack}>
              <ArrowLeftIAIcon color="#0a0a0a" size={22} />
            </Pressable>
            <ThemedText style={styles.categoryModalTitle}>{selectedTitle}</ThemedText>
            <View style={styles.categoryModalBack} />
          </View>

          <ScrollView contentContainerStyle={styles.categoryModalList}>
            {!!selectedAction.value && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedCategory(null);
                  openCmsAction(router, selectedCategory?.action, `Ver tudo em ${selectedTitle}`);
                }}
                style={({ pressed }) => [styles.categoryModalItem, pressed && styles.pressed]}>
                <ThemedText style={styles.categoryModalItemText}>Ver tudo em {selectedTitle}</ThemedText>
                <ArrowRightAIcon color="#0a0a0a" size={18} />
              </Pressable>
            )}

            {selectedSubcategories.map((subcategory, index) => {
              const subcategoryTitle = text(subcategory.title) || `Subcategoria ${index + 1}`;
              const fallbackTarget = selectedActionTarget
                ? `${selectedActionTarget}/${slugPart(subcategoryTitle)}`
                : subcategoryTitle;
              const icon = text(subcategory.icon) || text(subcategory.imageUrl);

              return (
                <Pressable
                  key={`${subcategoryTitle}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedCategory(null);
                    openCmsAction(router, subcategory.action, fallbackTarget);
                  }}
                  style={({ pressed }) => [styles.categoryModalItem, pressed && styles.pressed]}>
                  <View style={styles.categoryModalItemContent}>
                    {!!icon && <Image source={{ uri: icon }} style={styles.categoryModalIcon} contentFit="contain" />}
                    <ThemedText style={styles.categoryModalItemText}>{subcategoryTitle}</ThemedText>
                  </View>
                  <ArrowRightAIcon color="#0a0a0a" size={18} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </ThemedView>
  );
}

function CategoryRow({ category, router }: { category: Record<string, unknown>; router: ReturnType<typeof useRouter> }) {
  const title = text(category.title) || 'Categoria';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openCmsAction(router, category.action, title)}
      style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}>
      <ThemedText style={styles.categoryRowTitle}>{title}</ThemedText>
      <ArrowRightAIcon color="#0a0a0a" size={20} />
    </Pressable>
  );
}

function CategoryGroup({
  category,
  router,
  initiallyExpanded,
  subcategoryHeading,
  showBack,
}: {
  category: Record<string, unknown>;
  router: ReturnType<typeof useRouter>;
  initiallyExpanded: boolean;
  subcategoryHeading?: string;
  showBack?: boolean;
}) {
  const title = text(category.title) || 'Categoria';
  const action = readCmsAction(category.action);
  const subcategories = Array.isArray(category.subcategories)
    ? category.subcategories.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : [];
  const [expanded, setExpanded] = useState(initiallyExpanded);

  return (
    <ThemedView style={styles.categoryGroup}>
      <View style={styles.categoryGroupHeader}>
        {showBack && (
          <Pressable
            accessibilityLabel="Voltar para categorias"
            onPress={() => router.back()}
            style={styles.categoryGroupBack}>
            <ArrowLeftIAIcon color="#0a0a0a" size={20} />
          </Pressable>
        )}
        <ThemedText style={styles.categoryGroupTitle}>{title}</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => openCmsAction(router, action, title)}
          style={styles.seeAllButton}>
          <ThemedText style={styles.seeAllButtonText}>Ver tudo</ThemedText>
        </Pressable>
      </View>
      {subcategories.length > 0 && (
        <View style={styles.subcategoryBlock}>
          {!!subcategoryHeading && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded((current) => !current)}
              style={styles.subcategoryHeader}>
              <ThemedText style={styles.subcategoryHeading}>{subcategoryHeading}</ThemedText>
              <View style={[styles.subcategoryChevron, expanded && styles.subcategoryChevronExpanded]}>
                <ChevronRightIcon color="#0a0a0a" size={18} />
              </View>
            </Pressable>
          )}
          {expanded && (
            <View style={styles.subcategoryList}>
              {subcategories.map((subcategory, index) => {
                const subcategoryTitle = text(subcategory.title) || `Modelo ${index + 1}`;
                const subcategoryAction = readCmsAction(subcategory.action);
                const fallbackTarget = action.value
                  ? `${action.value.replace(/\/$/, '')}/${slugPart(subcategoryTitle)}`
                  : subcategoryTitle;
                return (
                  <Pressable
                    key={`${subcategoryTitle}-${index}`}
                    accessibilityRole="button"
                    onPress={() => openCmsAction(router, subcategoryAction, fallbackTarget)}
                    style={({ pressed }) => [styles.subcategoryRow, pressed && styles.pressed]}>
                    <ThemedText style={styles.subcategoryText}>{subcategoryTitle}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ThemedView>
  );
}

export function CmsSectionView({ section, categoryPageSlug }: Props) {
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

  useEffect(() => {
    if (!isHeroBanner || bannerImages.length < 2) return;
    const timer = setInterval(() => {
      const nextPage = heroIndex + 2;
      heroRef.current?.scrollTo({ x: nextPage * Dimensions.get('window').width, animated: true });
    }, 6000);
    return () => clearInterval(timer);
  }, [bannerImages.length, heroIndex, isHeroBanner]);

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
      const openBanner = () => openCmsAction(router, image.action);
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

  if (section.name === 'CategoryListSwipe') {
    return <CategorySwipeSection data={data} router={router} />;
  }

  if (section.name === 'CategoryAccordeon' || section.name === 'CategoryTree') {
    const categories = categoryListItems(data);
    const categoryItems = categories.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
    const hasSubcategories = categoryItems.some((category) => Array.isArray(category.subcategories) && category.subcategories.length > 0);
    const sectionTitle = text(data.title).trim();
    const slugTitle = categoryPageSlug ? categoryTitleFromSlug(categoryPageSlug) : '';
    const configuredParentTitle = text(data.parentTitle) || text(data.categoryTitle);
    const parentTitle = configuredParentTitle || slugTitle || '';
    const isDetailSection = Boolean(categoryItems.length > 0 && !hasSubcategories && section.name !== 'CategoryTree' && (
      section.name === 'CategoryAccordeon' || sectionTitle && !isGenericCategoryTitle(sectionTitle)
    ));
    const detailAction = readCmsAction(data.action);
    const detailTitle = parentTitle || sectionTitle || 'Categoria';
    const detailCategory = isDetailSection
      ? {
          title: detailTitle,
          action: detailAction.value
            ? detailAction
            : { type: 'category', value: text(data.categoryPath) || text(data.path) || `/${slugPart(detailTitle)}` },
          subcategories: categoryItems,
        }
      : null;
    const displayedCategories = detailCategory ? [detailCategory] : categoryItems;
    const initiallyExpanded = data.isExpanded !== false;
    const configuredSubcategoryHeading = section.name === 'CategoryAccordeon'
      ? sectionTitle
      : text(data.subcategoryTitle);
    const sectionHeading = !isDetailSection && section.name === 'CategoryTree' ? sectionTitle : '';

    return (
      <ThemedView style={styles.section}>
        {!!sectionHeading && <ThemedText type="subtitle">{sectionHeading}</ThemedText>}
        <View style={[styles.categoryList, (hasSubcategories || isDetailSection || section.name === 'CategoryAccordeon') && styles.categoryGroupsList]}>
          {displayedCategories.map((category, index) => (hasSubcategories || isDetailSection || section.name === 'CategoryAccordeon')
            ? <CategoryGroup key={`${text(category.title)}-${index}`} category={category} router={router} initiallyExpanded={initiallyExpanded} subcategoryHeading={configuredSubcategoryHeading} showBack={Boolean(categoryPageSlug && isDetailSection)} />
            : <CategoryRow key={`${text(category.title)}-${index}`} category={category} router={router} />)}
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
  section: { gap: 8, padding: 16, borderRadius: 16, backgroundColor: '#ffffff' },
  // O hero escapa do padding horizontal usado pelos demais blocos da home.
  heroSection: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, backgroundColor: '#ffffff' },
  heroViewport: { position: 'relative', width: '100%', height: Dimensions.get('window').height },
  heroCarousel: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seeAll: { textDecorationLine: 'underline', fontSize: 13 },
  tabList: { gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#111111' },
  selectedTab: { backgroundColor: '#111111' },
  selectedTabText: { color: '#FFFFFF' },
  plpSection: { gap: Spacing.three, backgroundColor: '#ffffff' },
  plpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  plpHeading: { flex: 1 },
  plpTitle: { fontSize: 18 },
  plpCount: { fontSize: 12 },
  filterButton: { minHeight: 42, paddingHorizontal: Spacing.three, borderRadius: 22, borderWidth: 1, borderColor: '#6d6862', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, backgroundColor: '#FFFFFF' },
  filterButtonText: { fontSize: 12 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridProductCard: { width: '48.7%', marginBottom: Spacing.three },
  loadMoreButton: { minHeight: 48, marginTop: Spacing.two, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  loadMoreText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.7 },
  categorySwipePanel: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: '#eeeae5', backgroundColor: '#FFFFFF' },
  categorySwipeRow: { minHeight: 68, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: '#eeeae5', backgroundColor: '#FFFFFF' },
  categorySwipeIcon: { width: 28, height: 28, borderRadius: 6 },
  categorySwipeRowTitle: { flex: 1, fontSize: 20, lineHeight: 26, color: '#0a0a0a', fontWeight: '500', textTransform: 'uppercase' },
  categoryModal: { flex: 1, padding: 16, backgroundColor: '#FFFFFF' },
  categoryModalHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#eeeae5' },
  categoryModalBack: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  categoryModalTitle: { flex: 1, fontSize: 20, lineHeight: 26, color: '#0a0a0a', fontWeight: '700', textAlign: 'center' },
  categoryModalList: { gap: 10, paddingVertical: 16 },
  categoryModalItem: { minHeight: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#eeeae5' },
  categoryModalItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryModalIcon: { width: 28, height: 28, borderRadius: 6 },
  categoryModalItemText: { flex: 1, fontSize: 16, lineHeight: 22, color: '#0a0a0a' },
  categoryList: { gap: 0, overflow: 'hidden', borderRadius: 24, backgroundColor: '#FFFFFF' },
  categoryGroupsList: { gap: 12, overflow: 'visible', backgroundColor: 'transparent' },
  categoryRow: { minHeight: 72, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eeeae5' },
  categoryRowTitle: { fontSize: 22, lineHeight: 28, color: '#0a0a0a', fontWeight: '500' },
  categoryGroup: { gap: 14, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF' },
  categoryGroupHeader: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  categoryGroupBack: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  categoryGroupTitle: { flex: 1, fontSize: 24, lineHeight: 30, color: '#0a0a0a' },
  seeAllButton: { minHeight: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: '#6d6862', alignItems: 'center', justifyContent: 'center' },
  seeAllButtonText: { fontSize: 13, lineHeight: 18, color: '#0a0a0a' },
  subcategoryBlock: { borderTopWidth: 1, borderTopColor: '#eeeae5' },
  subcategoryHeader: { minHeight: 52, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subcategoryHeading: { fontSize: 16, lineHeight: 22, color: '#0a0a0a', fontWeight: '700' },
  subcategoryChevron: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  subcategoryChevronExpanded: { transform: [{ rotate: '90deg' }] },
  subcategoryList: { gap: 10 },
  subcategoryRow: { minHeight: 46, paddingHorizontal: 12, justifyContent: 'center', borderLeftWidth: 2, borderLeftColor: '#e2ded8' },
  subcategoryText: { fontSize: 16, lineHeight: 22, color: '#625d57' },
  banner: { overflow: 'hidden', borderRadius: 16, minHeight: 180 },
  bannerImage: { width: '100%', height: 180 },
  heroBanner: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, minHeight: Dimensions.get('window').height, borderRadius: 0 },
  heroImage: { width: '100%', height: Dimensions.get('window').height },
  heroDots: { position: 'absolute', left: 0, right: 0, bottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  activeDot: { width: 20, backgroundColor: '#fff' },
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
  couponCode: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#0a0a0a', color: '#FFFFFF', fontWeight: '700' },
});

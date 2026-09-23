import { BlurTargetView, BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, View, type ImageStyle, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { subscribeAccountSession } from '@/services/auth';
import { getProductFacets, Product, searchProductListing, searchProducts, type CatalogFacet, type SelectedFacet } from '@/services/catalog';
import { CmsSection } from '@/services/cms';
import { buildCmsActionRoute, readCmsAction, type CmsAction } from '@/services/cms-actions';
import { cmsInternalRoute, openCmsExternalLink } from '@/services/cms-links';
import { isFavorite } from '@/services/favorites';

import { AnimatedPaginationDots } from './animated-pagination-dots';
import { CmsRichText } from './cms-rich-text';
import ArrowLeftIAIcon from './icons/ArrowLeftIAicon';
import ArrowRightAIcon from './icons/ArrowRightAicon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import { ProductCarousel } from './product-carousel';
import { ProductCarouselSkeleton } from './product-carousel-skeleton';
import { FilterGlyph, ProductFilterModal } from './product-filter-modal';
import { ProductGridSkeleton } from './product-grid-skeleton';
import { ProductPlpGrid } from './product-plp-grid';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { WiddeHomeVideoCarousel } from './widde-home-video-carousel';

type Props = { section: CmsSection; categoryPageSlug?: string; isHome?: boolean };

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

type BannerDisplayMode = 'SliderHero' | 'SingleBanner' | 'BannerList' | 'RoundedBannerList' | 'GridList' | 'FitOnScreen';

type BannerRenderOptions = {
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  aspectRatioKey?: string;
};

function bannerDisplayMode(value: unknown): BannerDisplayMode {
  switch (text(value).trim()) {
    case 'SingleBanner': return 'SingleBanner';
    case 'BannerList': return 'BannerList';
    case 'RoundedBannerList': return 'RoundedBannerList';
    case 'GridList': return 'GridList';
    case 'FitOnScreen': return 'FitOnScreen';
    case 'SliderHero': return 'SliderHero';
    // Mantém compatibilidade com configurações antigas publicadas antes do
    // campo de modo receber os valores atuais do Headless CMS.
    case 'carousel': return 'BannerList';
    case 'scroll': return 'FitOnScreen';
    default: return 'SliderHero';
  }
}

function bannerRatio(value: unknown, fallback: number) {
  const raw = typeof value === 'number' ? String(value) : text(value).trim();
  if (!raw) return fallback;

  const parts = raw.split(/[:/]/).map(Number);
  if (parts.length === 2 && parts.every((part) => Number.isFinite(part) && part > 0)) return parts[0] / parts[1];

  const ratio = Number(raw);
  return Number.isFinite(ratio) && ratio > 0 ? ratio : fallback;
}

function bannerDimension(value: unknown, fallback: number) {
  const dimension = typeof value === 'number' ? value : Number(text(value));
  return Number.isFinite(dimension) && dimension > 0 ? dimension : fallback;
}

type BannerButtonPosition = 'topLeft' | 'topCenter' | 'topRight' | 'centerLeft' | 'center' | 'centerRight' | 'bottomLeft' | 'bottomCenter' | 'bottomRight';
type BannerPercentage = `${number}%`;

type BannerButtonPositionConfig = {
  top: BannerPercentage;
  left: BannerPercentage;
  legacy?: BannerButtonPosition;
};

type BannerButtonConfig = {
  label: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  borderWidth: number;
  fontSize: number;
  width: number;
  height: number;
  blurRadius: number;
  paddingHorizontal: number;
  paddingVertical: number;
  position: BannerButtonPositionConfig;
};

type BannerBlurTargetRef = { current: View | null };

const bannerButtonPositions: BannerButtonPosition[] = [
  'topLeft',
  'topCenter',
  'topRight',
  'centerLeft',
  'center',
  'centerRight',
  'bottomLeft',
  'bottomCenter',
  'bottomRight',
];

const bannerHexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const bannerFunctionColorPattern = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function bannerColor(value: unknown, fallback: string) {
  const color = text(value).trim();
  if (bannerHexColorPattern.test(color)) return color;

  const match = color.match(bannerFunctionColorPattern);
  if (!match) return fallback;

  const isRgba = color.slice(0, 4).toLowerCase() === 'rgba';
  const hasAlpha = typeof match[4] === 'string';
  if (isRgba !== hasAlpha) return fallback;

  const channels = match.slice(1, 4).map(Number);
  if (channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) return fallback;

  if (hasAlpha) {
    const alpha = Number(match[4]);
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return fallback;
  }

  return color;
}

function bannerNumber(source: Record<string, unknown>, key: string, fallback: number, minimum: number, maximum: number) {
  const value = source[key];
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function bannerBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.trim().toLowerCase() === 'true') return true;
    if (value.trim().toLowerCase() === 'false') return false;
  }
  return fallback;
}

function bannerPercentage(value: unknown, fallback: BannerPercentage): BannerPercentage {
  const raw = typeof value === 'number' ? `${value}%` : text(value).trim();
  const normalized = raw.endsWith('%') ? raw.slice(0, -1).trim() : raw;
  if (!normalized) return fallback;
  const percentage = Number(normalized);
  if (!Number.isFinite(percentage)) return fallback;
  return `${Math.min(100, Math.max(0, percentage))}%` as BannerPercentage;
}

function bannerButtonConfig(value: unknown): BannerButtonConfig | null {
  const source = record(value);
  if (!source || !bannerBoolean(source.enabled, false)) return null;

  const label = text(source.label).trim();
  if (!label) return null;

  const padding = record(source.padding);
  const fallbackPaddingHorizontal = bannerNumber(source, 'paddingHorizontal', 24, 0, 100);
  const fallbackPaddingVertical = bannerNumber(source, 'paddingVertical', 10, 0, 100);
  const positionSource = record(source.position);
  const legacyPosition = text(source.position) as BannerButtonPosition;
  const top = positionSource
    ? bannerPercentage(positionSource.top, '70%')
    : bannerPercentage(source.top, '70%');
  const left = positionSource
    ? bannerPercentage(positionSource.left, '30%')
    : bannerPercentage(source.left, '30%');

  return {
    label,
    backgroundColor: bannerColor(source.backgroundColor, '#FFFFFF'),
    textColor: bannerColor(source.textColor, '#0A0A0A'),
    borderColor: bannerColor(source.borderColor, '#FFFFFF'),
    borderWidth: bannerNumber(source, 'borderWidth', 0, 0, 8),
    fontSize: bannerNumber(source, 'fontSize', 14, 8, 48),
    width: bannerNumber(source, 'width', 0, 0, 1000),
    height: bannerNumber(source, 'height', 0, 0, 300),
    blurRadius: bannerNumber(source, 'blurRadius', 0, 0, 20),
    paddingHorizontal: padding
      ? bannerNumber(padding, 'horizontal', fallbackPaddingHorizontal, 0, 100)
      : fallbackPaddingHorizontal,
    paddingVertical: padding
      ? bannerNumber(padding, 'vertical', fallbackPaddingVertical, 0, 100)
      : fallbackPaddingVertical,
    position: {
      top,
      left,
      legacy: bannerButtonPositions.includes(legacyPosition) ? legacyPosition : undefined,
    },
  };
}

function bannerButtonPositionStyle(position: BannerButtonPositionConfig, isHero: boolean): ViewStyle {
  if (!position.legacy) {
    // A largura mínima cria um ponto de ancoragem. O botão fica centralizado
    // nesse ponto, então left: 50% representa o centro real do botão.
    return { top: position.top, left: position.left, width: 1, alignItems: 'center' };
  }

  const horizontalInset = 16;
  const topInset = isHero ? 72 : 16;
  const bottomInset = isHero ? 110 : 16;

  switch (position.legacy) {
    case 'topLeft': return { top: topInset, left: horizontalInset };
    case 'topCenter': return { top: topInset, left: 0, right: 0, alignItems: 'center' };
    case 'topRight': return { top: topInset, right: horizontalInset };
    case 'centerLeft': return { top: 0, bottom: 0, left: horizontalInset, justifyContent: 'center' };
    case 'center': return { top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' };
    case 'centerRight': return { top: 0, right: horizontalInset, bottom: 0, justifyContent: 'center' };
    case 'bottomLeft': return { bottom: bottomInset, left: horizontalInset };
    case 'bottomRight': return { bottom: bottomInset, right: horizontalInset };
    case 'bottomCenter': return { right: 0, bottom: bottomInset, left: 0, alignItems: 'center' };
  }
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
    const internalRoute = cmsInternalRoute(target);
    if (internalRoute) router.push(internalRoute as never);
    else if (/^(?:https?:\/\/|\/\/|mailto:|tel:|sms:)/i.test(target)) void openCmsExternalLink(target);
    else router.push((target.startsWith('/') ? target : `/${target}`) as never);
  }
}

type ProductShelfProps = {
  data: Record<string, unknown>;
  isHome?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  onAdded?: (product: Product) => void;
  onFavoriteChange?: (product: Product, favorite: boolean) => void;
  showAddedModal?: boolean;
};

export function ProductShelf({ data, isHome = false, titleStyle, onAdded, onFavoriteChange, showAddedModal = true }: ProductShelfProps) {
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

  useEffect(() => {
    const unsubscribe = subscribeAccountSession((session) => {
      if (!session?.email) setFavoriteIds([]);
    });
    return () => { unsubscribe(); };
  }, []);

  return (
    <ThemedView style={[styles.section, isHome ? styles.homeProductShelfSection : styles.productShelfSection]}>
      <View style={styles.sectionHeader}>
        <ThemedText type="subtitle" style={[isHome && styles.homeShelfTitle, titleStyle]}>{text(data.title) || 'Produtos'}</ThemedText>
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
          style={isHome ? styles.homeTabViewport : undefined}
          contentContainerStyle={[styles.tabList, isHome && styles.homeTabList]}
          renderItem={({ item: tab, index }) => (
            <Pressable onPress={() => setSelectedTab(index)} style={[styles.tab, isHome && styles.homeTab, selectedTab === index && styles.selectedTab]}>
              <ThemedText style={[isHome && styles.homeTabText, selectedTab === index && styles.selectedTabText]}>{text(tab.label) || `Opcao ${index + 1}`}</ThemedText>
            </Pressable>
          )}
        />
      )}
      {loading && <ProductCarouselSkeleton variant={isHome ? 'home' : 'default'} />}
      {!loading && products.length === 0 && (
        <ThemedText themeColor="textSecondary">Nenhum produto encontrado.</ThemedText>
      )}
      {!loading && products.length > 0 && (
        <ProductCarousel
          products={products}
          variant={isHome ? 'home' : 'default'}
          favoriteIds={favoriteIds}
          onFavoriteChange={(product, favorite) => {
            setFavoriteIds((current) => favorite ? Array.from(new Set([...current, product.id])) : current.filter((id) => id !== product.id));
            onFavoriteChange?.(product, favorite);
          }}
          onAdded={onAdded}
          showAddedModal={showAddedModal}
        />
      )}
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

  useEffect(() => {
    const unsubscribe = subscribeAccountSession((session) => {
      if (!session?.email) setFavoriteIds([]);
    });
    return () => { unsubscribe(); };
  }, []);

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
      {loading && <ProductGridSkeleton variant="plp" />}
      {!loading && products.length === 0 && <ThemedText themeColor="textSecondary">Nenhum produto encontrado.</ThemedText>}
      {!loading && <ProductPlpGrid
        products={products}
        favoriteIds={favoriteIds}
        onFavoriteChange={(product, favorite) => setFavoriteIds((current) => favorite ? Array.from(new Set([...current, product.id])) : current.filter((id) => id !== product.id))}
      />}
      {loadingMore && <ProductGridSkeleton variant="plp" />}
      {products.length < resultCount && !loading && !loadingMore && <Pressable onPress={loadMore} style={styles.loadMoreButton}><ThemedText style={styles.loadMoreText}>Ver mais produtos</ThemedText></Pressable>}
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
    else if (action.type === 'link') {
      const internalRoute = cmsInternalRoute(action.value);
      if (internalRoute) router.push(internalRoute as never);
      else void openCmsExternalLink(action.value);
    }
  }
  return <Pressable onPress={open}><ThemedView style={styles.contentCard}>{!!imageUrl && <Image source={{ uri: imageUrl }} style={styles.contentCardImage} contentFit="cover" />}<ThemedText type="smallBold">{title || 'Conteúdo'}</ThemedText>{!!description && <ThemedText themeColor="textSecondary" numberOfLines={3}>{description}</ThemedText>}</ThemedView></Pressable>;
}

function StreamShopBanner({ data }: { data: Record<string, unknown> }) {
  const content = Array.isArray(data.content) ? data.content : [];
  return <ThemedView style={[styles.section, styles.streamShopSection]}><ThemedText type="subtitle">{text(data.title) || 'Ao vivo'}</ThemedText><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contentRow}>{content.map((item, index) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return <ContentCard key={index} title={text(value.title)} description={text(value.description)} imageUrl={text(value.imageUrl) || text(value.thumbnail) || text(value.image)} action={value.action as { type?: string; value?: string } | undefined} />; })}</ScrollView></ThemedView>;
}

function ProductTiles({ data, isHome = false }: { data: Record<string, unknown>; isHome?: boolean }) {
  const shelves = Array.isArray(data.shelves) ? data.shelves.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
  return <View style={styles.tileStack}>{shelves.length ? shelves.map((shelf, index) => <ProductShelf key={index} data={shelf} isHome={isHome} />) : <ProductShelf data={data} isHome={isHome} />}</View>;
}

function ScheduleCardShelf({ data }: { data: Record<string, unknown> }) {
  const shelves = Array.isArray(data.shelves) ? data.shelves : [];
  return <ThemedView style={[styles.section, styles.scheduleSection]}><ThemedText type="subtitle">{text(data.title) || 'Agenda'}</ThemedText><View style={styles.contentRow}>{shelves.map((item, index) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return <ThemedView key={index} style={styles.scheduleCard}><ThemedText themeColor="textSecondary">{text(value.date)}</ThemedText><ThemedText type="smallBold">{text(value.title)}</ThemedText><ThemedText themeColor="textSecondary">{text(value.description)}</ThemedText></ThemedView>; })}</View></ThemedView>;
}

function CouponsList({ data }: { data: Record<string, unknown> }) {
  const coupons = Array.isArray(data.coupons) ? data.coupons : [];
  return <ThemedView style={[styles.section, styles.couponsSection]}><ThemedText type="subtitle">Cupons</ThemedText>{coupons.map((item, index) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return <ThemedView key={index} style={styles.couponCard}><ThemedText type="smallBold">{text(value.title) || 'Cupom'}</ThemedText><ThemedText themeColor="textSecondary">{text(value.description)}</ThemedText><ThemedText style={styles.couponCode}>{text(value.code)}</ThemedText>{!!text(value.expiresAt) && <ThemedText themeColor="textSecondary">Válido até {text(value.expiresAt)}</ThemedText>}</ThemedView>; })}</ThemedView>;
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

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.categorySwipeRow, pressed && styles.pressed]}>
      <ThemedText style={styles.categorySwipeRowTitle} numberOfLines={1}>{title}</ThemedText>
			<ArrowRightAIcon color="#0a0a0a" size={16} />
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
    <ThemedView style={styles.categoryMenuSection}>
      <ThemedText style={styles.sectionTitleCateg} type="subtitle">{sectionTitle || 'Todas categorias'}</ThemedText>
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
              return (
                <Pressable
                  key={`${subcategoryTitle}-${index}`}
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedCategory(null);
                    openCmsAction(router, subcategory.action, fallbackTarget);
                  }}
                  style={({ pressed }) => [styles.categoryModalItem, pressed && styles.pressed]}>
                  <ThemedText style={styles.categoryModalItemText}>{subcategoryTitle}</ThemedText>
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

export function CmsSectionView({ section, categoryPageSlug, isHome = false }: Props) {
  const router = useRouter();
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRef = useRef<ScrollView | null>(null);
  const data = section.data ?? {};
  const bannerImages = section.name === 'MultipleImageBanner' && Array.isArray(data.images) ? data.images : [];
  const bannerMode = bannerDisplayMode(data.mode);
  const isHeroBanner = section.name === 'MultipleImageBanner' && bannerMode === 'SliderHero';
  const isFullScreenHero = isHome && isHeroBanner;
  const [bannerAspectRatios, setBannerAspectRatios] = useState<Record<string, number>>({});
  const loopedBannerImages = bannerImages.length > 1 ? [bannerImages[bannerImages.length - 1], ...bannerImages, bannerImages[0]] : bannerImages;
  const bannerBlurTargets = useRef<Record<string, BannerBlurTargetRef>>({});
  const getBannerBlurTarget = (key: string) => {
    const current = bannerBlurTargets.current[key];
    if (current) return current;
    const target: BannerBlurTargetRef = { current: null };
    bannerBlurTargets.current[key] = target;
    return target;
  };
  const rememberBannerAspectRatio = (key: string, event: { source?: unknown }) => {
    const source = record(event.source);
    const width = source ? Number(source.width) : 0;
    const height = source ? Number(source.height) : 0;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    const ratio = width / height;
    setBannerAspectRatios((current) => current[key] === ratio ? current : { ...current, [key]: ratio });
  };

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

  // A configuração global pode ser publicada dentro da Home durante a fase
  // de teste, mas nunca deve aparecer como conteúdo visual da página.
  if (section.name === 'BottomTabSettings') return null;

  if (section.name === 'RichText') {
    return (
      <ThemedView style={[styles.section, styles.richTextSection]}>
        <CmsRichText data={data} />
      </ThemedView>
    );
  }

  if (section.name === 'MultipleImageBanner') {
    const images = bannerImages;
    if (images.length === 0) return null;

    const configuredAspectRatio = bannerRatio(data.aspectRatio, 4 / 3);
    const configuredBorderRadius = bannerDimension(data.borderRadius, 5);
    const ratioFor = (key: string, fallback: number) => bannerAspectRatios[key] ?? bannerRatio(data.aspectRatio, fallback);
    const homeBannerSectionStyle = !isHome
      ? undefined
      : bannerMode === 'GridList'
        ? styles.homeGridBannerSection
        : bannerMode === 'RoundedBannerList'
          ? styles.homeRoundedBannerSection
          : bannerMode === 'BannerList'
            ? styles.homeHorizontalBannerSection
            : bannerMode === 'SingleBanner'
              ? styles.homeSingleBannerSection
              : styles.homeSliderBannerSection;
    const homeBannerTitleStyle = !isHome
      ? undefined
      : bannerMode === 'GridList'
        ? styles.homeGridBannerTitle
        : bannerMode === 'RoundedBannerList'
          ? styles.homeRoundedBannerTitle
          : bannerMode === 'BannerList'
            ? styles.homeHorizontalBannerTitle
            : bannerMode === 'SingleBanner'
              ? styles.homeSingleBannerTitle
              : styles.homeSliderBannerTitle;
    const homeBannerOverlayTitleStyle = !isHome
      ? undefined
      : bannerMode === 'GridList'
        ? styles.homeGridBannerOverlayTitle
        : bannerMode === 'RoundedBannerList'
          ? styles.homeRoundedBannerOverlayTitle
          : bannerMode === 'BannerList'
            ? styles.homeHorizontalBannerOverlayTitle
            : bannerMode === 'SingleBanner'
              ? styles.homeSingleBannerOverlayTitle
              : styles.homeSliderBannerOverlayTitle;
    const homeBannerOverlaySubtitleStyle = !isHome
      ? undefined
      : bannerMode === 'GridList'
        ? styles.homeGridBannerOverlaySubtitle
        : bannerMode === 'RoundedBannerList'
          ? styles.homeRoundedBannerOverlaySubtitle
          : bannerMode === 'BannerList'
            ? styles.homeHorizontalBannerOverlaySubtitle
            : bannerMode === 'SingleBanner'
              ? styles.homeSingleBannerOverlaySubtitle
              : styles.homeSliderBannerOverlaySubtitle;

    const renderBanner = (item: unknown, index: number, options: BannerRenderOptions = {}) => {
      const image = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const imageUrl = text(image.imageUrl);
      if (!imageUrl) return null;
      const openBanner = () => openCmsAction(router, image.action);
      const button = bannerButtonConfig(image.button);
      const bannerKey = `${imageUrl}-${index}`;
      const blurTarget = getBannerBlurTarget(bannerKey);
      const loadedAspectRatio = options.aspectRatioKey ? bannerAspectRatios[options.aspectRatioKey] : undefined;
      return (
        <Pressable key={bannerKey} onPress={openBanner} style={[styles.banner, options.containerStyle, isFullScreenHero && styles.heroBanner]}>
          <BlurTargetView ref={blurTarget} style={styles.bannerTarget}>
            <Image
              source={{ uri: imageUrl }}
              onLoad={options.aspectRatioKey ? (event) => rememberBannerAspectRatio(options.aspectRatioKey!, event) : undefined}
              style={[styles.bannerImage, options.imageStyle, loadedAspectRatio ? { aspectRatio: loadedAspectRatio } : undefined, isFullScreenHero && styles.heroImage]}
              contentFit={options.contentFit ?? (isFullScreenHero ? 'cover' : 'contain')}
            />
            <View style={styles.overlay}>
              {!!text(image.overlayTitle) && <ThemedText style={[styles.overlayTitle, isHome && homeBannerOverlayTitleStyle]}>{text(image.overlayTitle)}</ThemedText>}
              {!!text(image.overlaySubtitle) && <ThemedText style={[styles.overlaySubtitle, isHome && homeBannerOverlaySubtitleStyle]}>{text(image.overlaySubtitle)}</ThemedText>}
            </View>
          </BlurTargetView>
          {button && (
            <View pointerEvents="box-none" style={[styles.bannerButtonPosition, bannerButtonPositionStyle(button.position, isFullScreenHero)]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={button.label}
                onPress={(event) => {
                  event.stopPropagation();
                  openBanner();
                }}
                style={({ pressed }) => [
                  styles.bannerButton,
                  {
                    borderColor: button.borderColor,
                    borderWidth: button.borderWidth,
                    paddingHorizontal: button.paddingHorizontal,
                    paddingVertical: button.paddingVertical,
                    ...(button.width > 0 ? { width: button.width } : {}),
                    ...(button.height > 0 ? { height: button.height } : {}),
                  },
                  pressed && styles.pressed,
                ]}>
                {button.blurRadius > 0 && (
                  <BlurView
                    pointerEvents="none"
                    blurTarget={blurTarget}
                    intensity={Math.min(100, Math.max(1, button.blurRadius * 5))}
                    tint="default"
                    blurMethod="dimezisBlurViewSdk31Plus"
                    style={styles.bannerButtonBlur}
                  />
                )}
                <View pointerEvents="none" style={[styles.bannerButtonColor, { backgroundColor: button.backgroundColor }]} />
                <ThemedText style={[styles.bannerButtonText, { color: button.textColor, fontSize: button.fontSize }]}>{button.label}</ThemedText>
              </Pressable>
            </View>
          )}
        </Pressable>
      );
    };

    const renderHeroContent = () => (
      <View style={isFullScreenHero ? styles.heroViewport : styles.bannerSliderViewport}>
        <ScrollView
          ref={heroRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={isFullScreenHero ? styles.heroCarousel : styles.bannerCarousel}
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
          {loopedBannerImages.map((item, index) => {
            if (isFullScreenHero) return renderBanner(item, index);
            const image = record(item) ?? {};
            const key = `${text(image.imageUrl)}-${index}`;
            return renderBanner(item, index, {
              containerStyle: { width: Dimensions.get('window').width, minHeight: 0 },
              imageStyle: { width: '100%', aspectRatio: ratioFor(key, configuredAspectRatio) },
              contentFit: 'contain',
              aspectRatioKey: key,
            });
          })}
        </ScrollView>
        {images.length > 1 && (
          <AnimatedPaginationDots
            count={images.length}
            activeIndex={heroIndex}
            activeWidth={20}
            activeColor="#FFFFFF"
            inactiveColor="#FFFFFF"
            dotSize={6}
            gap={6}
            accessibilityLabel={`Banner ${heroIndex + 1} de ${images.length}`}
            style={styles.heroDots}
          />
        )}
      </View>
    );

    const renderModeContent = () => {
      if (bannerMode === 'SliderHero') return renderHeroContent();

      if (bannerMode === 'SingleBanner') {
        const firstImage = record(images[0]) ?? {};
        const firstKey = `${text(firstImage.imageUrl)}-0`;
        return renderBanner(images[0], 0, {
          containerStyle: { minHeight: 0, borderRadius: configuredBorderRadius },
          imageStyle: { width: '100%', aspectRatio: ratioFor(firstKey, configuredAspectRatio) },
          contentFit: 'contain',
          aspectRatioKey: firstKey,
        });
      }

      if (bannerMode === 'BannerList') {
        const size = record(data.size) ?? {};
        const cardWidth = bannerDimension(size.maxWidth, 254);
        const cardHeight = Math.round(cardWidth / bannerRatio(data.aspectRatio, cardWidth / bannerDimension(size.maxHeight, 328)));
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.bannerListRow, isHome && styles.homeHorizontalBannerListRow]}>
            {images.map((item, index) => renderBanner(item, index, {
              containerStyle: { width: cardWidth, height: cardHeight, minHeight: 0, borderRadius: configuredBorderRadius },
              imageStyle: { width: '100%', height: '100%' },
              contentFit: 'cover',
            }))}
          </ScrollView>
        );
      }

      if (bannerMode === 'RoundedBannerList') {
        const size = record(data.size) ?? {};
        const diameter = Math.min(bannerDimension(size.maxWidth, 200), bannerDimension(size.maxHeight, 200));
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.bannerListRow, isHome && styles.homeRoundedBannerListRow]}>
            {images.map((item, index) => {
              const image = record(item) ?? {};
              const title = readCmsAction(image.action).title || text(image.title);
              return (
                <View key={`${text(image.imageUrl)}-${index}`} style={[styles.roundedBannerItem, { width: diameter }]}>
                  {renderBanner(item, index, {
                    containerStyle: { width: diameter, height: diameter, minHeight: 0, borderRadius: diameter / 2 },
                    imageStyle: { width: '100%', height: '100%' },
                    contentFit: 'cover',
                  })}
                  {!!title && <ThemedText numberOfLines={2} style={styles.roundedBannerItemTitle}>{title}</ThemedText>}
                </View>
              );
            })}
          </ScrollView>
        );
      }

      if (bannerMode === 'GridList') {
        return (
          <View style={[styles.bannerGrid, isHome && styles.homeGridBanner]}>
            {images.map((item, index) => {
              const image = record(item) ?? {};
              const key = `${text(image.imageUrl)}-${index}`;
              return renderBanner(item, index, {
                containerStyle: { width: '48.5%', minHeight: 0, borderRadius: configuredBorderRadius },
                imageStyle: { width: '100%', aspectRatio: ratioFor(key, 1) },
                contentFit: 'contain',
                aspectRatioKey: key,
              });
            })}
          </View>
        );
      }

      // FitOnScreen mantém todos os banners em uma única linha e deixa cada
      // imagem definir sua altura pela proporção real retornada pelo servidor.
      return (
        <View style={styles.fitOnScreenRow}>
          {images.map((item, index) => {
            const image = record(item) ?? {};
            const key = `${text(image.imageUrl)}-${index}`;
            return renderBanner(item, index, {
              containerStyle: { flex: 1, minWidth: 0, minHeight: 0, borderRadius: configuredBorderRadius },
              imageStyle: { width: '100%', aspectRatio: ratioFor(key, 1) },
              contentFit: 'contain',
              aspectRatioKey: key,
            });
          })}
        </View>
      );
    };

    return (
      <View style={isFullScreenHero ? styles.heroSection : [styles.bannerSection, isHome && styles.homeBannerSection, isHome && homeBannerSectionStyle]}>
        {!!text(data.mainTitle) && <ThemedText type="subtitle" style={[styles.bannerSectionTitle, isHome && homeBannerTitleStyle]}>{text(data.mainTitle)}</ThemedText>}
        {renderModeContent()}
      </View>
    );
  }

  if (section.name === 'ProductShelf' || section.name === 'HighlightedProductShelf') {
    return <ProductShelf data={data} isHome={isHome} />;
  }

  if (section.name === 'ProductInfiniteScroll') return <ProductListingSection data={data} />;
  if (section.name === 'LastSeenProducts') return <ProductShelf data={data} isHome={isHome} />;

  if (section.name === 'ProductTiles') return <ProductTiles data={data} isHome={isHome} />;
  if (section.name === 'WiddeHomeVideoCarousel') return isHome ? <WiddeHomeVideoCarousel data={data} /> : null;
  if (section.name === 'StreamShopBanner') return <StreamShopBanner data={data} />;
  if (section.name === 'ScheduleCardShelf') return <ScheduleCardShelf data={data} />;
  if (section.name === 'CouponsList') return <CouponsList data={data} />;

  if (section.name === 'WordPressCardList') {
    const posts = Array.isArray(data.posts) ? data.posts : Array.isArray(data.content) ? data.content : [];
    const postUrl = text(data.postUrl);
    return <ThemedView style={[styles.section, styles.blogSection]}><View style={styles.sectionHeader}><ThemedText type="subtitle">{text(data.title) || 'Confira nosso blog'}</ThemedText>{!!postUrl && <Pressable onPress={() => { const internalRoute = cmsInternalRoute(postUrl); if (internalRoute) router.push(internalRoute as never); else void openCmsExternalLink(postUrl); }}><ThemedText style={styles.seeAll}>Ver tudo</ThemedText></Pressable>}</View><View style={styles.contentRow}>{posts.map((item, index) => { const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return <ContentCard key={index} title={text(value.title) || text(value.name)} description={text(value.description) || text(value.excerpt)} imageUrl={text(value.imageUrl) || text(value.thumbnail)} action={{ type: 'link', value: text(value.link) }} />; })}</View>{posts.length === 0 && <ThemedText themeColor="textSecondary">Os conteúdos do blog aparecerão aqui.</ThemedText>}</ThemedView>;
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
      <ThemedView style={styles.categoryMenuSection}>
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
    <ThemedView style={[styles.section, styles.cmsFallbackSection]}>
      <ThemedText type="smallBold">{section.name}</ThemedText>
      <ThemedText themeColor="textSecondary">Seção recebida do Headless CMS.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: { borderRadius: 16, backgroundColor: 'transparent' },
  productShelfSection: { gap: 8, padding: 0, marginHorizontal: 0 },
  homeProductShelfSection: { gap: 8, paddingHorizontal: 0 },
  richTextSection: { gap: 8, padding: 16 },
  streamShopSection: { gap: 8, padding: 16 },
  scheduleSection: { gap: 8, padding: 16 },
  couponsSection: { gap: 8, padding: 16 },
  blogSection: { gap: 8, padding: 16 },
  cmsFallbackSection: { gap: 8, padding: 16 },
  bannerSection: { gap: 6, paddingHorizontal: 10, paddingTop: 0, paddingBottom: 0, borderRadius: 0, marginHorizontal: 0, backgroundColor: 'transparent' },
  homeBannerSection: { marginHorizontal: 0, backgroundColor: '#fff' },
  bannerSectionTitle: { fontSize: 20, lineHeight: 20, color: '#0a0a0a', paddingHorizontal: 0, fontWeight: '600' },
  homeGridBannerSection: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: '#fff' },
  homeRoundedBannerSection: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: '#fff' },
  homeHorizontalBannerSection: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: '#fff' },
  homeSingleBannerSection: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: '#fff' },
  homeSliderBannerSection: { marginHorizontal: 0, paddingHorizontal: 0, backgroundColor: '#fff' },
  homeGridBanner: { width: '100%', marginHorizontal: 0, paddingHorizontal: 10 },
  homeGridBannerTitle: { color: '#0a0a0a' },
  homeRoundedBannerTitle: { color: '#0a0a0a', marginHorizontal: 10 },
  homeHorizontalBannerTitle: { color: '#0a0a0a' },
  homeSingleBannerTitle: { color: '#0a0a0a' },
  homeSliderBannerTitle: { color: '#0a0a0a' },
  homeGridBannerOverlayTitle: { color: '#FFFFFF' },
  homeRoundedBannerOverlayTitle: { color: '#FFFFFF' },
  homeHorizontalBannerOverlayTitle: { color: '#FFFFFF' },
  homeSingleBannerOverlayTitle: { color: '#FFFFFF' },
  homeSliderBannerOverlayTitle: { color: '#FFFFFF' },
  homeGridBannerOverlaySubtitle: { color: '#FFFFFF' },
  homeRoundedBannerOverlaySubtitle: { color: '#FFFFFF' },
  homeHorizontalBannerOverlaySubtitle: { color: '#FFFFFF' },
  homeSingleBannerOverlaySubtitle: { color: '#FFFFFF' },
  homeSliderBannerOverlaySubtitle: { color: '#FFFFFF' },
  categoryMenuSection: {
    gap: 12,
    padding: 0,
		marginHorizontal: 0,
		marginVertical: 0,
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'transparent',
  },
  // O hero escapa do padding horizontal usado pelos demais blocos da home.
  heroSection: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, backgroundColor: '#ffffff' },
  heroViewport: { position: 'relative', width: '100%', height: Dimensions.get('window').height },
  bannerSliderViewport: { position: 'relative', width: '100%' },
  heroCarousel: { flex: 1 },
  bannerCarousel: { width: '100%' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  seeAll: { textDecorationLine: 'underline', fontSize: 13 },
  tabList: { gap: 8 },
  homeTabList: { paddingHorizontal: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: '#0a0a0a' },
  selectedTab: { backgroundColor: '#0a0a0a' },
  selectedTabText: { color: '#FFFFFF' },
  homeShelfTitle: { fontSize: 20, lineHeight: 20 },
  homeTabViewport: { marginHorizontal: 0, paddingHorizontal: 0 },
  homeTab: { borderRadius: 50 },
  homeTabText: { fontSize: 14, lineHeight: 16 },
  plpSection: { gap: Spacing.three, backgroundColor: '#ffffff' },
  plpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  plpHeading: { flex: 1 },
  plpTitle: { fontSize: 18 },
  plpCount: { fontSize: 12 },
  filterButton: { minHeight: 42, paddingHorizontal: Spacing.three, borderRadius: 22, borderWidth: 1, borderColor: '#6d6862', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, backgroundColor: '#FFFFFF' },
  filterButtonText: { fontSize: 12 },
  loadMoreButton: { minHeight: 48, marginTop: Spacing.two, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  loadMoreText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.7 },
  sectionTitleCateg: { marginHorizontal: 10, fontSize: 20, lineHeight: 26, color: '#0a0a0a', fontWeight: '700' },
  categorySwipePanel: { overflow: 'hidden', marginHorizontal: 0, paddingLeft: 25, paddingRight: 20, borderRadius: 8, borderWidth: 0, borderColor: 'rgba(255, 255, 255, 0.9)', backgroundColor: 'transparent' },
  categorySwipeRow: { minHeight: 60, paddingHorizontal: 0, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0, borderBottomColor: 'rgba(255, 255, 255, 0.82)', backgroundColor: 'transparent' },
  categorySwipeRowTitle: { flex: 1, fontSize: 15, lineHeight: 22, color: '#0a0a0a', fontWeight: '500', textTransform: 'none' },
  categoryModal: { flex: 1, padding: 16, backgroundColor: '#f0f1f5' },
  categoryModalHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.9)' },
  categoryModalBack: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  categoryModalTitle: { flex: 1, fontSize: 20, lineHeight: 26, color: '#0a0a0a', fontWeight: '700', textAlign: 'center' },
  categoryModalList: { gap: 10, paddingVertical: 16 },
  categoryModalItem: { minHeight: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.82)' },
  categoryModalItemText: { flex: 1, fontSize: 16, lineHeight: 22, color: '#0a0a0a' },
  categoryList: { gap: 0, overflow: 'hidden', borderRadius: 16, borderWidth: 0, borderColor: 'rgba(255, 255, 255, 0.9)', backgroundColor: '#ffffff' },
  categoryGroupsList: { gap: 12, overflow: 'visible', backgroundColor: 'transparent' },
  categoryRow: { minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.82)' },
  categoryRowTitle: { fontSize: 18, lineHeight: 26, color: '#0a0a0a', fontWeight: '500' },
  categoryGroup: { gap: 14, marginHorizontal: 14, paddingHorizontal: 14, paddingVertical: 18, borderRadius: 16, borderWidth: 0, borderColor: 'rgba(255, 255, 255, 0.9)', backgroundColor: '#ffffff', boxShadow: '0px 0px 10px 1px rgba(0, 0, 0, 0.1)' },
  categoryGroupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  categoryGroupBack: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  categoryGroupTitle: { flex: 1, fontSize: 18, lineHeight: 20, color: '#0a0a0a' },
  seeAllButton: { minHeight: 30, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  seeAllButtonText: { fontSize: 12, lineHeight: 16, color: '#0a0a0a' },
  subcategoryBlock: { borderTopWidth: 1, borderTopColor: '#d4d4d4' },
  subcategoryHeader: { minHeight: 52, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subcategoryHeading: { fontSize: 16, lineHeight: 22, color: '#0a0a0a', fontWeight: '700' },
  subcategoryChevron: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  subcategoryChevronExpanded: { transform: [{ rotate: '90deg' }] },
  subcategoryList: { gap: 10 },
  subcategoryRow: { minHeight: 46, paddingHorizontal: 12, justifyContent: 'center', borderLeftWidth: 2, borderLeftColor: '#e2ded8' },
  subcategoryText: { fontSize: 16, lineHeight: 22, color: '#625d57' },
  banner: { overflow: 'hidden', borderRadius: 16 },
  roundedBannerItem: { alignItems: 'center' },
  roundedBannerItemTitle: { marginTop: 4, color: '#0a0a0a', fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  bannerTarget: { width: '100%' },
  bannerImage: { width: '100%', backgroundColor: '#e5e7eb' },
  bannerListRow: { flexDirection: 'row', gap: 12 },
  homeHorizontalBannerListRow: { paddingLeft: 10, paddingRight: 10 },
  homeRoundedBannerListRow: { paddingLeft: 10, paddingRight: 10 },
  bannerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  fitOnScreenRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  heroBanner: { width: Dimensions.get('window').width, height: Dimensions.get('window').height, minHeight: Dimensions.get('window').height, borderRadius: 0 },
  heroImage: { width: '100%', height: Dimensions.get('window').height },
  heroDots: { position: 'absolute', left: 0, right: 0, bottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  overlay: {
    position: 'absolute',
    left: 16,
    bottom: 16,
  },
  overlayTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  overlaySubtitle: { color: '#FFFFFF', fontSize: 14, marginTop: 4 },
  bannerButtonPosition: { position: 'absolute' },
  bannerButton: { position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 24 },
  bannerButtonBlur: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  bannerButtonColor: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  bannerButtonText: { fontFamily: Fonts.bold, fontWeight: '700', textAlign: 'center' },
  tileStack: { gap: 12 },
  contentRow: { flexDirection: 'row', gap: 12 },
  contentCard: { width: 190, gap: 8, padding: 10, borderRadius: 14, backgroundColor: '#FFFFFF' },
  contentCardImage: { width: 170, height: 130, borderRadius: 8 },
  scheduleCard: { flex: 1, minWidth: 130, gap: 6, padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF' },
  couponCard: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e0ddd7' },
  couponCode: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#0a0a0a', color: '#FFFFFF', fontWeight: '700' },
});

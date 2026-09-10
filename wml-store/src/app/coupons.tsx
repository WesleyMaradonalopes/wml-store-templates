import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Rect, Svg } from 'react-native-svg';

import ArrowUpIcon from '@/components/icons/ArrowUpIcon';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { getCmsPage, type CmsPage } from '@/services/cms';

const COUPONS_PAGE = 'cupons';
const TOAST_DURATION_MS = 2200;
const COUPON_LINE_HEIGHT = 21;
const COUPON_PREVIEW_LINES = 1;
const COUPON_PREVIEW_HEIGHT = COUPON_LINE_HEIGHT * 1.5;

type Coupon = {
  id: string;
  title: string;
  expiresAt: string;
  description: string;
  code: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function valueText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function normalizeCoupon(value: unknown, index: number): Coupon {
  const item = record(value);
  return {
    id: valueText(item.id) || valueText(item.couponId) || `coupon-${index + 1}`,
    title: valueText(item.title) || valueText(item.name),
    expiresAt: valueText(item.expiresAt) || valueText(item.validUntil) || valueText(item.validity),
    description: valueText(item.description) || valueText(item.details),
    code: valueText(item.code) || valueText(item.coupon) || valueText(item.couponCode),
  };
}

function extractCoupons(page: CmsPage | null): Coupon[] {
  if (!page) return [];

  const items: unknown[] = [];
  page.sections.forEach((section) => {
    const data = section.data ?? {};
    const candidate = [data.coupons, data.items, data.list, data.entries].find(Array.isArray);
    if (Array.isArray(candidate)) items.push(...candidate);
  });

  const settingsCoupons = page.settings?.coupons;
  if (Array.isArray(settingsCoupons)) items.push(...settingsCoupons);

  return items
    .map((item, index) => normalizeCoupon(item, index))
    .filter((coupon) => Boolean(coupon.title || coupon.code));
}

function extractHeroImage(page: CmsPage | null): string {
  const section = page?.sections.find((item) => item.name === 'MultipleImageBanner');
  if (!section) return '';

  const data = section.data ?? {};
  const firstImage = Array.isArray(data.images) ? record(data.images[0]) : {};
  const candidates = [
    data.heroImage,
    data.backgroundImage,
    data.image,
    firstImage.imageUrl,
    firstImage.desktopImage,
    firstImage.mobileImage,
    firstImage.image,
  ];

  return candidates.map(valueText).find(Boolean) ?? '';
}

function CouponDescription({ text, expanded, onToggle }: { text: string; expanded: boolean; onToggle: () => void }) {
  const [lineCount, setLineCount] = useState(0);
  const canExpand = lineCount > COUPON_PREVIEW_LINES;

  return (
    <View style={styles.descriptionRow}>
      <Pressable
        accessibilityRole={canExpand ? 'button' : undefined}
        accessibilityState={canExpand ? { expanded } : undefined}
        disabled={!canExpand}
        onPress={onToggle}
        style={[styles.descriptionButton, styles.descriptionTextClip, !expanded && styles.descriptionTextClipCollapsed]}>
        <ThemedText
          onTextLayout={(event) => {
            const nextLineCount = event.nativeEvent.lines.length;
            setLineCount((current) => current === nextLineCount ? current : nextLineCount);
          }}
          style={styles.description}>
          {text}
        </ThemedText>
        {!expanded && canExpand && <LinearGradient
          pointerEvents="none"
          colors={['rgba(255, 255, 255, 0.98)', 'rgba(255, 255, 255, 0)']}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={styles.descriptionTextFade}
        />}
      </Pressable>
      {canExpand && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Recolher descrição do cupom' : 'Expandir descrição do cupom'}
          accessibilityState={{ expanded }}
          onPress={onToggle}
          style={styles.chevronButton}>
          <View style={[styles.dropdownChevron, expanded && styles.dropdownChevronOpen]}>
            <ChevronRightIcon color="#625d57" size={16} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

export default function CouponsScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const onScroll = useTabBarScroll();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedCoupons, setExpandedCoupons] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCmsPage('landingPage', COUPONS_PAGE)
      .then((value) => { if (active) setPage(value); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const coupons = extractCoupons(page);
  const heroImage = extractHeroImage(page);

  async function copyCouponCode(code: string) {
    if (!code) {
      setToast('Não foi possível copiar o cupom');
      return;
    }

    try {
      await Clipboard.setStringAsync(code);
      setToast('Cupom copiado');
    } catch {
      setToast('Não foi possível copiar o cupom');
    }
  }

  function toggleCoupon(id: string) {
    setExpandedCoupons((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Cupons" onBack={() => router.back()} showSearch={false} />
        </View>
        <View style={styles.body}>
          <ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <View style={styles.inner}>
              <View style={styles.hero}>
                <View style={styles.heroFallback} />
                {heroImage ? <Image source={{ uri: heroImage }} contentFit="cover" onError={() => undefined} style={styles.heroImage} /> : null}
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent}>
                  <ThemedText style={styles.heroTitle}>Cupons</ThemedText>
                  <ThemedText style={styles.heroSubtitle}>Garanta seus looks e produtos favoritos.{`\n`}Escolha seu cupom e aproveite nossas ofertas!</ThemedText>
                </View>
              </View>

              <View style={styles.card}>
                {loading && <ActivityIndicator color="#0a0a0a" style={styles.loader} />}
                {error && <ThemedText themeColor="textSecondary">Não foi possível carregar os cupons.</ThemedText>}
                {!loading && !error && coupons.length === 0 && (
                  <ThemedText themeColor="textSecondary">Nenhum cupom disponível no momento.</ThemedText>
                )}
                {!loading && !error && coupons.map((coupon, index) => {
                  const expanded = Boolean(expandedCoupons[coupon.id]);
                  return (
                    <View key={`${coupon.id}-${index}`} style={styles.couponRow}>
                      {index > 0 && <View style={styles.separator} />}
                      <ThemedText style={styles.couponTitle}>{coupon.title}</ThemedText>
                      {!!coupon.expiresAt && <ThemedText style={styles.expiresAt}>Válido até {coupon.expiresAt}</ThemedText>}
                      {!!coupon.description && (
                        <CouponDescription text={coupon.description} expanded={expanded} onToggle={() => toggleCoupon(coupon.id)} />
                      )}
                      {!!coupon.code && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Copiar cupom ${coupon.code}`}
                          onPress={() => copyCouponCode(coupon.code)}
                          style={styles.copyButton}>
                          <ThemedText style={styles.copyText}>{coupon.code}</ThemedText>
                          <CopyIcon />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>

              {coupons.length > 2 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
                  style={styles.backToTopButton}>
                  <ArrowUpIcon size={15} />
                  <ThemedText style={styles.backToTopText}>Voltar ao topo</ThemedText>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
        {toast && (
          <View pointerEvents="none" style={styles.toastContainer}>
            <View style={styles.toast}>
              <CopyIcon color="#ffffff" size={24} />
              <ThemedText style={styles.toastText}>{toast}</ThemedText>
            </View>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function CopyIcon({ color = '#0a0a0a', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={8} width={11} height={11} rx={2} stroke={color} strokeWidth={1.5} />
      <Path d="M16 8V6.5A1.5 1.5 0 0 0 14.5 5h-8A1.5 1.5 0 0 0 5 6.5v8A1.5 1.5 0 0 0 6.5 16H8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  header: { marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.four, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#eeeae5' },
  body: { flex: 1, marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.four, backgroundColor: '#f7f7f7' },
  content: { paddingTop: Spacing.four, paddingBottom: 70 },
  inner: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: Spacing.three },
  hero: { height: 262, overflow: 'hidden', borderRadius: 16, backgroundColor: '#a49a8e' },
  heroFallback: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#a49a8e' },
  heroImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  heroOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15, 8, 5, 0.45)' },
  heroContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  heroTitle: { color: '#ffffff', fontFamily: Fonts.sans, fontSize: 28, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  heroSubtitle: { marginTop: Spacing.three, color: '#ffffff', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  card: { gap: Spacing.three, padding: Spacing.four, borderRadius: 16, borderWidth: 1, borderColor: '#e6e1dc', backgroundColor: '#ffffff' },
  loader: { marginVertical: Spacing.two },
  couponRow: { gap: Spacing.two },
  separator: { height: 1, marginBottom: Spacing.two, backgroundColor: '#e6e1dc' },
  couponTitle: { color: '#0a0a0a', fontFamily: Fonts.bold, fontSize: 15, lineHeight: 22, textTransform: 'uppercase' },
  expiresAt: { color: '#7f7670', fontFamily: Fonts.sans, fontSize: 10, lineHeight: 14 },
  descriptionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  descriptionButton: { flex: 1, minWidth: 0 },
  descriptionTextClip: { position: 'relative', overflow: 'hidden' },
  descriptionTextClipCollapsed: { maxHeight: COUPON_PREVIEW_HEIGHT },
  descriptionTextFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 14 },
  description: { color: '#0a0a0a', fontFamily: Fonts.sans, fontSize: 14, lineHeight: 21 },
  chevronButton: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  dropdownChevron: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] },
  dropdownChevronOpen: { transform: [{ rotate: '-90deg' }] },
  copyButton: { minHeight: 52, paddingHorizontal: Spacing.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, borderWidth: 1, borderStyle: 'dashed', borderColor: '#b0a69b', borderRadius: 8, backgroundColor: '#ffffff' },
  copyText: { flexShrink: 1, color: '#0a0a0a', fontFamily: Fonts.bold, fontSize: 16, lineHeight: 24, textAlign: 'center', textTransform: 'uppercase' },
  backToTopButton: { alignSelf: 'center', minHeight: 40, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e6e1dc', backgroundColor: '#ffffff' },
  backToTopText: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18, color: '#0a0a0a' },
  toastContainer: { position: 'absolute', left: 0, right: 0, top: '42%', alignItems: 'center' },
  toast: { width: 150, alignItems: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderRadius: 8, backgroundColor: 'rgba(15, 8, 5, 0.7)' },
  toastText: { color: '#ece8e4', fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16, textAlign: 'center' },
});

import { usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AssistantHeaderButton } from './assistant-header-button';
import { CartIconButton } from './cart-icon-button';
import ArrowLeftIAIcon from './icons/ArrowLeftIAicon';
import HopeLogoIcon from './icons/HopeLogoIcon';
import SearchIcon from './icons/SearchIcon';
import ShareIcon from './icons/ShareIcon';
import { ThemedText } from './themed-text';

type ScreenHeaderProps = {
  back?: boolean;
  title?: string;
  titleAlign?: 'center' | 'left';
  onBack?: () => void;
  onSearch?: () => void;
  onShare?: () => void;
  shareLoading?: boolean;
  showSearch?: boolean;
  showShare?: boolean;
  showCart?: boolean;
  showAssistant?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  logoWidth?: number;
  logoHeight?: number;
  logoOffsetY?: number;
  variant?: 'default' | 'checkout';
};

export function ScreenHeader({ back = true, title, titleAlign = 'center', onBack, onSearch, onShare, shareLoading = false, showSearch = true, showShare = false, showCart = true, showAssistant = true, titleStyle, logoWidth = 76, logoHeight = 20, logoOffsetY = 0, variant = 'default' }: ScreenHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const goBack = onBack ?? (() => router.back());
  const checkoutVariant = variant === 'checkout' || pathname === '/checkout';
  const headerColor = checkoutVariant ? '#0a0a0a' : theme.text;
  const assistantHidden = ['/account', '/checkout', '/coupons', '/returns', '/privacy-policy', '/stores', '/page', '/assistant']
    .some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return (
    <View style={[styles.header, checkoutVariant && styles.checkoutHeader, checkoutVariant && { marginTop: -(Spacing.four + insets.top), paddingTop: Spacing.four + insets.top, minHeight: 66 + insets.top }]}>
      {back ? <Pressable onPress={goBack} style={[styles.side, checkoutVariant && styles.checkoutBackButton]}><ArrowLeftIAIcon color={headerColor} size={21} /></Pressable> : title && titleAlign === 'left' ? null : <View style={styles.side} />}
      <View pointerEvents="box-none" style={[titleAlign === 'left' && title ? styles.leftTitle : styles.center, checkoutVariant && titleAlign !== 'left' && { top: Spacing.four + insets.top, height: 42 }]}>{title ? <ThemedTitle style={[checkoutVariant && styles.checkoutTitle, titleStyle]}>{title}</ThemedTitle> : <Pressable accessibilityLabel="Ir para o início" onPress={() => router.replace('/')} style={[styles.logoButton, logoOffsetY !== 0 && { transform: [{ translateY: logoOffsetY }] }]}><HopeLogoIcon color={headerColor} width={logoWidth} height={logoHeight} /></Pressable>}</View>
      <View style={[styles.actions, checkoutVariant && styles.checkoutActions]}>
        {showAssistant && !assistantHidden && <AssistantHeaderButton color={headerColor} size={22} style={styles.action} />}
        {showSearch && <Pressable accessibilityLabel="Buscar" onPress={onSearch ?? (() => router.push('/search'))} style={styles.action}><SearchIcon size={20} color={headerColor} /></Pressable>}
        {showShare && onShare && <Pressable accessibilityLabel={shareLoading ? 'Gerando link dos favoritos' : 'Compartilhar favoritos'} accessibilityState={{ busy: shareLoading, disabled: shareLoading }} disabled={shareLoading} onPress={onShare} style={styles.action}>{shareLoading ? <ActivityIndicator size="small" color={headerColor} /> : <ShareIcon size={21} color={headerColor} />}</Pressable>}
        {showCart && <CartIconButton color={headerColor} style={styles.action} />}
      </View>
    </View>
  );
}

function ThemedTitle({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <ThemedText style={[styles.title, style]}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  header: { minHeight: 42, position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 },
  checkoutHeader: { minHeight: 66, marginTop: -Spacing.four, marginHorizontal: -Spacing.four, paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: 0, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#dedbd5' },
  side: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  checkoutBackButton: { width: 35, height: 35, borderRadius: 21, borderWidth: 0, backgroundColor: 'transparent' },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'flex-end' },
  leftTitle: { flex: 1, minHeight: 42, alignItems: 'flex-start', justifyContent: 'center' },
  logoButton: { minWidth: 90, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  checkoutActions: { minWidth: 42, justifyContent: 'flex-end' },
  action: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.bold, fontSize: 16, fontWeight: '700' },
  checkoutTitle: { color: '#0a0a0a', fontFamily: Fonts.medium, fontSize: 18, lineHeight: 24, fontWeight: '500' },
});

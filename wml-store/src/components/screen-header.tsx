import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, TextStyle, View } from 'react-native';

import { Fonts } from '@/constants/theme';
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
  titleStyle?: StyleProp<TextStyle>;
  logoWidth?: number;
  logoHeight?: number;
  logoOffsetY?: number;
};

export function ScreenHeader({ back = true, title, titleAlign = 'center', onBack, onSearch, onShare, shareLoading = false, showSearch = true, showShare = false, showCart = true, titleStyle, logoWidth = 76, logoHeight = 20, logoOffsetY = 0 }: ScreenHeaderProps) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.back());
  return (
    <View style={styles.header}>
      {back ? <Pressable onPress={goBack} style={styles.side}><ArrowLeftIAIcon color="#0a0a0a" size={21} /></Pressable> : title && titleAlign === 'left' ? null : <View style={styles.side} />}
      <View pointerEvents="box-none" style={titleAlign === 'left' && title ? styles.leftTitle : styles.center}>{title ? <ThemedTitle style={titleStyle}>{title}</ThemedTitle> : <Pressable accessibilityLabel="Ir para o início" onPress={() => router.replace('/')} style={[styles.logoButton, logoOffsetY !== 0 && { transform: [{ translateY: logoOffsetY }] }]}><HopeLogoIcon color="#0a0a0a" width={logoWidth} height={logoHeight} /></Pressable>}</View>
      <View style={styles.actions}>
        {showSearch && <Pressable accessibilityLabel="Buscar" onPress={onSearch ?? (() => router.push('/search'))} style={styles.action}><SearchIcon size={20} color="#0a0a0a" /></Pressable>}
        {showShare && onShare && <Pressable accessibilityLabel={shareLoading ? 'Gerando link dos favoritos' : 'Compartilhar favoritos'} accessibilityState={{ busy: shareLoading, disabled: shareLoading }} disabled={shareLoading} onPress={onShare} style={styles.action}>{shareLoading ? <ActivityIndicator size="small" color="#0a0a0a" /> : <ShareIcon size={21} color="#0a0a0a" />}</Pressable>}
        {showCart && <CartIconButton style={styles.action} />}
      </View>
    </View>
  );
}

function ThemedTitle({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <ThemedText style={[styles.title, style]}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  header: { minHeight: 42, position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 },
  side: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  leftTitle: { flex: 1, minHeight: 42, alignItems: 'flex-start', justifyContent: 'center' },
  logoButton: { minWidth: 90, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  action: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.bold, fontSize: 16, fontWeight: '700' },
});

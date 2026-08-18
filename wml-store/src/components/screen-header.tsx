import { Pressable, StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { useRouter } from 'expo-router';

import ArrowLeftIAIcon from './icons/ArrowLeftIAicon';
import { CartIconButton } from './cart-icon-button';
import HopeLogoIcon from './icons/HopeLogoIcon';
import SearchIcon from './icons/SearchIcon';
import { ThemedText } from './themed-text';
import { Fonts } from '@/constants/theme';

type ScreenHeaderProps = {
  back?: boolean;
  title?: string;
  titleAlign?: 'center' | 'left';
  onBack?: () => void;
  showSearch?: boolean;
  showCart?: boolean;
  titleStyle?: StyleProp<TextStyle>;
};

export function ScreenHeader({ back = true, title, titleAlign = 'center', onBack, showSearch = true, showCart = true, titleStyle }: ScreenHeaderProps) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.back());
  return (
    <View style={styles.header}>
      {back ? <Pressable onPress={goBack} style={styles.side}><ArrowLeftIAIcon color="#0a0a0a" size={21} /></Pressable> : title && titleAlign === 'left' ? null : <View style={styles.side} />}
      <View pointerEvents="box-none" style={titleAlign === 'left' && title ? styles.leftTitle : styles.center}>{title ? <ThemedTitle style={titleStyle}>{title}</ThemedTitle> : <Pressable accessibilityLabel="Ir para o início" onPress={() => router.replace('/')} style={styles.logoButton}><HopeLogoIcon color="#0a0a0a" width={76} height={20} /></Pressable>}</View>
      <View style={styles.actions}>
        {showSearch && <Pressable accessibilityLabel="Buscar" onPress={() => router.push('/search')} style={styles.action}><SearchIcon size={20} color="#0a0a0a" /></Pressable>}
        {showCart && <CartIconButton style={styles.action} />}
      </View>
    </View>
  );
}

function ThemedTitle({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <ThemedText style={[styles.title, style]}>{children}</ThemedText>;
}

const styles = StyleSheet.create({
  header: { minHeight: 42, position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  leftTitle: { flex: 1, minHeight: 42, alignItems: 'flex-start', justifyContent: 'center' },
  logoButton: { minWidth: 90, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  action: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.bold, fontSize: 16, fontWeight: '700' },
});

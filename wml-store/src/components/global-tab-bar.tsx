import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTabBar } from '@/context/tab-bar-context';
import { CartCountBadge, useCartItemCount } from './cart-icon-button';
import HeartIcon from './icons/HeartIcon';
import HomeIcon from './icons/HomeIcon';
import MenuIcon from './icons/MenuIcon';
import ShoppingBagIcon from './icons/ShoppingBagIcon';
import UserIcon from './icons/UserIcon';
import { ThemedText } from './themed-text';

const items = [
  { path: '/(tabs)', label: 'Home', icon: 'home' },
  { path: '/explore', label: 'Categorias', icon: 'category' },
  { path: '/favorites', label: 'Favoritos', icon: 'favorite' },
  { path: '/checkout', label: 'Sacola', icon: 'bag' },
  { path: '/account', label: 'Conta', icon: 'account' },
] as const;

export default function GlobalTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hidden, setHidden } = useTabBar();
  const cartCount = useCartItemCount();
  const excluded = pathname.startsWith('/checkout') || pathname.startsWith('/product/');

  useEffect(() => setHidden(false), [pathname, setHidden]);
  if (excluded) return null;

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, Spacing.two) }, hidden && styles.hidden]}>
      <View style={styles.inner}>
        {items.map((item) => {
          const active = item.path === '/(tabs)' ? pathname === '/' || pathname === '/(tabs)' : pathname.startsWith(item.path);
          return (
            <Pressable key={item.path} onPress={() => router.push(item.path)} style={styles.tabButton}>
              <View style={[styles.tabButtonView, active && styles.selected]}>
                {item.icon === 'home' && <HomeIcon color="#FFFFFF" size={18} />}
                {item.icon === 'category' && <MenuIcon color="#FFFFFF" size={18} />}
                {item.icon === 'favorite' && <HeartIcon color="#FFFFFF" size={18} />}
                {item.icon === 'bag' && <View style={styles.bagIcon}><ShoppingBagIcon color="#FFFFFF" size={22} /><CartCountBadge count={cartCount} /></View>}
                {item.icon === 'account' && <UserIcon color="#FFFFFF" size={18} />}
                <ThemedText style={styles.label}>{item.label}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: 520, flexDirection: 'row', padding: 5, borderRadius: 30, backgroundColor: 'rgba(125, 125, 125, 0.78)', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  tabButton: { flex: 1 },
  tabButtonView: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  selected: { backgroundColor: 'rgba(255, 255, 255, 0.16)', borderRadius: 22 },
  label: { color: '#FFFFFF', fontSize: 9, lineHeight: 11, marginTop: 1 },
  bagIcon: { width: 22, height: 22, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  hidden: { display: 'none' },
});

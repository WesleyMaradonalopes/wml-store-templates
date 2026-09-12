import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBottomTabItems, withOpacity } from '@/config/bottom-tab';
import { Spacing } from '@/constants/theme';
import { useTabBar } from '@/context/tab-bar-context';
import { CartCountBadge, useCartItemCount } from './cart-icon-button';
import HeartIcon from './icons/HeartIcon';
import HomeIcon from './icons/HomeIcon';
import MenuIcon from './icons/MenuIcon';
import ShoppingBagIcon from './icons/ShoppingBagIcon';
import UserIcon from './icons/UserIcon';
import { ThemedText } from './themed-text';

export default function GlobalTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hidden, setHidden, showOnCheckout, bottomTabSettings } = useTabBar();
  const items = getBottomTabItems(bottomTabSettings);
  const cartCount = useCartItemCount();
  const excluded = (pathname.startsWith('/checkout') && !showOnCheckout) || pathname.startsWith('/product/');

  useEffect(() => setHidden(false), [pathname, setHidden]);
  if (excluded) return null;

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, Spacing.two) }, hidden && styles.hidden]}>
      <View style={[styles.inner, { backgroundColor: withOpacity(bottomTabSettings.backgroundColor, bottomTabSettings.backgroundOpacity) }]}>
        {items.map((item) => {
          const active = item.path === '/(tabs)' ? pathname === '/' || pathname === '/(tabs)' : pathname.startsWith(item.path);
          const iconColor = active ? bottomTabSettings.activeIconColor : bottomTabSettings.inactiveIconColor;
          const textColor = active ? bottomTabSettings.activeTextColor : bottomTabSettings.inactiveTextColor;
          return (
            <Pressable key={item.path} onPress={() => router.push(item.path)} style={styles.tabButton}>
              <View style={[styles.tabButtonView, active && styles.selected, active && { backgroundColor: withOpacity(bottomTabSettings.activeBackgroundColor, bottomTabSettings.activeBackgroundOpacity) }]}>
                {item.icon === 'home' && <HomeIcon color={iconColor} size={20} />}
                {item.icon === 'category' && <MenuIcon color={iconColor} size={20} />}
                {item.icon === 'favorite' && <HeartIcon color={iconColor} size={20} />}
                {item.icon === 'bag' && <View style={styles.bagIcon}><ShoppingBagIcon color={iconColor} size={20} /><CartCountBadge count={cartCount} variant="bottomTab" backgroundColor={bottomTabSettings.badgeBackgroundColor} textColor={bottomTabSettings.badgeTextColor} /></View>}
                {item.icon === 'account' && <UserIcon color={iconColor} size={20} />}
                <ThemedText style={[styles.label, { color: textColor }]}>{item.label}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left:0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: 520, flexDirection: 'row', padding: 6, borderRadius: 50, shadowColor: '#0a0a0a', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  tabButton: { flex: 1 },
  tabButtonView: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  selected: { borderRadius: 22 },
  label: { fontSize: 10, lineHeight: 11, marginTop: 1 },
  bagIcon: { width: 22, height: 22, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  hidden: { display: 'none' },
});

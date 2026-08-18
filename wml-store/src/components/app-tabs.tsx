import { TabList, TabListProps, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTabBar } from '@/context/tab-bar-context';
import HeartIcon from './icons/HeartIcon';
import HomeIcon from './icons/HomeIcon';
import ShoppingBagIcon from './icons/ShoppingBagIcon';
import UserIcon from './icons/UserIcon';
import { ThemedText } from './themed-text';

export default function AppTabs({ showBar = true }: { showBar?: boolean }) {
  const { hidden } = useTabBar();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <FloatingTabList hidden={hidden || !showBar}>
          <TabTrigger name="home" href="/(tabs)" asChild><TabButton icon="home">Home</TabButton></TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild><TabButton icon="category">Categorias</TabButton></TabTrigger>
          <TabTrigger name="favorites" href="/favorites" asChild><TabButton icon="favorite">Favoritos</TabButton></TabTrigger>
          <TabTrigger name="account" href="/account" asChild><TabButton icon="account">Conta</TabButton></TabTrigger>
        </FloatingTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, icon, isFocused, ...props }: TabTriggerSlotProps & { icon: string }) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={[styles.tabButtonView, isFocused && styles.selectedTabButton]}>
        {icon === 'home' && <HomeIcon color="#FFFFFF" size={16} />}
        {icon === 'favorite' && <HeartIcon color="#FFFFFF" size={16} />}
        {icon === 'bag' && <ShoppingBagIcon color="#FFFFFF" size={16} />}
        {icon === 'account' && <UserIcon color="#FFFFFF" size={16} />}
        {icon === 'category' && <SymbolView name={{ ios: 'square.grid.2x2' as never, web: 'grid' as never }} tintColor="#FFFFFF" size={16} />}
        <ThemedText style={styles.tabLabel}>{children}</ThemedText>
      </View>
    </Pressable>
  );
}

function FloatingTabList({ hidden, ...props }: TabListProps & { hidden?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View {...props} style={[styles.outer, { paddingBottom: Math.max(insets.bottom, Spacing.two) }, hidden && styles.hidden]}>
      <View style={styles.inner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: 520, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 5, borderRadius: 30, backgroundColor: 'rgba(125, 125, 125, 0.78)', shadowColor: '#0a0a0a', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  tabButton: { flex: 1 },
  tabButtonView: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingVertical: 3, paddingHorizontal: 2, borderRadius: 22 },
  selectedTabButton: { backgroundColor: 'rgba(255, 255, 255, 0.16)', borderRadius: 22 },
  tabLabel: { color: '#FFFFFF', fontSize: 9, lineHeight: 11, marginTop: 1 },
  pressed: { opacity: 0.65 },
  hidden: { display: 'none' },
});

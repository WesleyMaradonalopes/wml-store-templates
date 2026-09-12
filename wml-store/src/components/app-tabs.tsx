import { TabList, TabListProps, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBottomTabItems, withOpacity, type BottomTabSettings } from '@/config/bottom-tab';
import { Spacing } from '@/constants/theme';
import { useTabBar } from '@/context/tab-bar-context';
import HeartIcon from './icons/HeartIcon';
import HomeIcon from './icons/HomeIcon';
import ShoppingBagIcon from './icons/ShoppingBagIcon';
import UserIcon from './icons/UserIcon';
import { ThemedText } from './themed-text';

export default function AppTabs({ showBar = true }: { showBar?: boolean }) {
  const { hidden, bottomTabSettings } = useTabBar();
  const items = getBottomTabItems(bottomTabSettings).filter((item) => item.key !== 'cart');
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <FloatingTabList hidden={hidden || !showBar} settings={bottomTabSettings}>
          {items.map((item) => (
            <TabTrigger key={item.key} name={item.routeName} href={item.path} asChild>
              <TabButton icon={item.icon} settings={bottomTabSettings}>{item.label}</TabButton>
            </TabTrigger>
          ))}
        </FloatingTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, icon, isFocused, settings, ...props }: TabTriggerSlotProps & { icon: string; settings: BottomTabSettings }) {
  const iconColor = isFocused ? settings.activeIconColor : settings.inactiveIconColor;
  const textColor = isFocused ? settings.activeTextColor : settings.inactiveTextColor;
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={[styles.tabButtonView, isFocused && styles.selectedTabButton, isFocused && { backgroundColor: withOpacity(settings.activeBackgroundColor, settings.activeBackgroundOpacity) }]}>
        {icon === 'home' && <HomeIcon color={iconColor} size={16} />}
        {icon === 'favorite' && <HeartIcon color={iconColor} size={16} />}
        {icon === 'bag' && <ShoppingBagIcon color={iconColor} size={16} />}
        {icon === 'account' && <UserIcon color={iconColor} size={16} />}
        {icon === 'category' && <SymbolView name={{ ios: 'square.grid.2x2' as never, web: 'grid' as never }} tintColor={iconColor} size={16} />}
        <ThemedText style={[styles.tabLabel, { color: textColor }]}>{children}</ThemedText>
      </View>
    </Pressable>
  );
}

function FloatingTabList({ hidden, settings, ...props }: TabListProps & { hidden?: boolean; settings: BottomTabSettings }) {
  const insets = useSafeAreaInsets();
  return (
    <View {...props} style={[styles.outer, { paddingBottom: Math.max(insets.bottom, Spacing.two) }, hidden && styles.hidden]}>
      <View style={[styles.inner, { backgroundColor: withOpacity(settings.backgroundColor, settings.backgroundOpacity) }]}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: Spacing.three },
  inner: { width: '100%', maxWidth: 520, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 5, borderRadius: 30, shadowColor: '#0a0a0a', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  tabButton: { flex: 1 },
  tabButtonView: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingVertical: 3, paddingHorizontal: 2, borderRadius: 22 },
  selectedTabButton: { borderRadius: 22 },
  tabLabel: { fontSize: 9, lineHeight: 11, marginTop: 1 },
  pressed: { opacity: 0.65 },
  hidden: { display: 'none' },
});

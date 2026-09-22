import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getOrderForm, subscribeToCartChanges, type OrderForm } from '@/services/cart';

import ShoppingBagIcon from './icons/ShoppingBagIcon';

type Props = {
  onPress?: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

function itemCount(orderForm: OrderForm) {
  return orderForm.items.reduce((total, item) => total + item.quantity, 0);
}

export function useCartItemCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(itemCount(await getOrderForm()));
    } catch {
      setCount(0);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refresh();
    return subscribeToCartChanges((orderForm) => setCount(itemCount(orderForm)));
  }, [refresh]));

  return count;
}

type CartCountBadgeProps = {
  count: number;
  variant?: 'top' | 'bottomTab';
  backgroundColor?: string;
  textColor?: string;
};

export function CartCountBadge({ count, variant = 'top', backgroundColor, textColor }: CartCountBadgeProps) {
  const theme = useTheme();
  if (count <= 0) return null;
  const bottomTab = variant === 'bottomTab';
  const defaultBackgroundColor = bottomTab ? '#FFFFFF' : theme.primary;
  const defaultTextColor = bottomTab ? '#0a0a0a' : theme.onPrimary;
  return <View style={[styles.topBadge, bottomTab && styles.bottomTabBadge, { backgroundColor: backgroundColor ?? defaultBackgroundColor }]}><Text style={[styles.topBadgeText, bottomTab && styles.bottomTabBadgeText, { color: textColor ?? defaultTextColor }]}>{count > 99 ? '99+' : count}</Text></View>;
}

export function CartIconButton({ onPress, color, size = 20, style }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const count = useCartItemCount();

  return (
    <Pressable
      accessibilityLabel={count > 0 ? `Sacola, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Sacola'}
      onPress={onPress ?? (() => router.push('/checkout'))}
      style={[styles.button, style]}>
      <ShoppingBagIcon size={size} color={color ?? theme.text} />
      <CartCountBadge count={count} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  topBadge: { position: 'absolute', top: 0, right: -1, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  topBadgeText: { color: '#FFFFFF', fontSize: 9, lineHeight: 12, fontWeight: '700', fontFamily: Fonts.bold },
  bottomTabBadge: { top: -5, right: -7, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#FFFFFF' },
  bottomTabBadgeText: { color: '#0a0a0a', fontSize: 9, lineHeight: 12, fontFamily: Fonts.bold },
});

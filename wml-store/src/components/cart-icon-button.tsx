import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
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
};

export function CartCountBadge({ count, variant = 'top' }: CartCountBadgeProps) {
  if (count <= 0) return null;
  const bottomTab = variant === 'bottomTab';
  return <View style={[styles.topBadge, bottomTab && styles.bottomTabBadge]}><Text style={[styles.topBadgeText, bottomTab && styles.bottomTabBadgeText]}>{count > 99 ? '99+' : count}</Text></View>;
}

export function CartIconButton({ onPress, color = '#231f20', size = 20, style }: Props) {
  const router = useRouter();
  const count = useCartItemCount();

  return (
    <Pressable
      accessibilityLabel={count > 0 ? `Sacola, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Sacola'}
      onPress={onPress ?? (() => router.push('/checkout'))}
      style={[styles.button, style]}>
      <ShoppingBagIcon size={size} color={color} />
      <CartCountBadge count={count} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  topBadge: { position: 'absolute', top: 0, right: -1, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  topBadgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '700', fontFamily: Fonts.bold },
  bottomTabBadge: { top: -4, right: -5, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#FFFFFF' },
  bottomTabBadgeText: { color: '#000000', fontSize: 10, lineHeight: 12, fontFamily: Fonts.bold },
});

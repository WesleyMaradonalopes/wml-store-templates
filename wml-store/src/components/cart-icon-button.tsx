import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

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

export function CartCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text></View>;
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
  badge: { position: 'absolute', top: -2, right: -3, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '700' },
});

import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { CartItem, getOrderForm, OrderForm, updateCartItem } from '@/services/cart';
import { ScreenHeader } from '@/components/screen-header';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { useTabBar } from '@/context/tab-bar-context';

export default function CartScreen() {
  const onScroll = useTabBarScroll();
  const { setHidden } = useTabBar();
  const router = useRouter(); const [orderForm, setOrderForm] = useState<OrderForm | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [updatingId, setUpdatingId] = useState<string | null>(null);
  useEffect(() => { getOrderForm().then((value) => { setOrderForm(value); setHidden(value.items.length > 0); }).catch(() => setError(true)).finally(() => setLoading(false)); }, [setHidden]);
  useEffect(() => { if (orderForm) setHidden(orderForm.items.length > 0); }, [orderForm, setHidden]);
  async function changeQuantity(index: number, item: CartItem, quantity: number) {
    if (!orderForm || updatingId) return; setUpdatingId(item.id);
    try { setOrderForm(await updateCartItem({ orderFormId: orderForm.orderFormId, index: item.index, itemId: item.id, sellerId: item.seller, quantity })); } catch { setError(true); } finally { setUpdatingId(null); }
  }
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}>
    <ScreenHeader showSearch={false} showCart /><ThemedText type="subtitle">Sacola</ThemedText>{loading && <ActivityIndicator color="#0a0a0a" />}
    {error && <ThemedText themeColor="textSecondary">Nao foi possivel carregar o carrinho.</ThemedText>}
    {!loading && !error && orderForm?.items.length === 0 && <ThemedText themeColor="textSecondary">Seu carrinho esta vazio.</ThemedText>}
    <FlatList data={orderForm?.items ?? []} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item, index }) => <CartRow item={item} updating={updatingId === item.id} onDecrease={() => changeQuantity(index, item, item.quantity - 1)} onIncrease={() => changeQuantity(index, item, item.quantity + 1)} onRemove={() => changeQuantity(index, item, 0)} />} />
    {!loading && !error && orderForm && <><ThemedText type="smallBold">Total: R$ {orderForm.value.toFixed(2)}</ThemedText>{orderForm.items.length > 0 && <Pressable onPress={() => router.push('/checkout')} style={styles.button}><ThemedText type="smallBold">Continuar para checkout</ThemedText></Pressable>}</>}
  </SafeAreaView></ThemedView>;
}
function CartRow({ item, updating, onDecrease, onIncrease, onRemove }: { item: CartItem; updating: boolean; onDecrease: () => void; onIncrease: () => void; onRemove: () => void }) {
  return <ThemedView style={styles.row}>{!!item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}<ThemedView style={styles.rowContent}><ThemedText type="smallBold" numberOfLines={2}>{item.name}</ThemedText><ThemedText themeColor="textSecondary">R$ {item.price.toFixed(2)} cada</ThemedText><ThemedText type="smallBold">Subtotal: R$ {(item.price * item.quantity).toFixed(2)}</ThemedText><ThemedView style={styles.actions}><Pressable disabled={updating || item.quantity <= 1} onPress={onDecrease} style={styles.quantityButton}><ThemedText type="smallBold">-</ThemedText></Pressable><ThemedText type="smallBold">{updating ? '...' : item.quantity}</ThemedText><Pressable disabled={updating} onPress={onIncrease} style={styles.quantityButton}><ThemedText type="smallBold">+</ThemedText></Pressable><Pressable disabled={updating} onPress={onRemove} style={styles.removeButton}><ThemedText style={styles.removeText}>Remover</ThemedText></Pressable></ThemedView></ThemedView></ThemedView>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.three }, list: { gap: Spacing.three, paddingVertical: Spacing.three }, row: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three, borderRadius: 16, backgroundColor: '#ffffff', shadowColor: '#0a0a0a', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, rowContent: { flex: 1, gap: Spacing.one }, image: { width: 88, height: 116, borderRadius: 10, backgroundColor: '#e8e8ea' }, button: { padding: Spacing.four, borderRadius: 24, alignItems: 'center', backgroundColor: '#0a0a0a' }, actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one }, quantityButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0ece5' }, removeButton: { marginLeft: 'auto', paddingVertical: Spacing.one }, removeText: { color: '#B42318', fontSize: 12 } });

import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { CustomerOrder, getCustomerOrders } from '@/services/orders';

function money(value?: number) { return `R$ ${((value ?? 0) / 100).toFixed(2).replace('.', ',')}`; }
function date(value?: string) { return value ? new Date(value).toLocaleDateString('pt-BR') : 'Data não informada'; }

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onScroll = useTabBarScroll();
  useEffect(() => { getCustomerOrders().then(setOrders).catch((value) => setError(value instanceof Error ? value.message : 'Não foi possível carregar os pedidos.')).finally(() => setLoading(false)); }, []);
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Meus Pedidos" />{loading && <ActivityIndicator color="#000000" />}{!!error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}{!loading && !error && orders.length === 0 && <ThemedText themeColor="textSecondary">Você ainda não possui pedidos.</ThemedText>}<FlatList data={orders} onScroll={onScroll} scrollEventThrottle={16} keyExtractor={(item, index) => item.orderId || String(index)} contentContainerStyle={styles.list} renderItem={({ item }) => <OrderCard order={item} onDetails={() => router.push({ pathname: '/orders/[id]', params: { id: item.orderId } })} />} /></SafeAreaView></ThemedView>;
}

function OrderCard({ order, onDetails }: { order: CustomerOrder; onDetails: () => void }) {
  return <ThemedView style={styles.card}><View style={styles.cardTop}><View><ThemedText type="smallBold">PEDIDO</ThemedText><ThemedText>{order.orderId}</ThemedText></View><ThemedText style={styles.status}>{order.status || 'Processando'}</ThemedText></View><View style={styles.meta}><View><ThemedText type="smallBold">DATA</ThemedText><ThemedText themeColor="textSecondary">{date(order.creationDate)}</ThemedText></View><View><ThemedText type="smallBold">TOTAL</ThemedText><ThemedText>{money(order.value)}</ThemedText></View></View>{(order.items ?? []).slice(0, 8).map((item, index) => <View key={`${item.name}-${index}`} style={styles.item}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.thumb} /> : <View style={styles.thumb} />}<View style={styles.itemInfo}><ThemedText numberOfLines={2}>{item.name || 'Produto'}</ThemedText><ThemedText themeColor="textSecondary">{item.quantity ?? 1} un · {money(item.price)}</ThemedText></View></View>)}<Pressable onPress={onDetails} style={styles.primaryButton}><ThemedText style={styles.primaryText}>Ver detalhes do pedido</ThemedText></Pressable></ThemedView>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, safeArea: { flex: 1, padding: Spacing.four }, list: { gap: Spacing.three, paddingVertical: Spacing.three }, card: { gap: Spacing.three, padding: Spacing.three, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e2dc' }, cardTop: { flexDirection: 'row', justifyContent: 'space-between' }, meta: { flexDirection: 'row', justifyContent: 'space-between' }, status: { backgroundColor: '#eef2f0', padding: Spacing.one, borderRadius: 6 }, item: { flexDirection: 'row', gap: Spacing.two }, thumb: { width: 42, height: 52, backgroundColor: '#e8e8ea', borderRadius: 4, resizeMode: 'cover' }, itemInfo: { flex: 1 }, primaryButton: { padding: Spacing.three, borderRadius: 8, alignItems: 'center', backgroundColor: '#1e120d' }, primaryText: { color: '#fff', fontWeight: '700' } });

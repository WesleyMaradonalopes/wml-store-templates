import { useEffect, useState } from 'react';
import { ActivityIndicator as NativeActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { CustomerOrder, getCustomerOrder } from '@/services/orders';

const ActivityIndicator = () => <NativeActivityIndicator color="#0a0a0a" />;

type Address = { street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string; postalCode?: string };
type Payment = { paymentSystemName?: string; value?: number; installments?: number };
type Total = { id?: string; name?: string; value?: number };

function money(value?: number) { return `R$ ${((value ?? 0) / 100).toFixed(2).replace('.', ',')}`; }
function total(order: CustomerOrder, names: string[]) { const totals = (order.totals as Total[] | undefined) ?? []; return totals.find((item) => names.some((name) => String(item.name || '').toLowerCase().includes(name)))?.value; }

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onScroll = useTabBarScroll();
  useEffect(() => { if (id) getCustomerOrder(id).then(setOrder).catch((value) => setError(value instanceof Error ? value.message : 'Não foi possível carregar o pedido.')); }, [id]);
  const address = order?.shippingData && typeof order.shippingData === 'object' ? (order.shippingData as { address?: Address }).address : undefined;
  const payment = order?.paymentData && typeof order.paymentData === 'object' ? (order.paymentData as { transactions?: Array<{ payments?: Payment[] }> }).transactions?.[0]?.payments?.[0] : undefined;
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Meus Pedidos" />{!order && !error && <ActivityIndicator />}{!!error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}{order && <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}><View style={styles.orderHeader}><ThemedText type="smallBold">PEDIDO</ThemedText><ThemedText>{order.orderId}</ThemedText><ThemedText style={styles.status}>{order.statusDescription || order.status || 'Processando'}</ThemedText></View><ThemedText type="smallBold">Data do pedido</ThemedText><ThemedText themeColor="textSecondary">{order.creationDate ? new Date(order.creationDate).toLocaleDateString('pt-BR') : 'Não informada'}</ThemedText><ThemedText type="smallBold">Endereço</ThemedText><ThemedText themeColor="textSecondary">{address ? `${address.street || ''}, ${address.number || ''}${address.complement ? ` - ${address.complement}` : ''}\n${address.neighborhood || ''} - ${address.city || ''}, ${address.state || ''} - ${address.postalCode || ''}` : 'Endereço não informado'}</ThemedText><ThemedText type="smallBold">Forma de pagamento</ThemedText><ThemedText themeColor="textSecondary">{payment?.paymentSystemName || 'Não informada'}{payment?.installments ? ` (${payment.installments}x)` : ''} · {money(payment?.value ?? order.value)}</ThemedText><ThemedText type="smallBold">Entrega</ThemedText><ThemedText themeColor="textSecondary">{order.shippingData ? 'Informações de entrega disponíveis no pedido' : 'Entrega não informada'}</ThemedText><ThemedText type="smallBold">Resumo</ThemedText><View style={styles.row}><ThemedText themeColor="textSecondary">Total dos itens:</ThemedText><ThemedText>{money(total(order, ['item']))}</ThemedText></View><View style={styles.row}><ThemedText themeColor="textSecondary">Total do frete:</ThemedText><ThemedText>{money(total(order, ['frete', 'shipping']))}</ThemedText></View><View style={styles.totalRow}><ThemedText type="smallBold">Total:</ThemedText><ThemedText type="smallBold">{money(order.value)}</ThemedText></View><View style={styles.divider} />{(order.items ?? []).map((item, index) => <View key={`${item.name}-${index}`} style={styles.item}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]} />}<View style={styles.itemInfo}><ThemedText numberOfLines={3}>{item.name || 'Produto'}</ThemedText><ThemedText themeColor="textSecondary">{item.quantity ?? 1} un · {money(item.price)}</ThemedText></View></View>)}</ScrollView>}</SafeAreaView></ThemedView>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, safeArea: { flex: 1, padding: Spacing.four }, content: { gap: Spacing.three, paddingVertical: Spacing.five, paddingBottom: 100 }, orderHeader: { paddingBottom: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#dedbd5', position: 'relative' }, status: { position: 'absolute', right: 0, top: 0, backgroundColor: '#eef2f0', padding: Spacing.one, borderRadius: 6 }, row: { flexDirection: 'row', justifyContent: 'space-between' }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.three, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#dedbd5' }, divider: { height: 1, backgroundColor: '#dedbd5' }, item: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#eee' }, image: { width: 44, height: 58, borderRadius: 3, resizeMode: 'cover' }, placeholder: { backgroundColor: '#e8e8ea' }, itemInfo: { flex: 1 } });

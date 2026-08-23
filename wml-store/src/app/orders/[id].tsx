import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator as NativeActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { CustomerOrder, getCustomerOrder, orderStatusLabel } from '@/services/orders';

const ActivityIndicator = () => <NativeActivityIndicator color="#0a0a0a" />;

type Address = { street?: string; number?: string; complement?: string; neighborhood?: string; city?: string; state?: string; postalCode?: string };
type Payment = { paymentSystemName?: string; value?: number; installments?: number };
type Total = { id?: string; name?: string; value?: number };

function money(value?: number) { return `R$ ${((value ?? 0) / 100).toFixed(2).replace('.', ',')}`; }
function total(order: CustomerOrder, names: string[]) { const totals = (order.totals as Total[] | undefined) ?? []; return totals.find((item) => names.some((name) => String(item.name || '').toLowerCase().includes(name)))?.value; }

function OrderText({ children, label = false, secondary = false, style, numberOfLines }: { children: ReactNode; label?: boolean; secondary?: boolean; style?: object; numberOfLines?: number }) {
  return <ThemedText numberOfLines={numberOfLines} themeColor={secondary ? 'textSecondary' : undefined} style={[styles.orderText, label && styles.orderLabel, style]}>{children}</ThemedText>;
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onScroll = useTabBarScroll();
  useEffect(() => { if (id) getCustomerOrder(id).then(setOrder).catch((value) => setError(value instanceof Error ? value.message : 'Não foi possível carregar o pedido.')); }, [id]);
  const address = order?.shippingData && typeof order.shippingData === 'object' ? (order.shippingData as { address?: Address }).address : undefined;
  const payment = order?.paymentData && typeof order.paymentData === 'object' ? (order.paymentData as { transactions?: Array<{ payments?: Payment[] }> }).transactions?.[0]?.payments?.[0] : undefined;
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Meus Pedidos" />{!order && !error && <ActivityIndicator />}{!!error && <OrderText secondary>{error}</OrderText>}{order && <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}><View style={styles.orderHeader}><OrderText label>PEDIDO</OrderText><OrderText>{order.orderId}</OrderText><OrderText style={styles.status}>{orderStatusLabel(order.statusDescription || order.status)}</OrderText></View><OrderText label>Data do pedido</OrderText><OrderText secondary>{order.creationDate ? new Date(order.creationDate).toLocaleDateString('pt-BR') : 'Não informada'}</OrderText><OrderText label>Endereço</OrderText><OrderText secondary>{address ? `${address.street || ''}, ${address.number || ''}${address.complement ? ` - ${address.complement}` : ''}\n${address.neighborhood || ''} - ${address.city || ''}, ${address.state || ''} - ${address.postalCode || ''}` : 'Endereço não informado'}</OrderText><OrderText label>Forma de pagamento</OrderText><OrderText secondary>{payment?.paymentSystemName || 'Não informada'}{payment?.installments ? ` (${payment.installments}x)` : ''} · {money(payment?.value ?? order.value)}</OrderText><OrderText label>Entrega</OrderText><OrderText secondary>{order.shippingData ? 'Informações de entrega disponíveis no pedido' : 'Entrega não informada'}</OrderText><OrderText label>Resumo</OrderText><View style={styles.row}><OrderText secondary>Total dos itens:</OrderText><OrderText>{money(total(order, ['item']))}</OrderText></View><View style={styles.row}><OrderText secondary>Total do frete:</OrderText><OrderText>{money(total(order, ['frete', 'shipping']))}</OrderText></View><View style={styles.totalRow}><OrderText label>Total:</OrderText><OrderText label>{money(order.value)}</OrderText></View><View style={styles.divider} />{(order.items ?? []).map((item, index) => <View key={`${item.name}-${index}`} style={styles.item}>{item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]} />}<View style={styles.itemInfo}><OrderText numberOfLines={3}>{item.name || 'Produto'}</OrderText><OrderText secondary>{item.quantity ?? 1} un · {money(item.price)}</OrderText></View></View>)}</ScrollView>}</SafeAreaView></ThemedView>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, safeArea: { flex: 1, padding: Spacing.four }, content: { gap: Spacing.three, paddingVertical: Spacing.five, paddingBottom: 100 }, orderHeader: { paddingBottom: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#dedbd5', position: 'relative' }, orderText: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16 }, orderLabel: { fontFamily: Fonts.bold, fontSize: 12, lineHeight: 16, fontWeight: '700' }, status: { position: 'absolute', right: 0, top: 0, backgroundColor: '#eef2f0', padding: Spacing.one, borderRadius: 6 }, row: { flexDirection: 'row', justifyContent: 'space-between' }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.three, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#dedbd5' }, divider: { height: 1, backgroundColor: '#dedbd5' }, item: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: '#eee' }, image: { width: 44, height: 58, borderRadius: 3, resizeMode: 'cover' }, placeholder: { backgroundColor: '#e8e8ea' }, itemInfo: { flex: 1 } });

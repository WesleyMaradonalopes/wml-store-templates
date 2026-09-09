import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderStatusBadge } from '@/components/order-status-badge';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { type CustomerOrder, getCustomerOrders } from '@/services/orders';

function money(value?: number | null) {
  const amount = Number(value ?? 0);
  return `R$ ${(Number.isFinite(amount) ? amount : 0).toFixed(2).replace('.', ',')}`;
}

function date(value?: string | null) {
  if (!value) return 'Data não informada';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Data não informada' : parsed.toLocaleDateString('pt-BR');
}

function orderItemCount(order: CustomerOrder) {
  if (typeof order.totalItems === 'number') return order.totalItems;
  return (order.items ?? []).reduce((total, item) => total + Number(item.quantity ?? 0), 0);
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onScroll = useTabBarScroll();

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setOrders(await getCustomerOrders());
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Não foi possível carregar os pedidos.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadOrders();
  }, [loadOrders]));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Meus Pedidos" />
        {loading && <ActivityIndicator color="#0a0a0a" style={styles.loader} />}
        {!!error && <ThemedText style={styles.orderText} themeColor="textSecondary">{error}</ThemedText>}
        <FlatList
          data={orders}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyExtractor={(item, index) => item.orderId || String(index)}
          contentContainerStyle={[styles.list, orders.length === 0 && styles.emptyList]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} tintColor="#0a0a0a" colors={['#0a0a0a']} />}
          ListEmptyComponent={!loading && !error ? <ThemedText style={styles.orderText} themeColor="textSecondary">Você ainda não possui pedidos.</ThemedText> : null}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onDetails={() => router.push({ pathname: '/orders/[id]', params: { id: item.orderId } })}
            />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function OrderCard({ order, onDetails }: { order: CustomerOrder; onDetails: () => void }) {
  const itemCount = orderItemCount(order);
  const itemLabel = itemCount === 1 ? 'item' : 'itens';

  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.orderIdentity}>
          <ThemedText style={styles.orderLabel}>PEDIDO</ThemedText>
          <ThemedText style={styles.orderText} numberOfLines={1}>{order.orderId}</ThemedText>
        </View>
        <OrderStatusBadge status={order.status} statusDescription={order.statusDescription} />
      </View>

      <View style={styles.meta}>
        <View>
          <ThemedText style={styles.orderLabel}>DATA</ThemedText>
          <ThemedText style={styles.orderText} themeColor="textSecondary">{date(order.creationDate)}</ThemedText>
        </View>
        <View style={styles.total}>
          <ThemedText style={styles.orderLabel}>TOTAL ({itemCount} {itemLabel})</ThemedText>
          <ThemedText style={styles.orderText}>{money(order.value ?? order.totalValue)}</ThemedText>
        </View>
      </View>

      {(order.items ?? []).slice(0, 8).map((item, index) => (
        <View key={`${item.id ?? item.name ?? 'item'}-${index}`} style={styles.item}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.thumb} /> : <View style={styles.thumb} />}
          <View style={styles.itemInfo}>
            <ThemedText style={styles.orderText} numberOfLines={2}>{item.name || 'Produto'}</ThemedText>
            <ThemedText style={styles.orderText} themeColor="textSecondary">{item.quantity ?? 1} un · {money(item.price)}</ThemedText>
          </View>
        </View>
      ))}

      <Pressable onPress={onDetails} style={styles.primaryButton}>
        <ThemedText style={styles.primaryText}>Ver detalhes do pedido</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  loader: { marginTop: Spacing.two },
  list: { gap: Spacing.three, paddingVertical: Spacing.three, paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  card: { gap: Spacing.three, padding: Spacing.three, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e2dc' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  orderIdentity: { flex: 1, minWidth: 0 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  total: { alignItems: 'flex-end' },
  orderText: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16 },
  orderLabel: { fontFamily: Fonts.bold, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  item: { flexDirection: 'row', gap: Spacing.two },
  thumb: { width: 42, height: 52, backgroundColor: '#e8e8ea', borderRadius: 4, resizeMode: 'cover' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  primaryButton: { padding: Spacing.three, borderRadius: 8, alignItems: 'center', backgroundColor: '#0a0a0a' },
  primaryText: { color: '#ffffff', fontFamily: Fonts.bold, fontSize: 12, lineHeight: 16, fontWeight: '700' },
});

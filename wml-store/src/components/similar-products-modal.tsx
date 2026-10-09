import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Product } from '@/services/catalog';

import CloseIcon from './icons/CloseIcon';
import { ProductCard } from './product-card';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type SimilarProductsModalProps = {
  currentProduct: Product;
  products: Product[];
  loading?: boolean;
  visible: boolean;
  onClose: () => void;
  onProductPress?: (product: Product) => void;
};

export function SimilarProductsModal({
  currentProduct,
  products,
  loading = false,
  visible,
  onClose,
  onProductPress,
}: SimilarProductsModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerCopy}>
              <ThemedText style={styles.title} type="subtitle">Similares</ThemedText>
              <ThemedText numberOfLines={2} themeColor="textSecondary" style={styles.subtitle}>
                Produtos parecidos com {currentProduct.name}
              </ThemedText>
            </View>
            <Pressable accessibilityLabel="Fechar produtos similares" onPress={onClose} style={styles.closeButton}>
              <CloseIcon color={theme.text} size={22} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.feedback}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText themeColor="textSecondary" style={styles.feedbackText}>Carregando produtos similares...</ThemedText>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.feedback}>
              <ThemedText style={styles.emptyTitle}>Nenhum produto similar encontrado.</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.feedbackText}>Tente novamente mais tarde.</ThemedText>
            </View>
          ) : (
            <FlatList
              data={products}
              numColumns={2}
              keyExtractor={(product) => product.id}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  style={styles.card}
                  showAddedModal
                  onPress={onProductPress}
                />
              )}
            />
          )}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { minHeight: 76, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderBottomWidth: 1 },
  headerCopy: { flex: 1, gap: 2 },
  title: { fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 12, lineHeight: 17 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  feedback: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five, gap: Spacing.two },
  emptyTitle: { fontSize: 16, textAlign: 'center' },
  feedbackText: { fontSize: 13, textAlign: 'center' },
  grid: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
  gridRow: { justifyContent: 'space-between', gap: Spacing.three },
  card: { width: '48%' },
});

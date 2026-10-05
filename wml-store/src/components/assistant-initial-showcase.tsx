import { Fragment, useMemo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { type Product } from '@/services/catalog';

import SmartAiIcon from './icons/SmartAiIcon';
import { ProductCard } from './product-card';
import { ProductCardSkeleton } from './product-card-skeleton';
import { ThemedText } from './themed-text';

const AI_COLOR = '#0a0a0a';

const SUGGESTIONS = [
  { label: 'Dia a dia 🧘‍♀️', query: 'lingerie confortável' },
  { label: 'Presentes 🎁', query: 'presente feminino' },
  { label: 'Conjuntos 💖', query: 'conjunto feminino' },
  { label: 'Lingerie sexy 🔥', query: 'lingerie sensual' },
  { label: 'Verão ☀️', query: 'moda praia feminina' },
];

type AssistantInitialShowcaseProps = {
  products: Product[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onSuggestion: (query: string) => void;
  onSimilar: (product: Product) => void;
  similarLoading?: boolean;
};

function shouldShowSuggestionAfter(index: number) {
  // Mantém o mesmo ritmo da web: depois do segundo produto e, em seguida,
  // depois de cada bloco de três produtos.
  return index >= 1 && (index - 1) % 3 === 0;
}

export function AssistantInitialShowcase({
  products,
  loading,
  error,
  onRetry,
  onSuggestion,
  onSimilar,
  similarLoading = false,
}: AssistantInitialShowcaseProps) {
  const { width } = useWindowDimensions();
  const { colorScheme } = useAppTheme();
  const theme = useTheme();
  const dark = colorScheme === 'dark';
  const suggestions = useMemo(() => [...SUGGESTIONS], []);
  const cardWidth = Math.min(190, Math.max(132, Math.floor((width - 40) / 2)));

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((item) => (
            <ProductCardSkeleton key={item} style={{ width: cardWidth }} />
          ))}
        </View>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.empty}>
        <ThemedText themeColor="textSecondary" style={[styles.emptyText, error && styles.errorText]}>
          {error || 'Ainda não encontramos novidades para mostrar.'}
        </ThemedText>
        <Pressable onPress={onRetry} style={[styles.retryButton, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">Tentar novamente</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {products.map((product, index) => {
          const suggestion = shouldShowSuggestionAfter(index)
            ? suggestions[Math.floor((index - 1) / 3) % suggestions.length]
            : null;

          return (
            <Fragment key={product.id}>
              <View style={{ width: cardWidth }}>
                <ProductCard
                  product={product}
                  showAddedModal
                  onSimilar={() => onSimilar(product)}
                  similarLoading={similarLoading}
                />
              </View>
              {suggestion && (
                <Pressable
                  accessibilityLabel={`Buscar ${suggestion.label}`}
                  onPress={() => onSuggestion(suggestion.query)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    {
                      width: cardWidth,
                      minHeight: Math.round(cardWidth / 0.60),
                      backgroundColor: dark ? theme.surfaceMuted : '#dedede',
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.suggestionIcon, { backgroundColor: dark ? theme.background : '#FFFFFF' }]}>
                    <SmartAiIcon color={dark ? theme.text : AI_COLOR} size={22} />
                  </View>
                  <ThemedText style={[styles.suggestionText, { color: dark ? theme.text : AI_COLOR }]}>
                    {suggestion.label}
                  </ThemedText>
                </Pressable>
              )}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 14, alignItems: 'flex-start' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 32 },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  errorText: { color: '#ed6560' },
  retryButton: { minHeight: 38, paddingHorizontal: 16, borderWidth: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  suggestion: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: 8, borderRadius: 8 },
  suggestionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  suggestionText: { fontSize: 13, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});

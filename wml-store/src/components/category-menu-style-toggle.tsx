import { Pressable, StyleSheet, View } from 'react-native';

import type { CategoryMenuStyle } from '@/context/category-menu-style-context';
import { useTheme } from '@/hooks/use-theme';

type CategoryMenuStyleToggleProps = {
  value: CategoryMenuStyle;
  onToggle: () => void;
};

export function CategoryMenuStyleToggle({ value, onToggle }: CategoryMenuStyleToggleProps) {
  const theme = useTheme();
  const classic = value === 'classic';

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={`Estilo do menu: ${classic ? 'padrão do app' : 'imagem de fundo'}`}
      accessibilityHint={`Toque para alternar para ${classic ? 'imagem de fundo' : 'padrão do app'}. A escolha vale apenas nesta sessão.`}
      accessibilityState={{ checked: !classic }}
      hitSlop={6}
      onPress={onToggle}
      style={[styles.track, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
      <View style={[styles.thumb, classic ? styles.leftThumb : styles.rightThumb, { backgroundColor: theme.background }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 30,
    padding: 3,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
  },
  thumb: { width: 22, height: 22, borderRadius: 12 },
  leftThumb: { alignSelf: 'flex-start' },
  rightThumb: { alignSelf: 'flex-end' },
});

import { useRouter } from 'expo-router';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import SmartAiIcon from './icons/SmartAiIcon';

type AssistantHeaderButtonProps = {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function AssistantHeaderButton({ color = '#0a0a0a', size = 30, style, onPress }: AssistantHeaderButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Abrir assistente de compras"
      onPress={onPress ?? (() => router.push('/assistant' as never))}
      style={[styles.button, style]}
    >
      <SmartAiIcon color={color} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
});

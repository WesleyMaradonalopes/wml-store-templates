import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import SmartAiIcon from './icons/SmartAiIcon';

// Set to false to keep the AI header icon static without removing its animation.
const AI_HEADER_BOUNCE_ENABLED = false;
const BOUNCE_HOLD_MS = 480;

type AssistantHeaderButtonProps = {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function AssistantHeaderButton({ color = '#FFFFFF', size = 30, style, onPress }: AssistantHeaderButtonProps) {
  const router = useRouter();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!AI_HEADER_BOUNCE_ENABLED) return;

    translateY.value = withRepeat(
      withSequence(
        ReduceMotion.System,
        withTiming(0, { duration: BOUNCE_HOLD_MS }),
        withTiming(-10, { duration: BOUNCE_HOLD_MS }),
        withTiming(0, { duration: BOUNCE_HOLD_MS / 2 }),
        withTiming(-5, { duration: BOUNCE_HOLD_MS / 2 }),
        withTiming(0, { duration: BOUNCE_HOLD_MS }),
        withTiming(0, { duration: BOUNCE_HOLD_MS }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
    scale.value = withRepeat(
      withSequence(
        ReduceMotion.System,
        withTiming(1, { duration: BOUNCE_HOLD_MS }),
        withTiming(1.03, { duration: BOUNCE_HOLD_MS }),
        withTiming(1, { duration: BOUNCE_HOLD_MS / 2 }),
        withTiming(1.06, { duration: BOUNCE_HOLD_MS / 2 }),
        withTiming(1, { duration: BOUNCE_HOLD_MS }),
        withTiming(1, { duration: BOUNCE_HOLD_MS }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  }, [scale, translateY]);

  const iconAnimationStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityLabel="Abrir assistente de compras"
      onPress={onPress ?? (() => router.push('/assistant' as never))}
      style={[styles.button, style]}
    >
      <Animated.View
        style={[
          styles.iconCircle,
          { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 },
          iconAnimationStyle,
        ]}
      >
        <SmartAiIcon color={color} size={size} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
});

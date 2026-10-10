import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import SmartAiIcon from './icons/SmartAiIcon';

type AiHeaderAnimationMode = 'none' | 'bounce' | 'sequential-sparkles';

// Options: 'sequential-sparkles', 'bounce' or 'none'.
const AI_HEADER_ANIMATION_MODE: AiHeaderAnimationMode = 'none';
const BOUNCE_HOLD_MS = 480;
const SPARKLE_FADE_IN_MS = 240;
const SPARKLE_HOLD_MS = 260;
const SPARKLE_FADE_OUT_MS = 300;
const SPARKLE_CYCLE_MS = 1800;
const SPARKLE_STEP_MS = SPARKLE_CYCLE_MS / 3;
const SPARKLE_HIDDEN_MS = SPARKLE_CYCLE_MS - SPARKLE_FADE_IN_MS - SPARKLE_HOLD_MS - SPARKLE_FADE_OUT_MS;

type AssistantHeaderButtonProps = {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

function useSequentialSparkleStyle(delay: number, reduceMotion: boolean) {
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          ReduceMotion.System,
          withTiming(1, { duration: SPARKLE_FADE_IN_MS }),
          withTiming(1, { duration: SPARKLE_HOLD_MS }),
          withTiming(0, { duration: SPARKLE_FADE_OUT_MS }),
          withTiming(0, { duration: SPARKLE_HIDDEN_MS }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
      ReduceMotion.System,
    );
  }, [delay, opacity, reduceMotion]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function SequentialSparkles({ color, size }: { color: string; size: number }) {
  const reduceMotion = useReducedMotion();
  const mediumStyle = useSequentialSparkleStyle(0, reduceMotion);
  const largeStyle = useSequentialSparkleStyle(SPARKLE_STEP_MS, reduceMotion);
  const smallStyle = useSequentialSparkleStyle(SPARKLE_STEP_MS * 2, reduceMotion);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View pointerEvents="none" style={[styles.sparkleLayer, mediumStyle]}>
        <SmartAiIcon color={color} size={size} sparkle="medium" />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.sparkleLayer, largeStyle]}>
        <SmartAiIcon color={color} size={size} sparkle="large" />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.sparkleLayer, smallStyle]}>
        <SmartAiIcon color={color} size={size} sparkle="small" />
      </Animated.View>
    </View>
  );
}

export function AssistantHeaderButton({ color = '#FFFFFF', size = 30, style, onPress }: AssistantHeaderButtonProps) {
  const router = useRouter();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (AI_HEADER_ANIMATION_MODE !== 'bounce') return;

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
          AI_HEADER_ANIMATION_MODE === 'bounce' && iconAnimationStyle,
        ]}
      >
        {AI_HEADER_ANIMATION_MODE === 'sequential-sparkles'
          ? <SequentialSparkles color={color} size={size} />
          : <SmartAiIcon color={color} size={size} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  sparkleLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});

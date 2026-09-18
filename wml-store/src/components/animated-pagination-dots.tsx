import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle, type ViewProps } from 'react-native';

type Props = {
  count: number;
  activeIndex: number;
  activeWidth: number;
  activeColor: string;
  inactiveColor: string;
  dotSize?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps['pointerEvents'];
  accessibilityLabel?: string;
};

function AnimatedDot({ active, activeWidth, activeColor, inactiveColor, dotSize }: Omit<Props, 'count' | 'activeIndex' | 'gap' | 'style' | 'accessibilityLabel'> & { active: boolean }) {
  const width = useRef(new Animated.Value(active ? activeWidth : dotSize ?? 5)).current;
  const inactiveWidth = dotSize ?? 5;

  useEffect(() => {
    const animation = Animated.timing(width, {
      toValue: active ? activeWidth : inactiveWidth,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [active, activeWidth, inactiveWidth, width]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          height: inactiveWidth,
          borderRadius: inactiveWidth / 2,
          backgroundColor: active ? activeColor : inactiveColor,
        },
      ]}
    />
  );
}

export function AnimatedPaginationDots({ count, activeIndex, activeWidth, activeColor, inactiveColor, dotSize = 5, gap = 5, style, pointerEvents, accessibilityLabel }: Props) {
  if (count <= 0) return null;

  const safeActiveIndex = Math.max(0, Math.min(activeIndex, count - 1));

  return (
    <View accessibilityLabel={accessibilityLabel} pointerEvents={pointerEvents} style={[styles.container, { gap }, style]}>
      {Array.from({ length: count }, (_, index) => (
        <AnimatedDot
          key={index}
          active={index === safeActiveIndex}
          activeWidth={activeWidth}
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          dotSize={dotSize}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center' },
  dot: { minWidth: 1 },
});

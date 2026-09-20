import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ style }: Props) {
  return <View pointerEvents="none" style={[styles.block, style]} />;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#e5e7eb',
  },
});

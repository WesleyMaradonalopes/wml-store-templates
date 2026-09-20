import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SkeletonBlock } from './skeleton';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function ProductCardSkeleton({ style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonBlock style={styles.image} />
      <View style={styles.nameArea}>
        <SkeletonBlock style={styles.nameLine} />
        <SkeletonBlock style={styles.nameLineShort} />
      </View>
      <View style={styles.priceArea}>
        <SkeletonBlock style={styles.priceLine} />
        <SkeletonBlock style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 0,
    gap: 5,
  },
  image: {
    width: '100%',
    aspectRatio: 0.76,
    borderRadius: 8,
  },
  nameArea: {
    minHeight: 38,
    gap: 5,
  },
  nameLine: {
    width: '100%',
    height: 14,
    borderRadius: 4,
  },
  nameLineShort: {
    width: '68%',
    height: 14,
    borderRadius: 4,
  },
  priceArea: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceLine: {
    width: '48%',
    height: 16,
    borderRadius: 4,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});

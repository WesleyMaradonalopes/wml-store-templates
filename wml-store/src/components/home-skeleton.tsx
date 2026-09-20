import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { SkeletonBlock } from './skeleton';

export function HomeSkeleton() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const heroHeight = Math.max(220, Math.min(Math.round(screenHeight * 0.42), Math.round(screenWidth * 1.1)));
  const gridHeight = Math.max(180, Math.round(screenWidth * 0.58));
  const bannerHeight = Math.max(150, Math.round(screenWidth * 0.42));

  return (
    <View style={styles.container}>
      <SkeletonBlock style={[styles.hero, { height: heroHeight }]} />
      <View style={styles.gridRow}>
        <SkeletonBlock style={[styles.gridCard, { height: gridHeight }]} />
        <SkeletonBlock style={[styles.gridCard, { height: gridHeight }]} />
      </View>
      <SkeletonBlock style={[styles.banner, { height: bannerHeight }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    width: '100%',
  },
  hero: {
    width: '100%',
    borderRadius: 0,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  gridCard: {
    flex: 1,
    borderRadius: 8,
  },
  banner: {
    width: '100%',
    borderRadius: 8,
  },
});

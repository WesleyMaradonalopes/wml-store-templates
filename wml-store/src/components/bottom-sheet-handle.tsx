import { StyleSheet, View } from 'react-native';

/**
 * Visual affordance used by sheets and slide-in modals to indicate that the
 * panel can be pulled down. The close behavior remains owned by each modal.
 */
export function BottomSheetHandle() {
  return (
    <View accessible accessibilityLabel="Indicador de arraste" style={styles.container}>
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 64,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#C9C4BE',
  },
});

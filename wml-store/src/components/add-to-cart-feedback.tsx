import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

type Props = {
  message?: string | null;
  duration?: number;
};

export function AddToCartFeedback({ message, duration = 2600 }: Props) {
  const [visible, setVisible] = useState(false);
  const success = Boolean(message?.toLowerCase().includes('adicionad'));

  useEffect(() => {
    if (!message || !success) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timeout = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timeout);
  }, [duration, message, success]);

  if (!message || !success || !visible) return null;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={[styles.popup, styles.successPopup]}>
        <ThemedText style={styles.text}>Adicionado à sacola com sucesso!</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  popup: {
    maxWidth: '92%',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  successPopup: { backgroundColor: '#358846' },
  text: { color: '#FFFFFF', textAlign: 'center', fontSize: 14, fontWeight: '600' },
});

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

type LoginRequiredModalProps = {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
};

export function LoginRequiredModal({ visible, onClose, onLogin }: LoginRequiredModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>Favoritos</ThemedText>
            <Pressable accessibilityLabel="Fechar aviso de favoritos" onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeText}>✕</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={styles.message}>Entre na sua conta ou crie uma para favoritar seus itens preferidos</ThemedText>
          <Pressable accessibilityRole="button" onPress={onLogin} style={styles.loginButton}>
            <ThemedText style={styles.loginText}>Entrar</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, backgroundColor: 'rgba(0, 0, 0, 0.52)' },
  card: { width: '100%', maxWidth: 380, gap: Spacing.three, padding: Spacing.five, borderRadius: 18, backgroundColor: '#FFFFFF', elevation: 8, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  header: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1 },
  closeButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#000000', fontSize: 24, lineHeight: 28, fontWeight: '400' },
  message: { color: '#393531', fontSize: 15, lineHeight: 23 },
  loginButton: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e120d' },
  loginText: { color: '#FFFFFF', fontWeight: '700' },
});

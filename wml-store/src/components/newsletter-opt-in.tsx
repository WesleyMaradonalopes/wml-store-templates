import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';

export function NewsletterOptIn({ value, onChange, onPrivacyPress, disabled = false, outlined = false }: { value: boolean; onChange: (value: boolean) => void; onPrivacyPress: () => void; disabled?: boolean; outlined?: boolean }) {
  return <View style={[styles.container, outlined && styles.containerOutlined, disabled && styles.disabled]}>
    <View style={styles.toggleRow}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)} style={[styles.checkbox, value && styles.checkboxSelected]}>
        {value && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
      </Pressable>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => onChange(!value)} style={styles.labelPressable}>
        <ThemedText style={styles.label}>Desejo receber novidades e ofertas por e-mail</ThemedText>
      </Pressable>
    </View>
    <ThemedText style={styles.legalText}>Ao marcar esta opção, você concorda com o tratamento dos seus dados conforme a <Text onPress={onPrivacyPress} style={styles.privacyLink}>Política de Privacidade.</Text></ThemedText>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 4, paddingTop: 10 },
  containerOutlined: { padding: Spacing.three, borderRadius: 12, borderWidth: 1, borderColor: '#e6e2dc', backgroundColor: '#ffffff' },
  disabled: { opacity: 0.55 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#aaa49c', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checkboxSelected: { borderColor: '#0a0a0a', backgroundColor: '#0a0a0a' },
  checkboxMark: { color: '#FFFFFF', fontFamily: Fonts.bold, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  labelPressable: { flex: 1 },
  label: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  legalText: { color: '#8b8680', fontFamily: Fonts.sans, fontSize: 9, lineHeight: 12 },
  privacyLink: { color: '#4f4b47', fontFamily: Fonts.sans, textDecorationLine: 'underline' },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';

export function NewsletterOptIn({ value, onChange, onPrivacyPress, disabled = false }: { value: boolean; onChange: (value: boolean) => void; onPrivacyPress: () => void; disabled?: boolean }) {
  return <View style={[styles.container, disabled && styles.disabled]}>
    <View style={styles.toggleRow}>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} disabled={disabled} onPress={() => onChange(!value)} style={[styles.switch, value && styles.switchActive]}>
        <View style={styles.switchThumb} />
      </Pressable>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={() => onChange(!value)} style={styles.labelPressable}>
        <ThemedText style={styles.label}>Desejo receber novidades e ofertas por e-mail</ThemedText>
      </Pressable>
    </View>
    <ThemedText style={styles.legalText}>Ao marcar esta opção, você concorda com o tratamento dos seus dados conforme a <Text onPress={onPrivacyPress} style={styles.privacyLink}>Política de Privacidade.</Text></ThemedText>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 4, paddingTop: 2 },
  disabled: { opacity: 0.55 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  switch: { width: 28, height: 17, padding: 2, borderRadius: 10, alignItems: 'flex-start', justifyContent: 'center', backgroundColor: '#d9d3cc' },
  switchActive: { alignItems: 'flex-end', backgroundColor: '#0a0a0a' },
  switchThumb: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#FFFFFF' },
  labelPressable: { flex: 1 },
  label: { fontFamily: Fonts.sans, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  legalText: { color: '#8b8680', fontFamily: Fonts.sans, fontSize: 9, lineHeight: 12 },
  privacyLink: { color: '#4f4b47', fontFamily: Fonts.sans, textDecorationLine: 'underline' },
});

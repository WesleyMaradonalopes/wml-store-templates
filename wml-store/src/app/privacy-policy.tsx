import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Política de privacidade" onBack={() => router.back()} showSearch={false} showCart={false} /><ScrollView contentContainerStyle={styles.content}><ThemedText style={styles.title}>Política de privacidade</ThemedText><ThemedText style={styles.text}>O conteúdo desta página será disponibilizado em breve.</ThemedText></ScrollView></SafeAreaView></ThemedView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  content: { gap: Spacing.three, paddingVertical: Spacing.three },
  title: { fontFamily: Fonts.bold, fontSize: 18, lineHeight: 24 },
  text: { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20 },
});

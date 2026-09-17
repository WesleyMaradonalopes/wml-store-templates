import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Fonts, Spacing } from '@/constants/theme';

import CloseIcon from './icons/CloseIcon';
import { ThemedText } from './themed-text';

type SizebayModalProps = {
  visible: boolean;
  frameUrl: string;
  title: string;
  onClose: () => void;
};

export function SizebayModal({ visible, frameUrl, title, onClose }: SizebayModalProps) {
  if (!frameUrl) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <Pressable accessibilityLabel={`Fechar ${title}`} onPress={onClose} style={styles.closeButton}>
              <CloseIcon color="#0F0805" size={24} />
            </Pressable>
          </View>

          <View style={styles.webViewContainer}>
            <WebView
              source={{ uri: frameUrl }}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              setSupportMultipleWindows={false}
              style={styles.webView}
            />
          </View>

          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.footerButton}>
              <ThemedText style={styles.footerButtonText}>Fechar</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    minHeight: 64,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3DC',
    backgroundColor: '#FFFFFF',
  },
  title: { flex: 1, color: '#0F0805', fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: '400' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  webViewContainer: { flex: 1, position: 'relative', backgroundColor: '#FFFFFF' },
  webView: { flex: 1, backgroundColor: '#FFFFFF' },
  footer: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderTopWidth: 1, borderTopColor: '#E8E3DC', backgroundColor: '#FFFFFF' },
  footerButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#7B7772', borderRadius: 5, backgroundColor: '#FFFFFF' },
  footerButtonText: { color: '#0F0805', fontFamily: Fonts.bold, fontSize: 15, lineHeight: 20, fontWeight: '700' },
});

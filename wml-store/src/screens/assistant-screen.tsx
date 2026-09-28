import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ImagePickerAsset } from 'expo-image-picker';

import ArrowLeftIAIcon from '@/components/icons/ArrowLeftIAicon';
import CameraAiIcon from '@/components/icons/CameraAiIcon';
import CloseIcon from '@/components/icons/CloseIcon';
import MicrophoneIcon from '@/components/icons/MicrophoneIcon';
import RefreshAiIcon from '@/components/icons/RefreshAiIcon';
import SendAiIcon from '@/components/icons/SendAiIcon';
import SmartAiIcon from '@/components/icons/SmartAiIcon';
import { ProductCard } from '@/components/product-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TabBarContext } from '@/context/tab-bar-context';
import { useAppTheme } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';
import { getProduct, type Product } from '@/services/catalog';
import {
  analyzeAssistantImage,
  sendAssistantMessage,
  type AssistantHistoryItem,
  type AssistantProductRecommendation,
} from '@/services/assistant';
import {
  abortSpeechRecognition,
  isSpeechRecognitionAvailable,
  isSpeechRecognitionModuleInstalled,
  requestSpeechRecognitionPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
  subscribeSpeechRecognitionEvent,
  type VoiceRecognitionErrorEvent,
  type VoiceRecognitionResultEvent,
} from '@/services/speech-recognition';

const AI_COLOR = '#2f2e26';
const MAX_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
type ImagePickerModule = typeof import('expo-image-picker');
let imagePickerModule: ImagePickerModule | null | undefined;

async function loadImagePicker(): Promise<ImagePickerModule | null> {
  if (imagePickerModule !== undefined) return imagePickerModule;

  try {
    imagePickerModule = await import('expo-image-picker');
  } catch {
    imagePickerModule = null;
  }

  return imagePickerModule;
}

type AssistantProductView = AssistantProductRecommendation & {
  product: Product;
};

type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  products?: AssistantProductView[];
};

const SUGGESTIONS = [
  'Quero um look para a praia',
  'Me mostre peças para academia',
  'Procuro um presente',
];

function previewProduct(item: AssistantProductRecommendation): Product {
  return {
    id: item.id,
    name: item.name,
    linkText: item.linkText,
    productReference: '',
    description: '',
    brand: '',
    color: '',
    composition: '',
    care: '',
    images: item.imageUrl ? [item.imageUrl] : [],
    itemId: '',
    sellerId: '1',
    imageUrl: item.imageUrl,
    price: item.price,
    listPrice: item.listPrice,
    collection: '',
    gender: '',
    isKit: false,
    kitGroups: [],
    variants: [],
  };
}

function productViews(items: AssistantProductRecommendation[]): AssistantProductView[] {
  return items.map((item) => ({ ...item, product: previewProduct(item) }));
}

function historyFromMessages(messages: AssistantMessage[]): AssistantHistoryItem[] {
  return messages
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.text || (message.imageUri ? '[Imagem enviada pelo cliente]' : ''),
    }))
    .filter((message) => message.content);
}

export default function AssistantScreen() {
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const theme = useTheme();
  const { setHidden } = useContext(TabBarContext);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isStartingVoice, setIsStartingVoice] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const sendMessageRef = useRef<(value: string) => void>(() => undefined);
  const chatBackground = colorScheme === 'dark' ? '#252b30' : '#eaeef2';
  const assistantBubbleBackground = colorScheme === 'dark' ? theme.backgroundElement : '#FFFFFF';
  const assistantTextColor = colorScheme === 'dark' ? theme.text : AI_COLOR;

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    const startSubscription = subscribeSpeechRecognitionEvent('start', () => {
      setIsListening(true);
      setStatusMessage('');
    });
    const endSubscription = subscribeSpeechRecognitionEvent('end', () => setIsListening(false));
    const resultSubscription = subscribeSpeechRecognitionEvent('result', (event: VoiceRecognitionResultEvent) => {
      const value = event.results[0]?.transcript?.trim() ?? '';
      if (!value) return;
      setDraft(value);
      if (event.isFinal) sendMessageRef.current(value);
    });
    const errorSubscription = subscribeSpeechRecognitionEvent('error', (event: VoiceRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error === 'aborted') return;
      if (event.error === 'no-speech') {
        setStatusMessage('Não identificamos sua voz. Tente falar novamente.');
        return;
      }
      if (event.error === 'not-allowed') {
        setStatusMessage('Permita o acesso ao microfone para conversar por voz.');
        return;
      }
      setStatusMessage('A conversa por voz não está disponível neste dispositivo.');
    });

    return () => {
      startSubscription?.remove();
      endSubscription?.remove();
      resultSubscription?.remove();
      errorSubscription?.remove();
      abortSpeechRecognition();
    };
  }, []);

  async function hydrateProducts(messageId: string, recommendations: AssistantProductRecommendation[]) {
    const results = await Promise.allSettled(recommendations.map((item) => getProduct(item.id)));
    setMessages((current) => current.map((message) => {
      if (message.id !== messageId || !message.products) return message;
      return {
        ...message,
        products: message.products.map((item, index) => {
          const result = results[index];
          return result?.status === 'fulfilled' ? { ...item, product: result.value } : item;
        }),
      };
    }));
  }

  async function sendMessage(value: string) {
    const message = value.trim();
    if (!message || loading) return;

    Keyboard.dismiss();
    setDraft('');
    setStatusMessage('');
    const userMessage: AssistantMessage = { id: `user-${Date.now()}`, role: 'user', text: message };
    const requestHistory = historyFromMessages(messages);
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await sendAssistantMessage(message, requestHistory);
      const assistantMessageId = `assistant-${Date.now()}`;
      setMessages((current) => [...current, {
        id: assistantMessageId,
        role: 'assistant',
        text: response.message,
        products: productViews(response.products),
      }]);
      if (response.products.length > 0) void hydrateProducts(assistantMessageId, response.products);
    } catch (error) {
      setMessages((current) => [...current, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Não consegui buscar agora. Tente novamente em instantes 💛',
      }]);
    } finally {
      setLoading(false);
    }
  }

  sendMessageRef.current = (value: string) => { void sendMessage(value); };

  async function toggleVoice() {
    if (isListening) {
      stopSpeechRecognition();
      return;
    }
    if (loading || isStartingVoice) return;

    setIsStartingVoice(true);
    setStatusMessage('');
    try {
      if (!isSpeechRecognitionModuleInstalled()) {
        setStatusMessage('A conversa por voz precisa de uma nova versão do aplicativo.');
        return;
      }
      if (!isSpeechRecognitionAvailable()) {
        setStatusMessage('A conversa por voz não está disponível neste dispositivo.');
        return;
      }
      const permission = await requestSpeechRecognitionPermissions();
      if (!permission?.granted) {
        setStatusMessage('Permita o acesso ao microfone para conversar por voz.');
        return;
      }
      startSpeechRecognition({
        lang: 'pt-BR',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        contextualStrings: ['biquíni', 'maiô', 'top', 'legging', 'vestido', 'jaqueta', 'short', 'bermuda', 'look'],
      });
    } catch {
      setIsListening(false);
      setStatusMessage('Não foi possível iniciar a conversa por voz.');
    } finally {
      setIsStartingVoice(false);
    }
  }

  async function sendImageAsset(asset: ImagePickerAsset) {
    const base64 = asset.base64?.trim();
    if (!base64) {
      setStatusMessage('Não foi possível ler essa imagem. Tente escolher outra foto.');
      return;
    }

    const declaredMimeType = String(asset.mimeType || 'image/jpeg').toLowerCase();
    const mimeType = declaredMimeType === 'image/jpg' ? 'image/jpeg' : declaredMimeType;
    if (!MAX_IMAGE_TYPES.has(mimeType)) {
      setStatusMessage('Envie uma imagem JPG, PNG ou WEBP, por favor.');
      return;
    }

    Keyboard.dismiss();
    setDraft('');
    setStatusMessage('');
    setMessages((current) => [...current, {
      id: `image-${Date.now()}`,
      role: 'user',
      text: '',
      imageUri: asset.uri,
    }]);
    setLoading(true);

    try {
      const response = await analyzeAssistantImage(`data:${mimeType};base64,${base64}`);
      const assistantMessageId = `assistant-image-${Date.now()}`;
      setMessages((current) => [...current, {
        id: assistantMessageId,
        role: 'assistant',
        text: response.message,
        products: productViews(response.products),
      }]);
      if (response.products.length > 0) void hydrateProducts(assistantMessageId, response.products);
    } catch (error) {
      setMessages((current) => [...current, {
        id: `assistant-image-error-${Date.now()}`,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Não consegui analisar essa imagem agora. Tente novamente em instantes 💛',
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function pickImage(source: 'camera' | 'library') {
    try {
      const imagePicker = await loadImagePicker();
      if (!imagePicker) {
        setStatusMessage('A busca por imagem precisa de uma nova versão do aplicativo.');
        return;
      }

      if (Platform.OS !== 'web') {
        const permission = source === 'camera'
          ? await imagePicker.requestCameraPermissionsAsync()
          : await imagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setStatusMessage(source === 'camera'
            ? 'Permita o acesso à câmera para buscar produtos por imagem.'
            : 'Permita o acesso às fotos para buscar produtos por imagem.');
          return;
        }
      }

      const result = source === 'camera'
        ? await imagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, base64: true })
        : await imagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
      if (!result.canceled && result.assets[0]) await sendImageAsset(result.assets[0]);
    } catch {
      setStatusMessage('Não foi possível abrir as imagens agora. Tente novamente.');
    }
  }

  function openImagePicker() {
    if (Platform.OS === 'web') {
      void pickImage('library');
      return;
    }

    Alert.alert('Buscar por imagem', 'Escolha de onde deseja enviar a imagem.', [
      { text: 'Câmera', onPress: () => void pickImage('camera') },
      { text: 'Galeria', onPress: () => void pickImage('library') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function clearConversation() {
    abortSpeechRecognition();
    setIsListening(false);
    setDraft('');
    setMessages([]);
    setLoading(false);
    setStatusMessage('');
    Keyboard.dismiss();
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.headerIconButton}>
              <ArrowLeftIAIcon color={theme.text} size={22} />
            </Pressable>
            <View style={styles.headerTitle}>
              <View style={styles.headerLogo}>
                <SmartAiIcon color="#FFFFFF" size={20} />
              </View>
              <ThemedText style={[styles.headerTitleText, { color: theme.text }]}>Hope Resort AI</ThemedText>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Limpar conversa" onPress={clearConversation} style={styles.headerIconButton}>
              <RefreshAiIcon color={theme.text} size={18} />
            </Pressable>
            <Pressable accessibilityLabel="Fechar assistente" onPress={() => router.back()} style={styles.headerIconButton}>
              <CloseIcon color={theme.text} size={22} />
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
          <ScrollView
            ref={scrollRef}
            style={[styles.chatArea, { backgroundColor: chatBackground }]}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.messages, messages.length === 0 && styles.emptyMessages]}
            showsVerticalScrollIndicator={false}>
            {messages.length === 0 && !loading && (
              <View style={styles.welcome}>
                <View style={styles.welcomeLogo}>
                  <SmartAiIcon color="#FFFFFF" size={34} />
                </View>
                <ThemedText style={[styles.welcomeTitle, { color: assistantTextColor }]}>Como posso te ajudar?</ThemedText>
                <ThemedText style={[styles.welcomeSubtitle, { color: colorScheme === 'dark' ? theme.textSecondary : '#68697b' }]}>
                  Posso recomendar produtos, montar looks e ajudar você a encontrar exatamente o que procura.
                </ThemedText>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((suggestion) => (
                    <Pressable key={suggestion} onPress={() => void sendMessage(suggestion)} style={[styles.suggestion, { borderColor: theme.border, backgroundColor: assistantBubbleBackground }]}>
                      <ThemedText style={{ color: assistantTextColor }} type="small">{suggestion}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {messages.map((message) => (
              <View key={message.id} style={message.role === 'user' ? styles.userRow : styles.assistantRow}>
                {(message.text || message.imageUri) && (
                  <View style={[
                    styles.bubble,
                    message.role === 'user'
                      ? styles.userBubble
                      : [styles.assistantBubble, { backgroundColor: assistantBubbleBackground }],
                    message.imageUri && styles.imageBubble,
                  ]}>
                    {message.imageUri && <Image source={{ uri: message.imageUri }} contentFit="cover" style={styles.userImage} />}
                    {!!message.text && <ThemedText style={message.role === 'user' ? styles.userText : { color: assistantTextColor }}>{message.text}</ThemedText>}
                  </View>
                )}
                {message.products && message.products.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRow}>
                    {message.products.map((item) => (
                      <View key={`${message.id}-${item.id}`} style={styles.productCard}>
                        <ProductCard product={item.product} showAddedModal />
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}

            {loading && (
              <View style={styles.typingBubble}>
                <View style={styles.typingLogo}>
                  <SmartAiIcon color="#FFFFFF" size={17} />
                </View>
                <View style={styles.typingDots}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            )}
          </ScrollView>

          {!!statusMessage && (
            <View style={[styles.statusArea, { backgroundColor: chatBackground }]}>
              <ThemedText themeColor="textSecondary" style={styles.status}>{statusMessage}</ThemedText>
            </View>
          )}

          <View style={[styles.composerBar, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            <View style={[styles.composer, { borderColor: theme.border, backgroundColor: colorScheme === 'dark' ? theme.inputBackground : '#FFFFFF' }]}>
              <Pressable
                accessibilityLabel="Enviar foto ou imagem"
                disabled={loading}
                onPress={openImagePicker}
                style={styles.composerIconButton}>
                <CameraAiIcon color={loading ? theme.textSecondary : assistantTextColor} size={22} />
              </Pressable>
              <Pressable
                accessibilityLabel={isListening ? 'Parar conversa por voz' : 'Falar com o assistente'}
                disabled={loading || isStartingVoice}
                onPress={() => void toggleVoice()}
                style={[styles.composerIconButton, isListening && styles.listeningButton]}>
                <MicrophoneIcon size={21} color={isListening ? '#B42318' : assistantTextColor} />
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                editable={!loading}
                maxLength={600}
                multiline
                placeholder={isListening ? 'Ouvindo você...' : 'O que você procura?'}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }]}
                onSubmitEditing={() => { if (!loading) void sendMessage(draft); }}
              />
              <Pressable
                accessibilityLabel="Enviar mensagem"
                disabled={loading || !draft.trim()}
                onPress={() => void sendMessage(draft)}
                style={[styles.sendButton, (loading || !draft.trim()) && styles.disabledButton]}>
                <SendAiIcon color="#FFFFFF" size={21} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { minHeight: 58, paddingHorizontal: 10, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 2 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitleText: { fontSize: 15, fontWeight: '500' },
  headerLogo: { width: 28, height: 28, borderRadius: 14, backgroundColor: AI_COLOR, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerIconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  content: { flex: 1 },
  chatArea: { flex: 1 },
  messages: { flexGrow: 1, gap: 10, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 14 },
  emptyMessages: { paddingTop: 28 },
  welcome: { alignItems: 'center', width: '100%', paddingHorizontal: 16 },
  welcomeLogo: { width: 64, height: 64, borderRadius: 32, backgroundColor: AI_COLOR, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  welcomeTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  welcomeSubtitle: { maxWidth: 310, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  suggestions: { alignSelf: 'stretch', alignItems: 'flex-start', gap: 8, marginTop: 22 },
  suggestion: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  assistantRow: { alignItems: 'flex-start', gap: 8 },
  userRow: { alignItems: 'flex-end', gap: 8 },
  bubble: { maxWidth: '88%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  assistantBubble: { borderBottomLeftRadius: 3 },
  userBubble: { backgroundColor: AI_COLOR, borderBottomRightRadius: 3 },
  imageBubble: { padding: 4, overflow: 'hidden' },
  userImage: { width: 184, height: 184, borderRadius: 12 },
  userText: { color: '#FFFFFF' },
  productsRow: { gap: 12, paddingRight: 14 },
  productCard: { width: 170 },
  typingBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 16, borderBottomLeftRadius: 3, paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  typingLogo: { width: 26, height: 26, borderRadius: 13, backgroundColor: AI_COLOR, alignItems: 'center', justifyContent: 'center' },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AI_COLOR },
  statusArea: { paddingHorizontal: 14, paddingTop: 2 },
  status: { fontSize: 12, paddingBottom: 5 },
  composerBar: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 5 },
  composer: { minHeight: 48, maxHeight: 116, borderWidth: 1, borderRadius: 25, paddingLeft: 5, paddingRight: 5, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  composerIconButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  listeningButton: { backgroundColor: '#F4D8D8', borderRadius: 20 },
  input: { flex: 1, minHeight: 40, maxHeight: 92, paddingHorizontal: 5, paddingTop: 10, paddingBottom: 9, fontSize: 14 },
  sendButton: { width: 36, height: 36, borderRadius: 18, marginBottom: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: AI_COLOR },
  disabledButton: { opacity: 0.45 },
});

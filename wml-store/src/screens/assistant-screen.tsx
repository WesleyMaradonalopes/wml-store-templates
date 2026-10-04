import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	useWindowDimensions,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssistantInitialShowcase } from '@/components/assistant-initial-showcase';
import ArrowLeftIAIcon from '@/components/icons/ArrowLeftIAicon';
import CameraAiIcon from '@/components/icons/CameraAiIcon';
import CloseIcon from '@/components/icons/CloseIcon';
import GalleryIcon from '@/components/icons/GalleryIcon';
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
import {
	analyzeAssistantImage,
	sendAssistantMessage,
	type AssistantChatResponse,
	type AssistantHistoryItem,
	type AssistantProductRecommendation,
} from '@/services/assistant';
import { getProduct, getRecentProducts, getSimilarProducts, type Product } from '@/services/catalog';
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

const AI_COLOR = '#0a0a0a';
const PRODUCTS_PER_VITRINE = 10;
const MAX_VITRINES = 3;
const MAX_RECOMMENDED_PRODUCTS = PRODUCTS_PER_VITRINE * MAX_VITRINES;
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
  timestamp: string;
  status: 'sent' | 'read';
  imageUri?: string;
  products?: AssistantProductView[];
};

function getTimestamp() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

function productViewsFromProducts(items: Product[]): AssistantProductView[] {
  return items.map((product) => ({
    id: product.id,
    name: product.name,
    linkText: product.linkText,
    imageUrl: product.imageUrl,
    price: product.price,
    listPrice: product.listPrice,
    product,
  }));
}

function splitIntoVitrines<T>(items: T[]) {
  const limitedItems = items.slice(0, MAX_RECOMMENDED_PRODUCTS);
  const vitrines: T[][] = [];

  for (let index = 0; index < limitedItems.length; index += PRODUCTS_PER_VITRINE) {
    vitrines.push(limitedItems.slice(index, index + PRODUCTS_PER_VITRINE));
  }

  return vitrines;
}

function textForVitrine(index: number, firstMessage: string) {
  if (index === 0) return firstMessage;
  if (index === 1) return 'Também encontrei esses outros modelos interessantes: ✨';
  return 'E aqui mais algumas alternativas adicionais:';
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

function MessageMeta({ timestamp, user = false, product = false }: { timestamp: string; user?: boolean; product?: boolean }) {
  return (
    <View style={product ? styles.productMeta : styles.messageMeta}>
      <ThemedText style={[styles.messageTime, user && styles.userMessageTime]}>{timestamp}</ThemedText>
      <ThemedText style={styles.messageStatus}>✓✓</ThemedText>
    </View>
  );
}

export default function AssistantScreen() {
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const theme = useTheme();
  const { setHidden } = useContext(TabBarContext);
  const { width: screenWidth } = useWindowDimensions();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialProducts, setInitialProducts] = useState<Product[]>([]);
  const [loadingInitialProducts, setLoadingInitialProducts] = useState(true);
  const [initialProductsError, setInitialProductsError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isStartingVoice, setIsStartingVoice] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sendMessageRef = useRef<(value: string) => void>(() => undefined);
  const chatBackground = colorScheme === 'dark' ? '#252b30' : '#eaeef2';
  const assistantBubbleBackground = colorScheme === 'dark' ? theme.backgroundElement : '#FFFFFF';
  const assistantTextColor = colorScheme === 'dark' ? theme.text : AI_COLOR;
  const initialState = messages.length === 0;
  const recommendationCardWidth = Math.max(124, Math.floor((Math.min(screenWidth, 420) - 90) / 2));

  const loadInitialProducts = useCallback(async () => {
    setLoadingInitialProducts(true);
    setInitialProductsError('');
    try {
      setInitialProducts(await getRecentProducts(10));
    } catch {
      setInitialProductsError('Não foi possível carregar as novidades agora.');
    } finally {
      setLoadingInitialProducts(false);
    }
  }, []);

  useEffect(() => {
    setHidden(true);
    return () => setHidden(false);
  }, [setHidden]);

  useEffect(() => {
    void loadInitialProducts();
  }, [loadInitialProducts]);

  useEffect(() => {
    if (messages.length === 0) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }
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

  function appendAssistantResponse(response: AssistantChatResponse, idPrefix: string) {
    const vitrines = splitIntoVitrines(response.products);
    const timestamp = getTimestamp();

    if (vitrines.length === 0) {
      setMessages((current) => [...current, {
        id: `${idPrefix}-${Date.now()}`,
        role: 'assistant',
        text: response.message,
        timestamp,
        status: 'read',
      }]);
      return;
    }

    const assistantMessages = vitrines.map((vitrine, index) => ({
      id: `${idPrefix}-${Date.now()}-${index}`,
      role: 'assistant' as const,
      text: textForVitrine(index, response.message),
      timestamp,
      status: 'read' as const,
      products: productViews(vitrine),
    }));

    setMessages((current) => [...current, ...assistantMessages]);
    assistantMessages.forEach((message, index) => {
      void hydrateProducts(message.id, vitrines[index]);
    });
  }

  function replaceSimilarResponse(messageId: string, products: Product[]) {
    const vitrines = splitIntoVitrines(products);
    const timestamp = getTimestamp();

    setMessages((current) => {
      const messageIndex = current.findIndex((message) => message.id === messageId);
      if (messageIndex < 0) return current;

      const replacement = vitrines.length > 0
        ? vitrines.map((vitrine, index) => ({
          id: index === 0 ? messageId : `${messageId}-${index}`,
          role: 'assistant' as const,
          text: textForVitrine(index, 'Encontrei produtos semelhantes a este ✨'),
          timestamp,
          status: 'read' as const,
          products: productViewsFromProducts(vitrine),
        }))
        : [{
          id: messageId,
          role: 'assistant' as const,
          text: 'Não encontrei produtos semelhantes no momento. 😔',
          timestamp,
          status: 'read' as const,
        }];

      return [
        ...current.slice(0, messageIndex),
        ...replacement,
        ...current.slice(messageIndex + 1),
      ];
    });
  }

  async function loadSimilarProducts(product: Product) {
    if (loading) return;

    Keyboard.dismiss();
    setDraft('');
    setStatusMessage('');
    const assistantMessageId = `assistant-similar-${Date.now()}`;
    setMessages((current) => [...current, {
      id: assistantMessageId,
      role: 'assistant',
      text: '',
      timestamp: getTimestamp(),
      status: 'read',
    }]);
    setLoading(true);

    try {
      const similarProducts = await getSimilarProducts(product, MAX_RECOMMENDED_PRODUCTS);
      replaceSimilarResponse(assistantMessageId, similarProducts);
    } catch {
      setMessages((current) => current.map((message) => message.id === assistantMessageId
        ? { ...message, text: 'Não consegui carregar produtos semelhantes agora. Tente novamente em instantes 💛' }
        : message));
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(value: string) {
    const message = value.trim();
    if (!message || loading) return;

    Keyboard.dismiss();
    setDraft('');
    setStatusMessage('');
    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message,
      timestamp: getTimestamp(),
      status: 'read',
    };
    const requestHistory = historyFromMessages(messages);
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await sendAssistantMessage(message, requestHistory);
      appendAssistantResponse(response, 'assistant');
    } catch (error) {
      setMessages((current) => [...current, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Não consegui buscar agora. Tente novamente em instantes 💛',
        timestamp: getTimestamp(),
        status: 'read',
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
      timestamp: getTimestamp(),
      status: 'read',
      imageUri: asset.uri,
    }]);
    setLoading(true);

    try {
      const response = await analyzeAssistantImage(`data:${mimeType};base64,${base64}`);
      appendAssistantResponse(response, 'assistant-image');
    } catch (error) {
      setMessages((current) => [...current, {
        id: `assistant-image-error-${Date.now()}`,
        role: 'assistant',
        text: error instanceof Error ? error.message : 'Não consegui analisar essa imagem agora. Tente novamente em instantes 💛',
        timestamp: getTimestamp(),
        status: 'read',
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

    setImagePickerVisible(true);
  }

  function selectImageSource(source: 'camera' | 'library') {
    setImagePickerVisible(false);
    void pickImage(source);
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
            {messages.length > 0 && (
              <Pressable accessibilityLabel="Limpar conversa" onPress={clearConversation} style={styles.headerIconButton}>
                <RefreshAiIcon color={theme.text} size={18} />
              </Pressable>
            )}
            <Pressable accessibilityLabel="Fechar assistente" onPress={() => router.back()} style={styles.headerIconButton}>
              <CloseIcon color={theme.text} size={22} />
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.content}>
          <ScrollView
            ref={scrollRef}
            style={[styles.chatArea, { backgroundColor: initialState ? theme.background : chatBackground }]}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.messages, initialState && styles.emptyMessages]}
            showsVerticalScrollIndicator={false}>
            {initialState && (
              <View style={styles.welcome}>
                <View style={styles.welcomeLogo}>
                  <SmartAiIcon color="#FFFFFF" size={34} />
                </View>
                <ThemedText style={[styles.welcomeTitle, { color: assistantTextColor }]}>Como posso te ajudar?</ThemedText>
                <ThemedText style={[styles.welcomeSubtitle, { color: colorScheme === 'dark' ? theme.textSecondary : '#68697b' }]}>
                  Posso recomendar produtos, montar looks e ajudar você a encontrar exatamente o que procura.
                </ThemedText>
                <AssistantInitialShowcase
                  products={initialProducts}
                  loading={loadingInitialProducts}
                  error={initialProductsError}
                  onRetry={() => void loadInitialProducts()}
                  onSuggestion={(query) => void sendMessage(query)}
                  onSimilar={(product) => void loadSimilarProducts(product)}
                  similarLoading={loading}
                />
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
                    <MessageMeta timestamp={message.timestamp} user={message.role === 'user'} />
                  </View>
                )}
                {message.products && message.products.length > 0 && (
                  <View style={[styles.productsBubble, { backgroundColor: assistantBubbleBackground }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsRow}>
                      {message.products.map((item) => (
                        <View key={`${message.id}-${item.id}`} style={[styles.productCard, { width: recommendationCardWidth }]}>
                          <ProductCard
                            product={item.product}
                            showAddedModal
                            onSimilar={() => void loadSimilarProducts(item.product)}
                            similarLoading={loading}
                          />
                        </View>
                      ))}
                    </ScrollView>
                    <MessageMeta timestamp={message.timestamp} product />
                  </View>
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
            <View style={[styles.composer, { borderColor: '#0a0a0a', backgroundColor: colorScheme === 'dark' ? theme.inputBackground : '#FFFFFF' }]}>
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

      <Modal
        visible={imagePickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setImagePickerVisible(false)}>
        <View style={styles.imagePickerBackdrop}>
          <Pressable
            accessibilityLabel="Fechar busca por imagem"
            onPress={() => setImagePickerVisible(false)}
            style={StyleSheet.absoluteFill} />
          <View style={[styles.imagePickerCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.imagePickerHeader}>
              <ThemedText style={[styles.imagePickerTitle, { color: theme.text }]}>Buscar por imagem</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar busca por imagem"
                onPress={() => setImagePickerVisible(false)}
                style={styles.imagePickerClose}
              >
                <CloseIcon color={theme.text} size={21} />
              </Pressable>
            </View>
            <ThemedText style={[styles.imagePickerMessage, { color: theme.textSecondary }]}>
              Escolha de onde deseja enviar a imagem.
            </ThemedText>
            <View style={styles.imagePickerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir câmera"
                onPress={() => selectImageSource('camera')}
                style={styles.imagePickerButton}>
								<CameraAiIcon color={loading ? theme.textSecondary : assistantTextColor} size={22} />
                <ThemedText style={styles.imagePickerButtonText}>Tirar foto</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir galeria"
                onPress={() => selectImageSource('library')}
                style={styles.imagePickerButton}>
                <GalleryIcon color={loading ? theme.textSecondary : assistantTextColor} size={22} />
                <ThemedText style={styles.imagePickerButtonText}>Selecionar foto</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancelar busca por imagem"
                onPress={() => setImagePickerVisible(false)}
                style={styles.imagePickerButtonCalcel}>
                <ThemedText style={styles.imagePickerButtonText}>Cancelar</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  emptyMessages: { paddingTop: 20 },
  welcome: { alignItems: 'center', width: '100%', paddingTop: 4 },
  welcomeLogo: { width: 50, height: 50, borderRadius: 32, backgroundColor: AI_COLOR, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  welcomeTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 5 },
  welcomeSubtitle: { maxWidth: 310, fontSize: 14, lineHeight: 21, textAlign: 'center', paddingBottom: 15 },
  assistantRow: { alignItems: 'flex-start', gap: 8, width: '100%' },
  userRow: { alignItems: 'flex-end', gap: 8, width: '100%' },
  bubble: { maxWidth: '88%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  assistantBubble: { borderBottomLeftRadius: 3 },
  userBubble: { backgroundColor: AI_COLOR, borderBottomRightRadius: 3 },
  imageBubble: { padding: 4, overflow: 'hidden' },
  userImage: { width: 184, height: 184, borderRadius: 12 },
  userText: { color: '#FFFFFF' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 6, minHeight: 12 },
  productMeta: { position: 'absolute', right: 12, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  messageTime: { color: '#777777', fontSize: 11, lineHeight: 12 },
  userMessageTime: { color: '#c9c9c9' },
  messageStatus: { color: '#53bdeb', fontSize: 12, lineHeight: 12, letterSpacing: -2 },
  productsBubble: { width: '100%', minHeight: 170, borderRadius: 16, borderBottomLeftRadius: 0, padding: 10, paddingBottom: 30, position: 'relative' },
  productsRow: { gap: 12, paddingRight: 2 },
  productCard: { width: 170 },
  typingBubble: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 16, borderBottomLeftRadius: 3, paddingHorizontal: 10, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  typingLogo: { width: 26, height: 26, borderRadius: 13, backgroundColor: AI_COLOR, alignItems: 'center', justifyContent: 'center' },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: AI_COLOR },
  statusArea: { paddingHorizontal: 14, paddingTop: 2 },
  status: { fontSize: 12, paddingBottom: 5 },
  composerBar: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  composer: { borderWidth: 1, borderRadius: 25, paddingVertical: 0, paddingHorizontal: 5, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 2 },
  composerIconButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  listeningButton: { backgroundColor: '#F4D8D8', borderRadius: 20 },
  input: { flex: 1, maxHeight: 50, paddingHorizontal: 5, paddingTop: 10, paddingBottom: 9, fontSize: 14 },
  sendButton: { width: 32, height: 32, borderRadius: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: AI_COLOR },
  disabledButton: { opacity: 0.45 },
  imagePickerBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0, 0, 0, 0.52)' },
  imagePickerCard: { width: '100%', maxWidth: 380, padding: 20, paddingBottom: 10, borderRadius: 16, shadowColor: '#0a0a0a', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  imagePickerHeader: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  imagePickerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  imagePickerClose: { position:	'absolute', top: -10, right: -10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  imagePickerMessage: { fontSize: 14, lineHeight: 21, marginBottom: 18 },
  imagePickerActions: { flexDirection: 'column', gap: 8 },
  imagePickerButton: { flex: 1, display: 'flex', flexDirection: 'row', gap: 8, minHeight: 44, paddingHorizontal: 18, borderWidth: 1, borderColor: '#0a0a0a', borderRadius: 8, alignItems: 'center', justifyContent: 'flex-start', backgroundColor: '#fff' },
  imagePickerButtonText: { color: '#0a0a0a', fontSize: 12, fontWeight: '600', textAlign: 'center' },
	imagePickerButtonCalcel: { flex: 1, display: 'flex', flexDirection: 'row', gap: 0, minHeight: 44, paddingHorizontal: 0, borderWidth: 0, borderColor: '#0a0a0a', borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});

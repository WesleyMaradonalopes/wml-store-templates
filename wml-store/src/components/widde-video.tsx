import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CloseCircleIcon from '@/components/icons/CloseCircleIcon';
import CloseIcon from '@/components/icons/CloseIcon';
import PlayIcon from '@/components/icons/PlayIcon';
import ShoppingBagIcon from '@/components/icons/ShoppingBagIcon';
import SpeakerIcon from '@/components/icons/SpeakerIcon';
import { ProductQuickView } from '@/components/product-quick-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Product } from '@/services/catalog';
import { getWiddeStories, type WiddeStory } from '@/services/widde';

type StoryPlaybackProps = {
  source: string;
  active: boolean;
  loop: boolean;
  muted: boolean;
  onEnded?: () => void;
  onProgress?: (value: number) => void;
  style?: StyleProp<ViewStyle>;
};

type PreviewPosition = {
  x: number;
  y: number;
};

const PREVIEW_WIDTH = 94;
const PREVIEW_HEIGHT = 140;
const PREVIEW_MARGIN = 8;

function StoryPlayback({ source, active, loop, muted, onEnded, onProgress, style }: StoryPlaybackProps) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = loop;
    instance.muted = muted;
    instance.volume = muted ? 0 : 1;
    instance.timeUpdateEventInterval = onProgress ? 0.15 : 0;
    if (active) instance.play();
  });

  useEffect(() => {
    player.loop = loop;
    player.muted = muted;
    player.volume = muted ? 0 : 1;
    player.timeUpdateEventInterval = onProgress && active ? 0.15 : 0;
    if (active) player.play();
    else player.pause();
  }, [active, loop, muted, onProgress, player]);

  useEffect(() => {
    if (!active) return undefined;

    const progressSubscription = onProgress
      ? player.addListener('timeUpdate', ({ currentTime }) => {
        const duration = player.duration;
        onProgress(Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0);
      })
      : null;
    const endedSubscription = onEnded ? player.addListener('playToEnd', onEnded) : null;

    return () => {
      progressSubscription?.remove();
      endedSubscription?.remove();
    };
  }, [active, onEnded, onProgress, player]);

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      playsInline
      surfaceType="textureView"
      style={style}
    />
  );
}

export function WiddeVideo({ product }: { product: Product }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [stories, setStories] = useState<WiddeStory[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [quickViewVisible, setQuickViewVisible] = useState(false);
  const initialPreviewPosition = useMemo<PreviewPosition>(() => ({
    x: Math.max(PREVIEW_MARGIN, screenWidth - PREVIEW_WIDTH - Spacing.four),
    y: insets.top + 74,
  }), [insets.top, screenWidth]);
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition>(initialPreviewPosition);
  const previewPositionRef = useRef(initialPreviewPosition);
  const dragOriginRef = useRef(initialPreviewPosition);

  const clampPreviewPosition = useCallback((position: PreviewPosition): PreviewPosition => {
    const maxX = Math.max(PREVIEW_MARGIN, screenWidth - PREVIEW_WIDTH - PREVIEW_MARGIN);
    const maxY = Math.max(insets.top + PREVIEW_MARGIN, screenHeight - PREVIEW_HEIGHT - insets.bottom - PREVIEW_MARGIN);
    return {
      x: Math.min(maxX, Math.max(PREVIEW_MARGIN, position.x)),
      y: Math.min(maxY, Math.max(insets.top + PREVIEW_MARGIN, position.y)),
    };
  }, [insets.bottom, insets.top, screenHeight, screenWidth]);

  const updatePreviewPosition = useCallback((position: PreviewPosition) => {
    const nextPosition = clampPreviewPosition(position);
    previewPositionRef.current = nextPosition;
    setPreviewPosition(nextPosition);
  }, [clampPreviewPosition]);

  const previewPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
    onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
    onPanResponderGrant: () => {
      dragOriginRef.current = previewPositionRef.current;
    },
    onPanResponderMove: (_, gestureState) => {
      updatePreviewPosition({
        x: dragOriginRef.current.x + gestureState.dx,
        y: dragOriginRef.current.y + gestureState.dy,
      });
    },
    onPanResponderRelease: (_, gestureState) => {
      updatePreviewPosition({
        x: dragOriginRef.current.x + gestureState.dx,
        y: dragOriginRef.current.y + gestureState.dy,
      });
    },
    onPanResponderTerminate: (_, gestureState) => {
      updatePreviewPosition({
        x: dragOriginRef.current.x + gestureState.dx,
        y: dragOriginRef.current.y + gestureState.dy,
      });
    },
    onPanResponderTerminationRequest: () => false,
  }), [updatePreviewPosition]);

  useEffect(() => {
    previewPositionRef.current = initialPreviewPosition;
    setPreviewPosition(initialPreviewPosition);
  }, [initialPreviewPosition, product.id]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setStories([]);
    setMinimized(false);
    setFullscreen(false);
    setActiveIndex(0);
    setProgress(0);
    setMuted(true);
    setQuickViewVisible(false);

    if (!product.linkText) return () => controller.abort();

    void getWiddeStories(product.linkText, controller.signal)
      .then((items) => {
        if (active) setStories(items);
      })
      .catch((error: unknown) => {
        if (active && (error as { name?: string })?.name !== 'AbortError') {
          console.warn('[widde] Não foi possível carregar os vídeos do produto.');
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [product.id, product.linkText]);

  const openFullscreen = useCallback(() => {
    setActiveIndex(0);
    setProgress(0);
    setMuted(true);
    setFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    setProgress(0);
    setQuickViewVisible(false);
  }, []);

  const selectStory = useCallback((index: number) => {
    if (index < 0) {
      setActiveIndex(0);
      setProgress(0);
      return;
    }
    if (index >= stories.length) {
      closeFullscreen();
      return;
    }
    setActiveIndex(index);
    setProgress(0);
  }, [closeFullscreen, stories.length]);

  const advanceStory = useCallback(() => {
    setActiveIndex((currentIndex) => {
      if (currentIndex >= stories.length - 1) {
        closeFullscreen();
        return currentIndex;
      }
      setProgress(0);
      return currentIndex + 1;
    });
  }, [closeFullscreen, stories.length]);

  const firstStory = stories[0];
  const activeStory = stories[activeIndex] || firstStory;
  if (!firstStory || !activeStory) return null;

  return (
    <>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {minimized ? (
          <Pressable
            accessibilityLabel="Reabrir vídeo do produto"
            onPress={() => setMinimized(false)}
            style={[styles.reopenButton, { top: insets.top + 74 }]}
          >
            <PlayIcon color="#0a0a0a" size={20} />
            <ThemedText style={styles.reopenButtonLabel}>Vídeo do produto</ThemedText>
          </Pressable>
        ) : (
          <View
            {...previewPanResponder.panHandlers}
            style={[styles.previewCard, { left: previewPosition.x, top: previewPosition.y }]}
          >
            <View style={styles.previewMedia}>
              {!!firstStory.thumbnailUrl && <Image source={{ uri: firstStory.thumbnailUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />}
              <StoryPlayback source={firstStory.previewUrl} active={!fullscreen} loop muted style={StyleSheet.absoluteFill} />
              <Pressable
                accessibilityLabel="Abrir vídeo do produto"
                onPress={openFullscreen}
                style={StyleSheet.absoluteFill}
              />
            </View>
            <Pressable
              accessibilityLabel="Ocultar vídeo do produto"
              onPress={() => setMinimized(true)}
              style={styles.previewClose}
            >
              <CloseIcon color="#0a0a0a" size={16} />
            </Pressable>
          </View>
        )}
      </View>

      {fullscreen && (
        <Modal
          visible
          animationType="fade"
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={closeFullscreen}
        >
          <View style={styles.fullscreenContainer}>
          {!!activeStory.thumbnailUrl && <Image source={{ uri: activeStory.thumbnailUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />}
          <StoryPlayback
            key={activeStory.key}
            source={activeStory.videoUrl}
            active
            loop={false}
            muted={muted}
            onEnded={advanceStory}
            onProgress={setProgress}
            style={StyleSheet.absoluteFill}
          />

          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            <View style={[styles.progressRow, { top: insets.top + Spacing.three }]} pointerEvents="none">
              {stories.map((story, index) => {
                const fill = index < activeIndex ? 1 : index === activeIndex ? progress : 0;
                return (
                  <View key={story.key} style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min(1, Math.max(0, fill)) * 100}%` }]} />
                  </View>
                );
              })}
            </View>

            <Pressable accessibilityLabel="Vídeo anterior" onPress={() => selectStory(activeIndex - 1)} style={styles.previousStoryZone} />
            <Pressable accessibilityLabel="Próximo vídeo" onPress={() => selectStory(activeIndex + 1)} style={styles.nextStoryZone} />

            <View style={[styles.fullscreenActions, { top: insets.top + 48 }]}>
              <Pressable accessibilityLabel="Fechar vídeo" onPress={closeFullscreen} style={styles.actionButton}>
                <CloseCircleIcon color="#FFFFFF" size={28} />
              </Pressable>
              <Pressable accessibilityLabel={muted ? 'Ativar som' : 'Desativar som'} onPress={() => setMuted((value) => !value)} style={styles.actionButton}>
                <SpeakerIcon color="#FFFFFF" muted={muted} size={28} />
              </Pressable>
            </View>

            <View style={[styles.storyProductCard, { bottom: Math.max(insets.bottom + Spacing.two, Spacing.three) }]}>
              <View style={styles.storyProductInfo}>
                {!!product.imageUrl && <Image source={{ uri: product.imageUrl }} contentFit="cover" style={styles.storyProductImage} />}
                <View style={styles.storyProductCopy}>
                  <ThemedText numberOfLines={2} style={styles.storyProductName}>{product.name}</ThemedText>
                  {product.price !== null && <ThemedText style={styles.storyProductPrice}>{money(product.price)}</ThemedText>}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar produto à sacola"
                onPress={() => setQuickViewVisible(true)}
                style={({ pressed }) => [styles.storyAddButton, pressed && styles.pressed]}
              >
                <ShoppingBagIcon color="#FFFFFF" size={18} />
                <ThemedText style={styles.storyAddButtonText}>Adicionar à sacola</ThemedText>
              </Pressable>
            </View>
          </View>
          </View>
        </Modal>
      )}
      <ProductQuickView
        product={product}
        visible={quickViewVisible}
        onClose={() => setQuickViewVisible(false)}
        viewCartLabel="Ver a sacola"
      />
    </>
  );
}

function money(value: number | null) {
  return value === null ? '' : `R$ ${value.toFixed(2).replace('.', ',')}`;
}

const styles = StyleSheet.create({
  previewCard: {
    position: 'absolute',
    width: PREVIEW_WIDTH,
    aspectRatio: 0.65,
    padding: 1,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0a0a0a',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    zIndex: 30,
  },
  previewMedia: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  previewClose: {
    position: 'absolute',
    left: -8,
    top: -8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0a0a0a',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 5,
    zIndex: 2,
  },
  reopenButton: {
    position: 'absolute',
    left: 0,
    width: 36,
    height: 160,
    alignItems: 'center',
    paddingTop: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0a0a0a',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 2 },
    elevation: 7,
    zIndex: 30,
  },
  reopenButtonLabel: {
    position: 'absolute',
    top: 80,
    left: -42,
    width: 118,
    color: '#0a0a0a',
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
    transform: [{ rotate: '90deg' }],
		backgroundColor: '#FFFFFF',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  progressRow: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.one,
    zIndex: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  previousStoryZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '34%',
    zIndex: 2,
  },
  nextStoryZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '34%',
    zIndex: 2,
  },
  fullscreenActions: {
    position: 'absolute',
    right: Spacing.two,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 5,
  },
  actionButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyProductCard: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 6,
  },
  storyProductInfo: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  storyProductImage: {
    width: 54,
    height: 78,
    borderRadius: 4,
    backgroundColor: '#e9e4dd',
  },
  storyProductCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  storyProductName: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
  },
  storyProductPrice: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  storyAddButton: {
    minHeight: 50,
    marginTop: Spacing.two,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#0a0a0a',
  },
  storyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.74,
  },
});

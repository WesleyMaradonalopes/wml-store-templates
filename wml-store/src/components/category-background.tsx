import { BlurTargetView, BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { createContext, useContext, useRef, type PropsWithChildren, type RefObject } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { categorySurfaceColors } from './cms-section.styles';
import type { CmsPage } from '@/services/cms';

export type CategoryBackgroundConfig = {
  enabled: boolean;
  backgroundImage: string;
  surfaceColors: [string, string, string];
  overlayColor: string;
  overlayOpacity: number;
  blurIntensity: number;
  panelWidth: number;
};

const defaultCategoryBackgroundConfig: CategoryBackgroundConfig = {
  enabled: true,
  backgroundImage: '',
  surfaceColors: [...categorySurfaceColors],
  overlayColor: '#FFFFFF',
  overlayOpacity: 0.72,
  blurIntensity: 60,
  panelWidth: 70,
};

const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const functionColorPattern = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function mediaUrl(value: unknown) {
  if (typeof value === 'string') return value.trim();

  const source = record(value);
  if (!source) return '';

  for (const key of ['url', 'uri', 'src', 'imageUrl', 'previewUrl', 'thumbnailUrl']) {
    const candidate = source[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  return '';
}

function validColor(value: unknown, fallback: string) {
  const color = text(value);
  if (hexColorPattern.test(color)) return color;

  const match = color.match(functionColorPattern);
  if (!match) return fallback;

  const isRgba = color.slice(0, 4).toLowerCase() === 'rgba';
  const hasAlpha = typeof match[4] === 'string';
  if (isRgba !== hasAlpha) return fallback;

  const channels = match.slice(1, 4).map(Number);
  if (channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)) return fallback;

  if (hasAlpha) {
    const alpha = Number(match[4]);
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return fallback;
  }

  return color;
}

function boundedNumber(value: unknown, fallback: number, minimum: number, maximum: number, round = false) {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  const bounded = Math.min(maximum, Math.max(minimum, number));
  return round ? Math.round(bounded) : bounded;
}

function withOpacity(color: string, opacity: number) {
  const alphaMultiplier = boundedNumber(opacity, 0.72, 0, 1);
  const hexMatch = color.match(/^#([0-9a-f]+)$/i);

  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map((part) => `${part}${part}`).join('');
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    const sourceAlpha = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return `rgba(${red}, ${green}, ${blue}, ${sourceAlpha * alphaMultiplier})`;
  }

  const match = color.match(functionColorPattern);
  if (match) {
    const alpha = match[4] ? Number(match[4]) : 1;
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha * alphaMultiplier})`;
  }

  return `rgba(255, 255, 255, ${alphaMultiplier})`;
}

function sourceFromPage(page: Pick<CmsPage, 'sections' | 'settings'> | null | undefined) {
  const sections = page?.sections ?? [];
  const explicitSection = sections.find((section) => section.name === 'CategoryBackground');
  if (explicitSection?.data) return explicitSection.data;

  const settings = record(page?.settings);
  const settingsBackground = settings ? record(settings.categoryBackground) : null;
  if (settingsBackground) return settingsBackground;

  // Also accepts the fields on an existing category section so the feature can
  // be enabled without recreating a published CategoryListSwipe/CategoryTree.
  const categorySection = sections.find((section) => (
    section.name === 'CategoryListSwipe' || section.name === 'CategoryTree' || section.name === 'CategoryAccordeon'
  ) && Boolean(section.data && (
    'backgroundImage' in section.data ||
    'enabled' in section.data ||
    'surfaceColorStart' in section.data ||
    'surfaceColorMiddle' in section.data ||
    'surfaceColorEnd' in section.data ||
    'overlayColor' in section.data ||
    'blurIntensity' in section.data ||
    'panelWidth' in section.data
  )));
  return categorySection?.data;
}

export function readCategoryBackgroundConfig(value: unknown): CategoryBackgroundConfig {
  const source = record(value);
  const nested = source ? record(source.categoryBackground) ?? source : null;

  return {
    enabled: nested?.enabled !== false,
    backgroundImage: mediaUrl(nested?.backgroundImage) || mediaUrl(nested?.image) || mediaUrl(nested?.imageUrl),
    surfaceColors: [
      validColor(nested?.surfaceColorStart ?? nested?.colorStart, defaultCategoryBackgroundConfig.surfaceColors[0]),
      validColor(nested?.surfaceColorMiddle ?? nested?.colorMiddle, defaultCategoryBackgroundConfig.surfaceColors[1]),
      validColor(nested?.surfaceColorEnd ?? nested?.colorEnd, defaultCategoryBackgroundConfig.surfaceColors[2]),
    ],
    overlayColor: validColor(nested?.overlayColor, defaultCategoryBackgroundConfig.overlayColor),
    overlayOpacity: boundedNumber(nested?.overlayOpacity, defaultCategoryBackgroundConfig.overlayOpacity, 0, 1),
    blurIntensity: boundedNumber(nested?.blurIntensity, defaultCategoryBackgroundConfig.blurIntensity, 0, 100, true),
    panelWidth: boundedNumber(nested?.panelWidth, defaultCategoryBackgroundConfig.panelWidth, 40, 100, true),
  };
}

export function categoryBackgroundIsActive(config: CategoryBackgroundConfig) {
  return config.enabled && Boolean(config.backgroundImage);
}

export function getCategoryBackgroundConfig(page: Pick<CmsPage, 'sections' | 'settings'> | null | undefined) {
  return readCategoryBackgroundConfig(sourceFromPage(page));
}

type CategoryBackgroundContextValue = {
  config: CategoryBackgroundConfig;
  targetRef: RefObject<View | null>;
};

const CategoryBackgroundContext = createContext<CategoryBackgroundContextValue | null>(null);

type CategoryBackgroundProps = PropsWithChildren<{
  config: CategoryBackgroundConfig;
  style?: StyleProp<ViewStyle>;
}>;

export function CategoryBackground({ config, style, children }: CategoryBackgroundProps) {
  const targetRef = useRef<View | null>(null);
  const hasImage = categoryBackgroundIsActive(config);
  const panelWidth = hasImage ? config.panelWidth : 100;
  const panelBackground = withOpacity(config.overlayColor, config.overlayOpacity);

  return (
    <CategoryBackgroundContext.Provider value={{ config, targetRef }}>
      <View style={[styles.root, style]}>
        <BlurTargetView ref={targetRef} style={styles.backgroundTarget}>
          {hasImage && (
            <Image
              source={{ uri: config.backgroundImage }}
              contentFit="cover"
              style={styles.backgroundImage}
            />
          )}
        </BlurTargetView>
        {hasImage && (
          <BlurView
            pointerEvents="none"
            blurTarget={targetRef}
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={config.blurIntensity}
            tint="light"
            style={[styles.blurPanel, { width: `${panelWidth}%`, backgroundColor: panelBackground }]}
          />
        )}
        {children}
      </View>
    </CategoryBackgroundContext.Provider>
  );
}

type CategoryBackgroundPanelProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function CategoryBackgroundPanel({ style, children }: CategoryBackgroundPanelProps) {
  const context = useContext(CategoryBackgroundContext);
  const panelWidth = context && categoryBackgroundIsActive(context.config) ? context.config.panelWidth : 100;

  return <View style={[styles.panelContent, { width: `${panelWidth}%` }, style]}>{children}</View>;
}

export const categoryBackgroundDefaults = defaultCategoryBackgroundConfig;

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  backgroundTarget: { ...StyleSheet.absoluteFill },
  backgroundImage: { ...StyleSheet.absoluteFill },
  blurPanel: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  panelContent: { flex: 1, alignSelf: 'flex-start' },
});

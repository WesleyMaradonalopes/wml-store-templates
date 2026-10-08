import { Colors, type ThemePalette } from './color-palette';

export const PAGE_THEME_NAMES = ['default', 'black', 'terracotta', 'rose', 'sage', 'custom'] as const;

export type PageThemeName = typeof PAGE_THEME_NAMES[number];

export type CustomPageColors = {
  background?: string;
  surface?: string;
  text?: string;
  textSecondary?: string;
  primary?: string;
  onPrimary?: string;
  border?: string;
};

export const PAGE_THEME_OPTIONS = [
  { value: 'default', label: 'Padrão' },
  { value: 'black', label: 'Black' },
  { value: 'terracotta', label: 'Terracota' },
  { value: 'rose', label: 'Rosa' },
  { value: 'sage', label: 'Verde' },
  { value: 'custom', label: 'Personalizado' },
] as const;

const campaignPalettes: Record<Exclude<PageThemeName, 'default' | 'custom'>, ThemePalette> = {
  black: {
    text: '#f7f4ef',
    background: '#0a0a0a',
    backgroundElement: '#181818',
    backgroundSelected: '#f7f4ef',
    textSecondary: '#b9b1a8',
    surface: '#242424',
    surfaceMuted: '#141414',
    border: '#3d3d3d',
    borderStrong: '#f7f4ef',
    inputBackground: '#1b1b1b',
    primary: '#f7f4ef',
    onPrimary: '#0a0a0a',
  },
  terracotta: {
    text: '#fff7f1',
    background: '#2b1712',
    backgroundElement: '#43251e',
    backgroundSelected: '#f2c6b4',
    textSecondary: '#d6b7aa',
    surface: '#513027',
    surfaceMuted: '#361d17',
    border: '#6d463b',
    borderStrong: '#f2c6b4',
    inputBackground: '#3b211a',
    primary: '#f2c6b4',
    onPrimary: '#2b1712',
  },
  rose: {
    text: '#fff5f7',
    background: '#2c121c',
    backgroundElement: '#4b2030',
    backgroundSelected: '#f1c2d1',
    textSecondary: '#ddb5c2',
    surface: '#5b2a3b',
    surfaceMuted: '#371722',
    border: '#754355',
    borderStrong: '#f1c2d1',
    inputBackground: '#401b29',
    primary: '#f1c2d1',
    onPrimary: '#2c121c',
  },
  sage: {
    text: '#eff9f1',
    background: '#12231c',
    backgroundElement: '#1d382c',
    backgroundSelected: '#d4ead7',
    textSecondary: '#b9d3be',
    surface: '#294c39',
    surfaceMuted: '#193024',
    border: '#456b53',
    borderStrong: '#d4ead7',
    inputBackground: '#1b3427',
    primary: '#d4ead7',
    onPrimary: '#12231c',
  },
};

const customColorKeys = ['background', 'surface', 'text', 'textSecondary', 'primary', 'onPrimary', 'border'] as const;
const colorPattern = /^(?:#(?:[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})|rgb\(\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*\)|rgba\(\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*,\s*[0-9]{1,3}\s*,\s*(?:0|1|0?\.[0-9]+)\s*\))$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseColor(value: string): [number, number, number, number] | null {
  const normalized = value.trim();
  if (!colorPattern.test(normalized)) return null;

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    const expanded = hex.length <= 4
      ? hex.split('').map((part) => part + part).join('')
      : hex;
    const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6), 16) / 255 : 1;
    return [
      Number.parseInt(expanded.slice(0, 2), 16),
      Number.parseInt(expanded.slice(2, 4), 16),
      Number.parseInt(expanded.slice(4, 6), 16),
      alpha,
    ];
  }

  const match = normalized.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*(0|1|0?\.[0-9]+))?\s*\)$/i);
  if (!match) return null;

  const channels = match.slice(1, 4).map(Number);
  if (channels.some((channel) => channel < 0 || channel > 255)) return null;
  return [channels[0], channels[1], channels[2], match[4] === undefined ? 1 : Number(match[4])];
}

function isValidColor(value: unknown): value is string {
  return typeof value === 'string' && parseColor(value) !== null;
}

export function normalizeCustomPageColors(value: unknown): CustomPageColors {
  const source = record(value);
  if (!source) return {};

  return customColorKeys.reduce<CustomPageColors>((colors, key) => {
    if (isValidColor(source[key])) colors[key] = source[key].trim();
    return colors;
  }, {});
}

export function isDarkThemeColor(value: string): boolean {
  const parsed = parseColor(value);
  if (!parsed) return false;

  const [red, green, blue, alpha] = parsed;
  const compositedRed = red * alpha + 255 * (1 - alpha);
  const compositedGreen = green * alpha + 255 * (1 - alpha);
  const compositedBlue = blue * alpha + 255 * (1 - alpha);
  return (0.2126 * compositedRed) + (0.7152 * compositedGreen) + (0.0722 * compositedBlue) < 150;
}

export function isPageThemeName(value: unknown): value is PageThemeName {
  return typeof value === 'string' && (PAGE_THEME_NAMES as readonly string[]).includes(value);
}

export function normalizePageTheme(value: unknown): PageThemeName {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return isPageThemeName(normalized) ? normalized : 'default';
}

export function getPageThemePalette(theme: PageThemeName, colorScheme: 'light' | 'dark', customColors: CustomPageColors = {}): ThemePalette {
  if (theme === 'default') return Colors[colorScheme];
  if (theme !== 'custom') return campaignPalettes[theme];

  const colors = normalizeCustomPageColors(customColors);
  const baseScheme = colors.background
    ? (isDarkThemeColor(colors.background) ? 'dark' : 'light')
    : colorScheme;
  const base = Colors[baseScheme];
  const background = colors.background ?? base.background;
  const primary = colors.primary ?? base.primary;

  return {
    ...base,
    background,
    backgroundElement: colors.surface ?? base.backgroundElement,
    backgroundSelected: primary,
    text: colors.text ?? (isDarkThemeColor(background) ? Colors.dark.text : Colors.light.text),
    textSecondary: colors.textSecondary ?? (isDarkThemeColor(background) ? Colors.dark.textSecondary : Colors.light.textSecondary),
    surface: colors.surface ?? base.surface,
    border: colors.border ?? base.border,
    borderStrong: colors.border ?? primary,
    inputBackground: colors.surface ?? base.inputBackground,
    primary,
    onPrimary: colors.onPrimary ?? (isDarkThemeColor(primary) ? Colors.dark.text : Colors.light.text),
  };
}

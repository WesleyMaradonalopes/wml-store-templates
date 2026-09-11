export type BottomTabSettings = {
  backgroundColor: string;
  backgroundOpacity: number;
  activeBackgroundColor: string;
  activeBackgroundOpacity: number;
  activeIconColor: string;
  inactiveIconColor: string;
  activeTextColor: string;
  inactiveTextColor: string;
  badgeBackgroundColor: string;
  badgeTextColor: string;
};

export const DEFAULT_BOTTOM_TAB_SETTINGS: BottomTabSettings = {
  backgroundColor: '#7D7D7D',
  backgroundOpacity: 0.78,
  activeBackgroundColor: '#FFFFFF',
  activeBackgroundOpacity: 0.16,
  activeIconColor: '#FFFFFF',
  inactiveIconColor: '#FFFFFF',
  activeTextColor: '#FFFFFF',
  inactiveTextColor: '#FFFFFF',
  badgeBackgroundColor: '#FFFFFF',
  badgeTextColor: '#0A0A0A',
};

const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readColor(source: Record<string, unknown>, key: keyof BottomTabSettings, fallback: string) {
  const value = source[key];
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  return hexColorPattern.test(color) ? color : fallback;
}

function readOpacity(source: Record<string, unknown>, key: keyof BottomTabSettings, fallback: number) {
  const value = source[key];
  const opacity = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(opacity)) return fallback;
  return Math.min(1, Math.max(0, opacity));
}

function sourceFrom(value: unknown): Record<string, unknown> {
  const root = asRecord(value);
  if (!root) return {};

  const sections = Array.isArray(root.sections) ? root.sections : [];
  const settingsSection = sections
    .map(asRecord)
    .find((section) => section?.name === 'BottomTabSettings');
  const sectionData = asRecord(settingsSection?.data);
  const pageSettings = asRecord(root.settings);
  const pageBottomTab = asRecord(pageSettings?.bottomTab);
  const directBottomTab = asRecord(root.bottomTab);

  return sectionData || pageBottomTab || directBottomTab || pageSettings || root;
}

export function readBottomTabSettings(value: unknown): BottomTabSettings {
  const source = sourceFrom(value);

  return {
    backgroundColor: readColor(source, 'backgroundColor', DEFAULT_BOTTOM_TAB_SETTINGS.backgroundColor),
    backgroundOpacity: readOpacity(source, 'backgroundOpacity', DEFAULT_BOTTOM_TAB_SETTINGS.backgroundOpacity),
    activeBackgroundColor: readColor(source, 'activeBackgroundColor', DEFAULT_BOTTOM_TAB_SETTINGS.activeBackgroundColor),
    activeBackgroundOpacity: readOpacity(source, 'activeBackgroundOpacity', DEFAULT_BOTTOM_TAB_SETTINGS.activeBackgroundOpacity),
    activeIconColor: readColor(source, 'activeIconColor', DEFAULT_BOTTOM_TAB_SETTINGS.activeIconColor),
    inactiveIconColor: readColor(source, 'inactiveIconColor', DEFAULT_BOTTOM_TAB_SETTINGS.inactiveIconColor),
    activeTextColor: readColor(source, 'activeTextColor', DEFAULT_BOTTOM_TAB_SETTINGS.activeTextColor),
    inactiveTextColor: readColor(source, 'inactiveTextColor', DEFAULT_BOTTOM_TAB_SETTINGS.inactiveTextColor),
    badgeBackgroundColor: readColor(source, 'badgeBackgroundColor', DEFAULT_BOTTOM_TAB_SETTINGS.badgeBackgroundColor),
    badgeTextColor: readColor(source, 'badgeTextColor', DEFAULT_BOTTOM_TAB_SETTINGS.badgeTextColor),
  };
}

export function withOpacity(color: string, opacity: number) {
  const hex = color.slice(1);
  const expanded = hex.length === 3
    ? hex.split('').map((channel) => `${channel}${channel}`).join('')
    : hex;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

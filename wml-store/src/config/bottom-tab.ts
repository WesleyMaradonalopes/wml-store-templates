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
  homeLabel: string;
  categoriesLabel: string;
  favoritesLabel: string;
  cartLabel: string;
  accountLabel: string;
  homeOrder: number;
  categoriesOrder: number;
  favoritesOrder: number;
  cartOrder: number;
  accountOrder: number;
  homeEnabled: boolean;
  categoriesEnabled: boolean;
  favoritesEnabled: boolean;
  cartEnabled: boolean;
  accountEnabled: boolean;
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
  homeLabel: 'Home',
  categoriesLabel: 'Categorias',
  favoritesLabel: 'Favoritos',
  cartLabel: 'Sacola',
  accountLabel: 'Conta',
  homeOrder: 1,
  categoriesOrder: 2,
  favoritesOrder: 3,
  cartOrder: 4,
  accountOrder: 5,
  homeEnabled: true,
  categoriesEnabled: true,
  favoritesEnabled: true,
  cartEnabled: true,
  accountEnabled: true,
};

const bottomTabItemDefinitions = [
  { key: 'home', routeName: 'home', path: '/(tabs)', icon: 'home', labelKey: 'homeLabel', orderKey: 'homeOrder', enabledKey: 'homeEnabled', defaultOrder: 1 },
  { key: 'categories', routeName: 'explore', path: '/explore', icon: 'category', labelKey: 'categoriesLabel', orderKey: 'categoriesOrder', enabledKey: 'categoriesEnabled', defaultOrder: 2 },
  { key: 'favorites', routeName: 'favorites', path: '/favorites', icon: 'favorite', labelKey: 'favoritesLabel', orderKey: 'favoritesOrder', enabledKey: 'favoritesEnabled', defaultOrder: 3 },
  { key: 'cart', routeName: 'checkout', path: '/checkout', icon: 'bag', labelKey: 'cartLabel', orderKey: 'cartOrder', enabledKey: 'cartEnabled', defaultOrder: 4 },
  { key: 'account', routeName: 'account', path: '/account', icon: 'account', labelKey: 'accountLabel', orderKey: 'accountOrder', enabledKey: 'accountEnabled', defaultOrder: 5 },
] as const;

export function getBottomTabItems(settings: BottomTabSettings) {
  return bottomTabItemDefinitions
    .filter((item) => settings[item.enabledKey])
    .map((item) => ({
      ...item,
      label: settings[item.labelKey],
      order: settings[item.orderKey],
    }))
    .sort((first, second) => first.order - second.order || first.defaultOrder - second.defaultOrder);
}

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

function readLabel(source: Record<string, unknown>, key: keyof BottomTabSettings, fallback: string) {
  const value = source[key];
  if (typeof value !== 'string') return fallback;
  const label = value.trim();
  return label || fallback;
}

function readOrder(source: Record<string, unknown>, key: keyof BottomTabSettings, fallback: number) {
  const value = source[key];
  const order = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(order)) return fallback;
  return Math.min(5, Math.max(1, Math.round(order)));
}

function readBoolean(source: Record<string, unknown>, key: keyof BottomTabSettings, fallback: boolean) {
  const value = source[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
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
    homeLabel: readLabel(source, 'homeLabel', DEFAULT_BOTTOM_TAB_SETTINGS.homeLabel),
    categoriesLabel: readLabel(source, 'categoriesLabel', DEFAULT_BOTTOM_TAB_SETTINGS.categoriesLabel),
    favoritesLabel: readLabel(source, 'favoritesLabel', DEFAULT_BOTTOM_TAB_SETTINGS.favoritesLabel),
    cartLabel: readLabel(source, 'cartLabel', DEFAULT_BOTTOM_TAB_SETTINGS.cartLabel),
    accountLabel: readLabel(source, 'accountLabel', DEFAULT_BOTTOM_TAB_SETTINGS.accountLabel),
    homeOrder: readOrder(source, 'homeOrder', DEFAULT_BOTTOM_TAB_SETTINGS.homeOrder),
    categoriesOrder: readOrder(source, 'categoriesOrder', DEFAULT_BOTTOM_TAB_SETTINGS.categoriesOrder),
    favoritesOrder: readOrder(source, 'favoritesOrder', DEFAULT_BOTTOM_TAB_SETTINGS.favoritesOrder),
    cartOrder: readOrder(source, 'cartOrder', DEFAULT_BOTTOM_TAB_SETTINGS.cartOrder),
    accountOrder: readOrder(source, 'accountOrder', DEFAULT_BOTTOM_TAB_SETTINGS.accountOrder),
    homeEnabled: readBoolean(source, 'homeEnabled', DEFAULT_BOTTOM_TAB_SETTINGS.homeEnabled),
    categoriesEnabled: readBoolean(source, 'categoriesEnabled', DEFAULT_BOTTOM_TAB_SETTINGS.categoriesEnabled),
    favoritesEnabled: readBoolean(source, 'favoritesEnabled', DEFAULT_BOTTOM_TAB_SETTINGS.favoritesEnabled),
    cartEnabled: readBoolean(source, 'cartEnabled', DEFAULT_BOTTOM_TAB_SETTINGS.cartEnabled),
    accountEnabled: readBoolean(source, 'accountEnabled', DEFAULT_BOTTOM_TAB_SETTINGS.accountEnabled),
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

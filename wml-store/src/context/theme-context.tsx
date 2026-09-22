import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme, type ColorSchemeName } from 'react-native';

import { getStoredJson, setStoredJson } from '@/services/storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type AppColorScheme = 'light' | 'dark';

const THEME_PREFERENCE_STORAGE_KEY = '@lojahr/theme-preference';

type ThemeContextValue = {
  preference: ThemePreference;
  colorScheme: AppColorScheme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeScheme(scheme: ColorSchemeName): AppColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let active = true;

    getStoredJson<unknown>(THEME_PREFERENCE_STORAGE_KEY)
      .then((storedPreference) => {
        if (active && isThemePreference(storedPreference)) setPreferenceState(storedPreference);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
    void setStoredJson(THEME_PREFERENCE_STORAGE_KEY, nextPreference).catch(() => undefined);
  }, []);

  const colorScheme = preference === 'system' ? normalizeScheme(systemColorScheme) : preference;
  const toggleTheme = useCallback(() => {
    setPreference(colorScheme === 'dark' ? 'light' : 'dark');
  }, [colorScheme, setPreference]);

  const value = useMemo<ThemeContextValue>(() => ({
    preference,
    colorScheme,
    setPreference,
    toggleTheme,
  }), [colorScheme, preference, setPreference, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside ThemePreferenceProvider');
  return context;
}

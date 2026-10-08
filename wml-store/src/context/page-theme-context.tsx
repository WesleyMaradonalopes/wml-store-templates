import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

import { getPageThemePalette, normalizeCustomPageColors, normalizePageTheme, type CustomPageColors, type PageThemeName } from '@/constants/page-theme';
import { useAppTheme } from './theme-context';

type PageThemeContextValue = {
  name: PageThemeName;
  customColors: CustomPageColors;
};

const PageThemeContext = createContext<PageThemeContextValue>({ name: 'default', customColors: {} });

export function PageThemeProvider({ theme = 'default', customColors, children }: PropsWithChildren<{ theme?: PageThemeName; customColors?: CustomPageColors }>) {
  const value = useMemo<PageThemeContextValue>(() => ({
    name: normalizePageTheme(theme),
    customColors: normalizeCustomPageColors(customColors),
  }), [customColors, theme]);
  return <PageThemeContext.Provider value={value}>{children}</PageThemeContext.Provider>;
}

export function usePageTheme() {
  const { colorScheme } = useAppTheme();
  const { name, customColors } = useContext(PageThemeContext);

  return useMemo(() => ({
    name,
    isDark: name === 'default' ? colorScheme === 'dark' : true,
    palette: getPageThemePalette(name, colorScheme, customColors),
  }), [colorScheme, customColors, name]);
}

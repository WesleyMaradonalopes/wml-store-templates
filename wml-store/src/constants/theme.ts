/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#231f20',
    background: '#fcfaf5',
    backgroundElement: '#ffffff',
    backgroundSelected: '#1e120d',
    textSecondary: '#8f8f8f',
  },
  dark: {
    text: '#ffffff',
    background: '#231f20',
    backgroundElement: '#333333',
    backgroundSelected: '#1e120d',
    textSecondary: '#bdbdbd',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: 'Montserrat_400Regular',
  light: 'Montserrat_300Light',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  serif: 'Montserrat_400Regular',
  rounded: 'Montserrat_400Regular',
  mono: Platform.select({ web: 'ui-monospace', default: 'monospace' }) ?? 'monospace',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 10,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0a0a0a',
    background: '#ffffff',
    backgroundElement: '#ffffff',
    backgroundSelected: '#0a0a0a',
    textSecondary: '#8f8f8f',
  },
  dark: {
    text: '#ffffff',
    background: '#0a0a0a',
    backgroundElement: '#333333',
    backgroundSelected: '#0a0a0a',
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
  mono: 'Montserrat_400Regular',
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

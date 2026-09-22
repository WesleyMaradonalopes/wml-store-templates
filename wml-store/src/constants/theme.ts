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
    surface: '#e9e6df',
    surfaceMuted: '#f7f7f7',
    border: '#dedbd5',
    borderStrong: '#0a0a0a',
    inputBackground: '#ffffff',
    primary: '#0a0a0a',
    onPrimary: '#ffffff',
  },
  dark: {
    text: '#f7f4ef',
    background: '#100e0d',
    backgroundElement: '#25211e',
    backgroundSelected: '#f7f4ef',
    textSecondary: '#b9b1a8',
    surface: '#322c27',
    surfaceMuted: '#1b1816',
    border: '#4c4540',
    borderStrong: '#f7f4ef',
    inputBackground: '#1f1c1a',
    primary: '#f7f4ef',
    onPrimary: '#100e0d',
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

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
export type ThemePalette = Record<ThemeColor, string>;

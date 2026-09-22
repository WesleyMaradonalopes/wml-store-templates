/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';

export function useTheme() {
  const { colorScheme } = useAppTheme();
  return Colors[colorScheme];
}

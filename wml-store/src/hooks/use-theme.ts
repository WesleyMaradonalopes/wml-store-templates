/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { usePageTheme } from '@/context/page-theme-context';

export function useTheme() {
  return usePageTheme().palette;
}

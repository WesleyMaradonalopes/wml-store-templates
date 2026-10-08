import { normalizeCustomPageColors, normalizePageTheme, type CustomPageColors, type PageThemeName } from '@/constants/page-theme';

import type { CmsPage } from './cms';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function themeValue(source: unknown) {
  const value = record(source);
  if (!value) return undefined;

  const pageTheme = record(value.pageTheme);
  return pageTheme?.theme ?? value.theme;
}

function themeConfiguration(source: unknown): Record<string, unknown> | null {
  const value = record(source);
  if (!value) return null;
  return record(value.pageTheme) ?? value;
}

function pageThemeSources(page: CmsPage): unknown[] {
  const rawPage = page as CmsPage & Record<string, unknown>;
  return [page.tema, page.settings, rawPage.pageTheme, rawPage];
}

export function resolvePageTheme(page: CmsPage | null | undefined): PageThemeName {
  if (!page) return 'default';

  for (const source of pageThemeSources(page)) {
    const value = themeValue(source);
    if (value !== undefined) return normalizePageTheme(value);
  }
  return 'default';
}

export function resolvePageThemeColors(page: CmsPage | null | undefined): CustomPageColors {
  if (!page) return {};

  for (const source of pageThemeSources(page)) {
    const configuration = themeConfiguration(source);
    const customColors = configuration?.customColors;
    if (customColors !== undefined) return normalizeCustomPageColors(customColors);
  }

  return {};
}

import { describe, expect, it } from 'vitest';

import { getPageThemePalette } from '@/constants/page-theme';

import { resolvePageTheme, resolvePageThemeColors } from '../cms-page-theme';

describe('resolvePageTheme', () => {
  it('reads the Headless CMS configuration used by Eitri', () => {
    expect(resolvePageTheme({ sections: [], tema: { pageTheme: { theme: 'black' } } })).toBe('black');
  });

  it('supports the settings fallback used by older CMS responses', () => {
    expect(resolvePageTheme({ sections: [], settings: { pageTheme: { theme: 'rose' } } })).toBe('rose');
  });

  it('falls back to the default theme for invalid or missing values', () => {
    expect(resolvePageTheme({ sections: [], tema: { pageTheme: { theme: 'unknown' } } })).toBe('default');
    expect(resolvePageTheme(null)).toBe('default');
  });

  it('reads and normalizes custom CMS colors', () => {
    const page = {
      sections: [],
      tema: {
        pageTheme: {
          theme: 'custom',
          customColors: {
            background: '#120E1A',
            primary: '#C084FC',
            invalid: 'not-a-color',
          },
        },
      },
    };

    expect(resolvePageTheme(page)).toBe('custom');
    expect(resolvePageThemeColors(page)).toEqual({ background: '#120E1A', primary: '#C084FC' });
  });

  it('derives the remaining custom palette from the selected background', () => {
    const palette = getPageThemePalette('custom', 'light', {
      background: '#120E1A',
      primary: '#C084FC',
    });

    expect(palette.background).toBe('#120E1A');
    expect(palette.text).toBe('#f7f4ef');
    expect(palette.backgroundElement).toBe('#25211e');
    expect(palette.primary).toBe('#C084FC');
    expect(palette.onPrimary).toBe('#0a0a0a');
  });
});

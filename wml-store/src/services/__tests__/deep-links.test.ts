import { describe, expect, it } from 'vitest';
import { redirectSystemPath } from '@/app/+native-intent';
import { resolveDeepLink } from '../deep-links';

function routeUrl(route: string) {
  return new URL(`https://app.test${route}`);
}

function routeFacets(route: string) {
  const facets = routeUrl(route).searchParams.get('facets');
  return facets ? JSON.parse(facets) : null;
}

describe('resolveDeepLink', () => {
  it('resolves custom-scheme product links by id', () => {
    expect(resolveDeepLink('lojahr://product/7771')).toEqual({
      type: 'route',
      route: '/product/7771',
    });
  });

  it('resolves public VTEX product URLs by slug', () => {
    expect(
      resolveDeepLink(
        'https://www.hoperesort.com.br/bermuda-media-com-recortes-em-tule-e-refletivo-preto-hf302740/p',
      ),
    ).toEqual({
      type: 'route',
      route: '/product/bermuda-media-com-recortes-em-tule-e-refletivo-preto-hf302740',
    });
  });

  it('accepts the public host without www and preserves encoded product slugs', () => {
    expect(resolveDeepLink('https://hoperesort.com.br/product/bermuda%20especial')).toEqual({
      type: 'route',
      route: '/product/bermuda%20especial',
    });
  });

  it('resolves categories and VTEX map facets', () => {
    const category = resolveDeepLink('https://www.hoperesort.com.br/categoria/feminino/bermudas?map=c,c');

    expect(category.type).toBe('route');
    if (category.type !== 'route') return;

    expect(routeUrl(category.route).pathname).toBe('/search');
    expect(routeFacets(category.route)).toEqual([
      { key: 'c', value: 'feminino' },
      { key: 'c', value: 'bermudas' },
    ]);
  });

  it('resolves collections, campaigns, and CMS pages', () => {
    expect(resolveDeepLink('lojahr://collection/123')).toEqual({
      type: 'route',
      route: '/search?facets=%5B%7B%22key%22%3A%22productClusterIds%22%2C%22value%22%3A%22123%22%7D%5D',
    });
    expect(resolveDeepLink('https://www.hoperesort.com.br/campanha/black-friday')).toEqual({
      type: 'route',
      route: '/page/black-friday',
    });
    expect(resolveDeepLink('https://www.hoperesort.com.br/page/guia-de-tamanhos')).toEqual({
      type: 'route',
      route: '/page/guia-de-tamanhos',
    });
  });

  it('resolves search links and query aliases', () => {
    const resolution = resolveDeepLink('https://www.hoperesort.com.br/busca?query=bermuda%20preta');

    expect(resolution).toEqual({
      type: 'route',
      route: '/search?q=bermuda+preta',
    });
  });

  it('marks unsupported web hosts as external', () => {
    expect(resolveDeepLink('https://example.com/product/7771')).toEqual({
      type: 'external',
      url: 'https://example.com/product/7771',
    });
  });

  it('does not crash on empty or malformed links', () => {
    expect(resolveDeepLink('')).toEqual({ type: 'none' });
    expect(resolveDeepLink('https://[invalid')).toEqual({ type: 'none' });
  });
});

describe('redirectSystemPath', () => {
  it('ignores the native root/development-client bootstrap URL', () => {
    expect(redirectSystemPath({ path: '/', initial: true })).toBeNull();
    expect(
      redirectSystemPath({
        path: 'lojahr://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081',
        initial: true,
      }),
    ).toBeNull();
  });

  it('routes a supported public product URL into the app', () => {
    expect(
      redirectSystemPath({
        path: 'https://www.hoperesort.com.br/regata-alcas-medias-bolso-costas-rosa-turmalina-hf232760/p',
        initial: true,
      }),
    ).toBe('/product/regata-alcas-medias-bolso-costas-rosa-turmalina-hf232760');
  });

  it('falls back safely for unsupported external URLs', () => {
    expect(
      redirectSystemPath({
        path: 'https://example.com/not-supported',
        initial: false,
      }),
    ).toBe('/');
  });

  it('preserves unknown custom-scheme callbacks for the app to handle', () => {
    const callback = 'lojahr://auth/callback?code=abc';
    expect(redirectSystemPath({ path: callback, initial: false })).toBe(callback);
  });
});

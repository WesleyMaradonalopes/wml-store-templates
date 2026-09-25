import { resolveDeepLink } from '@/services/deep-links';

type NativeIntentEvent = {
  path: string | null;
  initial: boolean;
};

function isInitialRootOrDevelopmentClientUrl(path: string | null) {
  if (typeof path !== 'string') return true;
  try {
    // The initial native value can be a full URL or only a path. The fallback
    // base keeps both forms safe to inspect without throwing on malformed data.
    const url = new URL(path, 'lojahr://app');
    return url.hostname === 'expo-development-client'
      || url.pathname === ''
      || url.pathname === '/'
      || url.pathname === '/--/';
  } catch {
    const normalizedPath = path.trim();
    return normalizedPath === '' || normalizedPath === '/';
  }
}

export function redirectSystemPath({ path, initial }: NativeIntentEvent) {
  if (initial && isInitialRootOrDevelopmentClientUrl(path)) return null;

  try {
    const resolution = resolveDeepLink(path ?? '');
    if (resolution.type === 'route') return resolution.route;
    // Native intent cannot open an external browser itself. If an associated
    // web link is not one of our supported routes, keep the app safe on Home.
    if (resolution.type === 'external') return '/';
    // Preserve unknown custom-scheme URLs, including auth-session callbacks.
    return path;
  } catch {
    return '/';
  }
}

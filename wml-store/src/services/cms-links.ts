import { Linking, Platform } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

const APP_ROUTE_PATTERN = /^(?:page|product|search|coupons|privacy-policy|returns|stores|orders|favorites|account|checkout)(?:\/|\?|#|$)/i;

export function cmsInternalRoute(value: string): string | null {
  const target = value.trim();
  if (!target || target.startsWith('//')) return null;
  if (target.startsWith('/')) return target;
  if (APP_ROUTE_PATTERN.test(target)) return `/${target}`;
  return null;
}

export async function openCmsExternalLink(value: string): Promise<void> {
  const target = value.trim();
  if (!target) return;

  const normalizedTarget = target.startsWith('//') ? `https:${target}` : target;

  if (Platform.OS !== 'web' && /^https?:\/\//i.test(normalizedTarget)) {
    try {
      await openBrowserAsync(normalizedTarget, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
      return;
    } catch {
      // Fall through to the system handler if the in-app browser is unavailable.
    }
  }

  try {
    await Linking.openURL(normalizedTarget);
  } catch {
    // A link may not have an app/browser handler on the current device.
  }
}

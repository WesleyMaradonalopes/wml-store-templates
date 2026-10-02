import { getAnalytics, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import { registerTrackingProvider } from './telemetry';
import type { TrackingConsent, TrackingEvent } from './telemetry';

let registered = false;

export function registerFirebaseAnalyticsProvider() {
  if (registered) return;
  registered = true;

  const analytics = getAnalytics();
  registerTrackingProvider({
    id: 'firebase-ga4',
    async setConsent(consent: TrackingConsent) {
      await setAnalyticsCollectionEnabled(analytics, consent === 'granted');
    },
    async track(event: TrackingEvent) {
      const { name, ...parameters } = event;
      await analytics.logEvent(name, parameters);
    },
  });
}

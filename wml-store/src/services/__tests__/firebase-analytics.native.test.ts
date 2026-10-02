import { beforeEach, describe, expect, it, vi } from 'vitest';

const firebaseAnalytics = vi.hoisted(() => ({
  instance: { logEvent: vi.fn() },
  setAnalyticsCollectionEnabled: vi.fn(),
}));

vi.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: () => firebaseAnalytics.instance,
  setAnalyticsCollectionEnabled: firebaseAnalytics.setAnalyticsCollectionEnabled,
}));

describe('Firebase Analytics provider', () => {
  beforeEach(() => {
    vi.resetModules();
    firebaseAnalytics.instance.logEvent.mockReset().mockResolvedValue(undefined);
    firebaseAnalytics.setAnalyticsCollectionEnabled.mockReset().mockResolvedValue(undefined);
  });

  it('enables collection and forwards GA4 ecommerce event parameters', async () => {
    const telemetry = await import('../telemetry');
    const provider = await import('../firebase-analytics.native');
    provider.registerFirebaseAnalyticsProvider();

    await telemetry.initializeTracking();
    const event: import('../telemetry').TrackingEvent = {
      name: 'purchase',
      transaction_id: 'order-123',
      currency: 'BRL',
      value: 683.32,
      items: [{ item_id: 'sku-1', item_name: 'Produto', price: 683.32, quantity: 1 }],
    };
    await telemetry.trackEvent(event);

    expect(firebaseAnalytics.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(
      firebaseAnalytics.instance,
      true,
    );
    expect(firebaseAnalytics.instance.logEvent).toHaveBeenCalledWith('purchase', {
      transaction_id: 'order-123',
      currency: 'BRL',
      value: 683.32,
      items: [{ item_id: 'sku-1', item_name: 'Produto', price: 683.32, quantity: 1 }],
    });
  });

  it('disables native collection when tracking is denied', async () => {
    const telemetry = await import('../telemetry');
    const provider = await import('../firebase-analytics.native');
    provider.registerFirebaseAnalyticsProvider();

    await telemetry.initializeTracking();
    await telemetry.setTrackingConsent('denied');

    expect(firebaseAnalytics.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(
      firebaseAnalytics.instance,
      false,
    );
  });
});

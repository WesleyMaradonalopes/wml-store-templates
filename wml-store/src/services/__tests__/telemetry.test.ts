import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ storage: new Map<string, unknown>() }));

vi.mock('../storage', () => ({
  getStoredJson: async (key: string) => state.storage.get(key) ?? null,
  setStoredJson: async (key: string, value: unknown) => { state.storage.set(key, value); },
  removeStoredValue: async (key: string) => { state.storage.delete(key); },
}));

describe('telemetry consent and routing', () => {
  let telemetry: typeof import('../telemetry');

  beforeEach(async () => {
    state.storage.clear();
    vi.resetModules();
    telemetry = await import('../telemetry');
  });

  it('enables tracking automatically for a new install', async () => {
    const track = vi.fn();
    const setConsent = vi.fn();
    telemetry.registerTrackingProvider({ id: 'test', track, setConsent });

    await telemetry.trackEvent({ name: 'screen_view', screen_name: 'home' });

    expect(setConsent).toHaveBeenLastCalledWith('granted');
    expect(track).toHaveBeenCalledOnce();
  });

  it('honors a previously saved denial', async () => {
    state.storage.set('lojahr:tracking-consent', 'denied');
    const track = vi.fn();
    const setConsent = vi.fn();
    telemetry.registerTrackingProvider({ id: 'test', track, setConsent });

    await telemetry.trackEvent({ name: 'screen_view', screen_name: 'home' });

    expect(setConsent).toHaveBeenLastCalledWith('denied');
    expect(track).not.toHaveBeenCalled();
  });

  it('sends events to registered providers after explicit consent and stops after revocation', async () => {
    const track = vi.fn();
    const setConsent = vi.fn();
    telemetry.registerTrackingProvider({ id: 'test', track, setConsent });

    await telemetry.setTrackingConsent('granted');
    const event = { name: 'search', search_length: 5 } as const;
    await telemetry.trackEvent(event);
    await telemetry.setTrackingConsent('denied');
    await telemetry.trackEvent(event);

    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith(event);
    expect(setConsent).toHaveBeenLastCalledWith('denied');
  });

  it('uses stable screen names and strips dynamic route values', () => {
    expect(telemetry.screenNameForPath('/product/12345')).toBe('product_detail');
    expect(telemetry.screenNameForPath('/page/summer-campaign')).toBe('content_page');
    expect(telemetry.screenNameForPath('/orders/order-678')).toBe('order_detail');
    expect(telemetry.screenNameForPath('/(tabs)/cart')).toBe('cart');
  });

  it('isolates app behavior from provider failures', async () => {
    const track = vi.fn().mockRejectedValue(new Error('provider unavailable'));
    telemetry.registerTrackingProvider({ id: 'test', track });
    await telemetry.setTrackingConsent('granted');

    await expect(telemetry.trackEvent({ name: 'screen_view', screen_name: 'home' })).resolves.toBeUndefined();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  asyncStorage: new Map<string, string>(),
  secureStore: new Map<string, string>(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => state.asyncStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => { state.asyncStorage.set(key, value); },
    removeItem: async (key: string) => { state.asyncStorage.delete(key); },
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => state.secureStore.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { state.secureStore.set(key, value); },
  deleteItemAsync: async (key: string) => { state.secureStore.delete(key); },
}));

describe('authenticated session requests', () => {
  let auth: typeof import('../auth');

  beforeEach(async () => {
    state.asyncStorage.clear();
    state.secureStore.clear();
    vi.restoreAllMocks();
    vi.resetModules();
    auth = await import('../auth');
  });

  it('clears the local session and notifies once after a 401', async () => {
    await auth.saveAccountSession('user@example.com');
    state.secureStore.set('lojahr_vtex_user_token', 'expired-token');
    const onExpired = vi.fn();
    auth.subscribeAccountSessionExpired(onExpired);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }));

    const response = await auth.fetchAuthenticated('https://example.test/protected', {
      headers: { VtexIdclientAutCookie: 'expired-token' },
    });

    expect(response.status).toBe(401);
    expect(onExpired).toHaveBeenCalledOnce();
    expect(await auth.getAccountSession()).toBeNull();
    expect(await auth.getVtexUserToken()).toBeNull();
    expect(state.secureStore.has('lojahr_vtex_user_token')).toBe(false);
  });

  it('does not clear the session for a successful response', async () => {
    await auth.saveAccountSession('user@example.com');
    state.secureStore.set('lojahr_vtex_user_token', 'valid-token');
    const onExpired = vi.fn();
    auth.subscribeAccountSessionExpired(onExpired);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));

    await auth.fetchAuthenticated('https://example.test/protected', {
      headers: { VtexIdclientAutCookie: 'valid-token' },
    });

    expect(onExpired).not.toHaveBeenCalled();
    expect((await auth.getAccountSession())?.email).toBe('user@example.com');
    expect(await auth.getVtexUserToken()).toBe('valid-token');
  });

  it('keeps only the remembered email separate from the account session', async () => {
    await auth.saveRememberedLogin(' USER@EXAMPLE.COM ');

    expect(await auth.getRememberedLogin()).toEqual({
      email: 'user@example.com',
    });
    expect(state.secureStore.get('lojahr:remembered-login')).toBe(JSON.stringify({ email: 'user@example.com' }));

    await auth.saveAccountSession('user@example.com');
    await auth.clearAccountSession();

    expect(await auth.getRememberedLogin()).toEqual({
      email: 'user@example.com',
    });

    await auth.clearRememberedLogin();
    expect(await auth.getRememberedLogin()).toBeNull();
  });

  it('removes a password left by an older remembered-login record', async () => {
    state.secureStore.set('lojahr:remembered-login', JSON.stringify({ email: ' USER@EXAMPLE.COM ', password: 'old-password' }));

    expect(await auth.getRememberedLogin()).toEqual({ email: 'user@example.com' });
    expect(state.secureStore.get('lojahr:remembered-login')).toBe(JSON.stringify({ email: 'user@example.com' }));
  });
});

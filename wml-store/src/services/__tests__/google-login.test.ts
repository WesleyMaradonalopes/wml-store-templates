import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGoogleLoginFailure, getNativeGoogleConfiguration, GoogleLoginError, signInWithNativeGoogle } from '../google-login';

const native = vi.hoisted(() => ({
  configure: vi.fn(),
  checkPlayServices: vi.fn(),
  signIn: vi.fn(),
  createAccount: vi.fn(),
  presentExplicitSignIn: vi.fn(),
}));

vi.mock('react-native-nitro-google-signin', () => ({
  GoogleOneTapSignIn: native,
  isNoSavedCredentialFoundResponse: (result: { type: string }) => result.type === 'noSavedCredentialFound',
  isSuccessResponse: (result: { type: string; data?: unknown }) => result.type === 'success' && result.data != null,
}));

const ids = {
  webClientId: '639876978523-web.apps.googleusercontent.com',
  androidClientId: '639876978523-android.apps.googleusercontent.com',
  iosClientId: '639876978523-ios.apps.googleusercontent.com',
};
const success = { type: 'success', data: { idToken: 'google-id-token', user: { email: ' USER@EXAMPLE.COM ' } } };

describe('native Google login configuration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    native.checkPlayServices.mockResolvedValue(undefined);
    native.signIn.mockResolvedValue(success);
  });

  it('uses the Web client, not the Android client, as the native token audience', async () => {
    expect(await signInWithNativeGoogle('android', ids)).toEqual({ idToken: 'google-id-token', email: 'user@example.com' });
    expect(native.configure).toHaveBeenCalledWith({ webClientId: ids.webClientId });
    expect(native.checkPlayServices).toHaveBeenCalledOnce();
  });

  it('provides the matching iOS client to the native SDK', () => {
    expect(getNativeGoogleConfiguration('ios', ids)).toEqual({ webClientId: ids.webClientId, iosClientId: ids.iosClientId });
  });

  it('rejects the previous cross-project VTEX audience before opening Google', async () => {
    await expect(signInWithNativeGoogle('android', { ...ids, webClientId: '288839013408-website.apps.googleusercontent.com' }))
      .rejects.toMatchObject({ code: 'configuration' });
    expect(native.configure).not.toHaveBeenCalled();
    expect(native.signIn).not.toHaveBeenCalled();
  });

  it.each(['android', 'ios'] as const)('does not borrow a website client when native Web configuration is missing (%s)', (platform) => {
    expect(() => getNativeGoogleConfiguration(platform, { ...ids, webClientId: '' })).toThrow(GoogleLoginError);
  });

  it('rejects using the native client ID as the Web client ID', () => {
    expect(() => getNativeGoogleConfiguration('android', { ...ids, webClientId: ids.androidClientId })).toThrow(GoogleLoginError);
  });

  it('checks the iOS project as well as Android', () => {
    expect(() => getNativeGoogleConfiguration('ios', { ...ids, iosClientId: '123-other.apps.googleusercontent.com' })).toThrow(GoogleLoginError);
  });

  it('falls back to the account picker only when no saved credential is found', async () => {
    native.signIn.mockResolvedValue({ type: 'noSavedCredentialFound', data: null });
    native.createAccount.mockResolvedValue({ type: 'noSavedCredentialFound', data: null });
    native.presentExplicitSignIn.mockResolvedValue(success);
    expect(await signInWithNativeGoogle('android', ids)).toEqual({ idToken: 'google-id-token', email: 'user@example.com' });
    expect(native.createAccount).toHaveBeenCalledOnce();
    expect(native.presentExplicitSignIn).toHaveBeenCalledOnce();
  });

  it('does not restart the account picker after user cancellation', async () => {
    native.signIn.mockResolvedValue({ type: 'cancelled', data: null });
    expect(await signInWithNativeGoogle('android', ids)).toBeNull();
    expect(native.createAccount).not.toHaveBeenCalled();
    expect(native.presentExplicitSignIn).not.toHaveBeenCalled();
  });

  it('refuses a Google success result without an ID token', async () => {
    native.signIn.mockResolvedValue({ ...success, data: { ...success.data, idToken: '' } });
    await expect(signInWithNativeGoogle('android', ids)).rejects.toMatchObject({ code: 'credential' });
  });
});

describe('safe Google login messages', () => {
  it('replaces the actual 28444 native stack with a short configuration message', () => {
    const failure = getGoogleLoginFailure(new Error('com.nitrogooglesignin.GoogleSignInException: [28444] Developer console is not set up correctly.\n at GoogleSigninController.kt:424'));
    expect(failure.code).toBe('configuration');
    expect(failure.message).toContain('Use e-mail e senha');
    expect(failure.message).not.toContain('GoogleSigninController');
    expect(failure.message!.length).toBeLessThan(160);
  });

  it.each(['SIGN_IN_CANCELLED', 'IN_PROGRESS'])('does not show an error for %s', (code) => {
    expect(getGoogleLoginFailure({ code, message: 'native stack' }).message).toBeNull();
  });

  it('does not display arbitrary provider output, stack traces or tokens', () => {
    const failure = getGoogleLoginFailure(new Error('secret-token and server debug output'));
    expect(failure.code).toBe('unexpected');
    expect(failure.message).not.toContain('secret-token');
  });

  it('keeps network failures distinct from OAuth configuration errors', () => {
    expect(getGoogleLoginFailure(new TypeError('Network request failed')).code).toBe('network');
  });

  it('preserves the short, controlled store error', () => {
    const error = new GoogleLoginError('store-unavailable');
    expect(getGoogleLoginFailure(error)).toEqual({ code: 'store-unavailable', message: error.message });
  });
});

type NativePlatform = 'android' | 'ios';

export type GoogleClientIds = {
  webClientId: string;
  androidClientId: string;
  iosClientId: string;
};

const messages = {
  configuration: 'O login com Google está indisponível nesta versão. Use e-mail e senha ou código de acesso.',
  credential: 'Não foi possível validar o acesso Google na loja. Use e-mail e senha ou código de acesso.',
  'store-unavailable': 'O login com Google está temporariamente indisponível na loja. Use outra opção de acesso.',
  'inactive-account': 'Esta conta Google não está ativa na loja. Entre em contato com a Central de Ajuda.',
  identity: 'Não foi possível identificar sua conta Google. Tente novamente.',
  'native-unavailable': 'Abra o aplicativo instalado para usar o login com Google. Essa opção não funciona no Expo Go.',
  'play-services': 'Atualize os serviços do Google neste dispositivo ou use outra opção de acesso.',
  network: 'Não foi possível conectar. Confira sua internet e tente novamente.',
  unexpected: 'Não foi possível entrar com Google. Tente novamente ou use outra opção de acesso.',
} as const;

export class GoogleLoginError extends Error {
  constructor(readonly code: keyof typeof messages) {
    super(messages[code]);
    this.name = 'GoogleLoginError';
  }
}

function clientProject(clientId: string) {
  return /^(\d+)-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.exec(clientId)?.[1];
}

export function getNativeGoogleConfiguration(platform: NativePlatform, ids: GoogleClientIds) {
  const webClientId = ids.webClientId.trim();
  const nativeClientId = (platform === 'ios' ? ids.iosClientId : ids.androidClientId).trim();
  const project = clientProject(webClientId);

  // The web audience and the native package/certificate must belong to the
  // same Google project. A VTEX website client is not a native-app fallback.
  if (!project || project !== clientProject(nativeClientId) || webClientId === nativeClientId) {
    throw new GoogleLoginError('configuration');
  }

  return {
    webClientId,
    ...(platform === 'ios' ? { iosClientId: nativeClientId } : {}),
  };
}

export function getGoogleLoginFailure(error: unknown) {
  if (error instanceof GoogleLoginError) return { code: error.code, message: error.message };

  const value = error && typeof error === 'object' ? error as { code?: unknown; message?: unknown } : {};
  const code = String(value.code ?? '');
  const detail = typeof value.message === 'string' ? value.message : '';

  if (code === 'SIGN_IN_CANCELLED' || code === '12501' || /\bSIGN_IN_CANCELLED\b/.test(detail)) {
    return { code: 'cancelled', message: null };
  }
  if (code === 'IN_PROGRESS' || /\bIN_PROGRESS\b/.test(detail)) {
    return { code: 'in-progress', message: null };
  }
  if (code === 'DEVELOPER_ERROR' || code === '10' || /\b28444\b|DEVELOPER_ERROR|Developer console is not set up/i.test(detail)) {
    return { code: 'configuration', message: messages.configuration };
  }
  if (code === 'PLAY_SERVICES_NOT_AVAILABLE' || /\bPLAY_SERVICES_NOT_AVAILABLE\b/.test(detail)) {
    return { code: 'play-services', message: messages['play-services'] };
  }
  if (/hybrid object.*NitroGoogleSignin.*(not|missing)|native module.*not (registered|found)|TurboModuleRegistry|NitroModules.*not (installed|available)/i.test(detail)) {
    return { code: 'native-unavailable', message: messages['native-unavailable'] };
  }
  if (/network request failed|failed to fetch|network_error/i.test(detail)) {
    return { code: 'network', message: messages.network };
  }

  // Never render a native stack, server response, token or arbitrary exception
  // message in the account screen.
  return { code: 'unexpected', message: messages.unexpected };
}

export async function signInWithNativeGoogle(platform: NativePlatform, ids: GoogleClientIds) {
  const configuration = getNativeGoogleConfiguration(platform, ids);
  // Lazy import keeps the account screen usable when the native SDK is absent.
  const { GoogleOneTapSignIn, isNoSavedCredentialFoundResponse, isSuccessResponse } = await import('react-native-nitro-google-signin');
  GoogleOneTapSignIn.configure(configuration);
  await GoogleOneTapSignIn.checkPlayServices();

  let result = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(result)) result = await GoogleOneTapSignIn.createAccount();
  if (isNoSavedCredentialFoundResponse(result)) result = await GoogleOneTapSignIn.presentExplicitSignIn();
  if (result.type === 'cancelled') return null;
  if (!isSuccessResponse(result) || !result.data.idToken?.trim()) throw new GoogleLoginError('credential');

  return { idToken: result.data.idToken, email: (result.data.user.email || '').trim().toLowerCase() };
}

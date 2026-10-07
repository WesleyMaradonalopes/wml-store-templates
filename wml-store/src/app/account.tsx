import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NewsletterOptIn } from '@/components/newsletter-opt-in';
import { ScreenHeader } from '@/components/screen-header';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { useTheme } from '@/hooks/use-theme';
import { clearAccountSession, clearRememberedLogin, exchangeVtexGoogleAccessToken, getAccountSession, getGoogleEmailFromIdToken, getRememberedLogin, getVtexGoogleClientId, loginVtexGoogle, loginVtexPassword, saveAccountSession, saveRememberedLogin, sendVtexAccessKey, setVtexPassword, startVtexAuthentication, subscribeAccountSession, validateVtexAccessKey } from '@/services/auth';
import { getOrderForm, type OrderForm } from '@/services/cart';
import { getCustomerProfileFromMasterData, updateCustomerProfile } from '@/services/customer';
import { getGoogleLoginFailure, GoogleLoginError, signInWithNativeGoogle } from '@/services/google-login';
import { disableNotifications, enableNotifications, initializeNotifications, NotificationModuleUnavailableError, NotificationPermissionError } from '@/services/notifications';
import { birthDateToApi, formatBirthDate, formatBirthDateInput, formatGenderLabel, formatPhoneInput, formatPhoneWithoutCountryCode, phoneToApi } from '@/utils/customer-formatters';

import AppleLogoIcon from '@/components/icons/AppleLogoIcon';
import Box01Icon from '@/components/icons/Box01Icon';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import CloseIcon from '@/components/icons/CloseIcon';
import EyeIcon from '@/components/icons/EyeIcon';
import GoogleGIcon from '@/components/icons/GoogleGIcon';
import HeartIcon from '@/components/icons/HeartIcon';
import HomeNotificationsIcon from '@/components/icons/HomeNotificationsIcon';
import HomeUtilityDiscountIcon from '@/components/icons/HomeUtilityDiscountIcon';
import HomeUtilityPrivacyIcon from '@/components/icons/HomeUtilityPrivacyIcon';
import HomeUtilityReturnsIcon from '@/components/icons/HomeUtilityReturnsIcon';
import HomeUtilityStoresIcon from '@/components/icons/HomeUtilityStoresIcon';
import LockIcon from '@/components/icons/LockIcon';
import LogoutIcon from '@/components/icons/LogoutIcon';
import UserIcon from '@/components/icons/UserIcon';
import { styles } from '@/styles/account.styles';

type AccountView = 'home' | 'access' | 'password' | 'email' | 'code' | 'register' | 'register-code' | 'register-password' | 'recovery-email' | 'recovery-password' | 'personal';
type OrderFormProfile = NonNullable<OrderForm['clientProfileData']> & { homePhone?: string; isNewsletterOptIn?: boolean };
type CustomerProfile = OrderFormProfile & { gender?: string; birthDate?: string };

function digitCount(value: unknown) {
  return String(value || '').replace(/\D/g, '').length;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordRules(value: string) {
  return {
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    length: value.length >= 8,
  };
}

function profileValue(current: string | undefined, incoming: string | undefined, minimumDigits = 0) {
  const currentValue = String(current || '').trim();
  const incomingValue = String(incoming || '').trim();
  const currentIsComplete = Boolean(currentValue)
    && !currentValue.includes('*')
    && (!minimumDigits || digitCount(currentValue) >= minimumDigits);
  return currentIsComplete ? currentValue : incomingValue || currentValue;
}

function mergeOrderFormProfile(current: CustomerProfile, incoming: OrderFormProfile): CustomerProfile {
  return {
    ...current,
    ...incoming,
    email: current.email || incoming.email,
    firstName: profileValue(current.firstName, incoming.firstName),
    lastName: profileValue(current.lastName, incoming.lastName),
    document: profileValue(current.document, incoming.document, 11),
    phone: profileValue(current.phone || current.homePhone, incoming.phone || incoming.homePhone, 10),
    homePhone: profileValue(current.homePhone || current.phone, incoming.homePhone || incoming.phone, 10),
    birthDate: current.birthDate || incoming.birthDate,
    gender: current.gender || incoming.gender,
    isNewsletterOptIn: current.isNewsletterOptIn ?? incoming.isNewsletterOptIn,
  };
}

// Keep the Google login implementation, but omit its button until the VTEX
// integration is complete. Re-enable it in a future app version after testing.
const SHOW_GOOGLE_LOGIN = false;
// Keep the Apple login handler and UI implementation available, but hide its
// button until the Apple Developer and VTEX authentication setup is complete.
const SHOW_APPLE_LOGIN = false;
const googleClientIdPlaceholder = 'not-configured.apps.googleusercontent.com';
const googleRedirectUri = makeRedirectUri({ scheme: 'lojahr', path: 'oauthredirect' });
const customerServiceWhatsAppUrl = 'https://api.whatsapp.com/send?phone=5511993680367';

async function openCustomerServiceWhatsApp() {
  try {
    await Linking.openURL(customerServiceWhatsAppUrl);
  } catch {
    Alert.alert('Não foi possível abrir a Central de Ajuda', 'Tente novamente em instantes.');
  }
}

WebBrowser.maybeCompleteAuthSession();

export default function AccountScreen() {
  const router = useRouter();
  const theme = useTheme();
	const SHOW_THEME_TOGGLE = true;
  const { view: requestedView } = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<AccountView>(requestedView === 'access' ? 'access' : 'home');
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [notificationsMessage, setNotificationsMessage] = useState<string | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [accessCodeLoading, setAccessCodeLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [rememberAccess, setRememberAccess] = useState(false);
  const [rememberHelpVisible, setRememberHelpVisible] = useState(false);
  const configuredGoogleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const configuredGoogleBrowserClientId = process.env.EXPO_PUBLIC_GOOGLE_BROWSER_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const configuredGoogleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
  const configuredGoogleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
  const [googleWebClientId, setGoogleWebClientId] = useState(configuredGoogleBrowserClientId || googleClientIdPlaceholder);
  const [googleConfigMessage, setGoogleConfigMessage] = useState<string | null>(null);
  const googlePlatformClientId = Platform.select({
    ios: configuredGoogleIosClientId,
    android: configuredGoogleAndroidClientId,
    default: googleWebClientId,
  }) || googleClientIdPlaceholder;
  const googleConfigured = Platform.select({
    ios: Boolean(configuredGoogleIosClientId),
    android: Boolean(configuredGoogleAndroidClientId),
    default: Boolean(googleWebClientId && googleWebClientId !== googleClientIdPlaceholder),
  }) ?? false;
  const [googleRequest, , promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: googlePlatformClientId,
    iosClientId: configuredGoogleIosClientId || undefined,
    androidClientId: configuredGoogleAndroidClientId || undefined,
    webClientId: googleWebClientId,
    redirectUri: googleRedirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });
  const onScroll = useTabBarScroll();
  const rememberedLoginLoad = useRef(0);
  const googleLoginInProgress = useRef(false);

  const loadRememberedAccess = useCallback(async () => {
    const loadId = rememberedLoginLoad.current + 1;
    rememberedLoginLoad.current = loadId;
    const saved = await getRememberedLogin();
    if (loadId !== rememberedLoginLoad.current) return;

    if (!saved) {
      setRememberAccess(false);
      setEmail('');
      setPassword('');
      return;
    }

    setEmail(saved.email);
    setPassword('');
    setRememberAccess(true);
  }, []);

  useFocusEffect(useCallback(() => {
    if (view !== 'password') return undefined;

    void loadRememberedAccess();
    return () => { rememberedLoginLoad.current += 1; };
  }, [loadRememberedAccess, view]));

  useEffect(() => {
    if (Platform.OS !== 'web' || configuredGoogleBrowserClientId) return;
    let active = true;
    getVtexGoogleClientId().then((clientId) => {
      if (!active) return;
      setGoogleWebClientId(clientId);
    }).catch(() => {
      if (!active) return;
      setGoogleConfigMessage('O login com Google está temporariamente indisponível. Use outra opção de acesso.');
    });
    return () => { active = false; };
  }, [configuredGoogleBrowserClientId]);

  useEffect(() => {
    if (requestedView === 'access') setView('access');
  }, [requestedView]);

  useEffect(() => {
    const unsubscribe = subscribeAccountSession((session) => {
      if (session?.email) return;
      setLoggedIn(false);
      setProfile({});
      setProfileMessage(null);
      setView('home');
      // Sair da conta remove apenas a sessão autenticada. A preferência de
      // lembrar o acesso continua válida e deve reaparecer no próximo login.
      void loadRememberedAccess();
    });
    return unsubscribe;
  }, [loadRememberedAccess]);

  useEffect(() => {
    let active = true;
    initializeNotifications().then((state) => {
      if (!active) return;
      setNotifications(state.enabled);
    }).catch((error) => {
      if (active) setNotificationsMessage(error instanceof Error ? error.message : 'Não foi possível carregar a configuração de notificações.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getAccountSession().then((session) => {
      if (!active || !session?.email?.trim()) return;
      const sessionEmail = session.email.trim().toLowerCase();
      setEmail(sessionEmail);
      setLoggedIn(true);
      getCustomerProfileFromMasterData(sessionEmail).then((customer) => {
        if (!active || !customer) return;
        setProfile(customer);
        // O e-mail da sessão autenticada é a identidade da conta. O perfil
        // remoto pode retornar outra capitalização, mas nunca deve ser
        // substituído pelo e-mail temporário do carrinho.
      }).catch((error) => {
        if (active) setProfileMessage(error instanceof Error ? error.message : 'Não foi possível carregar o perfil VTEX.');
      });
      getOrderForm().then((orderForm) => {
        if (!active || !orderForm.clientProfileData) return;
        setProfile((current) => ({
          ...mergeOrderFormProfile(current, orderForm.clientProfileData!),
          email: sessionEmail,
        }));
      }).catch(() => undefined);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loggedIn]);

  useFocusEffect(useCallback(() => {
    if (!loggedIn || view !== 'personal' || !email.trim()) return undefined;

    let active = true;
    const sessionEmail = email.trim().toLowerCase();
    getCustomerProfileFromMasterData(sessionEmail).then((customer) => {
      if (!active || !customer) return;
      setProfile({ ...customer, email: sessionEmail });
      setProfileMessage(null);
    }).catch((error) => {
      if (active) setProfileMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o perfil VTEX.');
    });

    return () => { active = false; };
  }, [email, loggedIn, view]));

  async function changeNotifications(value: boolean) {
    if (notificationsLoading) return;

    const previousValue = notifications;
    setNotifications(value);
    setNotificationsMessage(null);
    setNotificationsLoading(true);
    try {
      const state = value ? await enableNotifications() : await disableNotifications();
      setNotifications(state.enabled);
    } catch (error) {
      setNotifications(previousValue);
      setNotificationsMessage(error instanceof NotificationPermissionError
        ? 'Permissão de notificações negada. Ative-a nas configurações do dispositivo para receber avisos.'
        : error instanceof NotificationModuleUnavailableError
          ? 'Para ativar notificações, instale o development build do app; o Expo Go não inclui este módulo nativo.'
          : 'Não foi possível atualizar a permissão de notificações. Tente novamente.');
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function login() {
    if (!email.trim() || !password.trim()) {
      setAuthMessage('Informe seu e-mail e sua senha.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    try {
      setAuthMessage(null);
      setLoginLoading(true);
      await loginVtexPassword(normalizedEmail, password);
      try {
        if (rememberAccess) await saveRememberedLogin(normalizedEmail);
        else await clearRememberedLogin();
      } catch {
        // A preferência de lembrar o acesso não deve impedir um login válido.
      }
      await saveAccountSession(normalizedEmail);
      setEmail(normalizedEmail);
      setPassword('');
      setLoggedIn(true);
      setView('home');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setLoginLoading(false);
    }
  }

  function changeRememberAccess(value: boolean) {
    rememberedLoginLoad.current += 1;
    setRememberAccess(value);
    if (!value) {
      setEmail('');
      setPassword('');
      void clearRememberedLogin().catch(() => undefined);
      return;
    }

    // Persiste o e-mail assim que a opção é ativada, sem esperar um novo
    // login. O login continua salvando novamente o e-mail normalizado.
    if (email.trim()) void saveRememberedLogin(email).catch(() => undefined);
  }

  async function logout() {
    setLogoutLoading(true);
    try {
      await clearAccountSession();
      setLoggedIn(false);
      setProfile({});
      setProfileMessage(null);
      setView('home');
      await loadRememberedAccess();
    } finally {
      setLogoutLoading(false);
    }
  }

  async function requestAccessCode() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setAuthMessage('Informe um e-mail válido.');
      return;
    }
    try {
      setAuthMessage(null);
      setAccessCodeLoading(true);
      const token = await startVtexAuthentication();
      await sendVtexAccessKey(normalizedEmail, token);
      setEmail(normalizedEmail);
      setAuthToken(token);
      setAccessCode('');
      setCodeSentAt(Date.now());
      setView('code');
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Não foi possível enviar o código.'); }
    finally { setAccessCodeLoading(false); }
  }

  async function sendRegistrationCode() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setAuthMessage('Informe um e-mail válido.');
      return;
    }
    try {
      setAuthMessage(null);
      setAccessCodeLoading(true);
      // Garante que o cliente também exista no Shopper/Master Data antes de
      // concluir o cadastro por código na VTEX. O valor pode ser false: o
      // checkbox é um opt-in de novidades, não uma condição para cadastro.
      await updateCustomerProfile(normalizedEmail, { email: normalizedEmail, isNewsletterOptIn: newsletterOptIn });
      const token = await startVtexAuthentication();
      await sendVtexAccessKey(normalizedEmail, token);
      setEmail(normalizedEmail);
      setAuthToken(token);
      setAccessCode('');
      setCodeSentAt(Date.now());
      setNewPassword('');
      setNewPasswordConfirmation('');
      setView('register-code');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível enviar o código.');
    } finally {
      setAccessCodeLoading(false);
    }
  }

  async function resendAccessCode() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setAuthMessage('Informe um e-mail válido.');
      return;
    }
    try {
      setAuthMessage(null);
      setAccessCodeLoading(true);
      const token = await startVtexAuthentication();
      await sendVtexAccessKey(normalizedEmail, token);
      setEmail(normalizedEmail);
      setAuthToken(token);
      setAccessCode('');
      setCodeSentAt(Date.now());
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível reenviar o código.');
    } finally {
      setAccessCodeLoading(false);
    }
  }

  async function sendRecoveryCode() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setAuthMessage('Informe um e-mail válido.');
      return;
    }
    try {
      setAuthMessage(null);
      setAccessCodeLoading(true);
      const token = await startVtexAuthentication();
      await sendVtexAccessKey(normalizedEmail, token);
      setEmail(normalizedEmail);
      setAuthToken(token);
      setAccessCode('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setView('recovery-password');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível enviar o código.');
    } finally {
      setAccessCodeLoading(false);
    }
  }

  async function completePasswordSetup() {
    const rules = getPasswordRules(newPassword);
    if (!accessCode.trim()) {
      setAuthMessage('Informe o código enviado para o seu e-mail.');
      return;
    }
    if (!Object.values(rules).every(Boolean)) {
      setAuthMessage('A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula e um número.');
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      setAuthMessage('A confirmação da senha não confere.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    try {
      setAuthMessage(null);
      setCodeLoading(true);
      await setVtexPassword(
        normalizedEmail,
        accessCode.trim(),
        newPassword,
        authToken,
        view === 'register-password' ? 'register' : 'recovery',
      );
      // O setpassword pode responder sem o cookie de usuário em aplicativos
      // nativos; o login subsequente garante uma sessão utilizável no app.
      await loginVtexPassword(normalizedEmail, newPassword);
      await saveAccountSession(normalizedEmail);
      setEmail(normalizedEmail);
      setPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setLoggedIn(true);
      setView('home');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível criar ou alterar a senha.');
    } finally {
      setCodeLoading(false);
    }
  }

  async function validateAccessCode() {
    try {
      setAuthMessage(null);
      setCodeLoading(true);
      await validateVtexAccessKey(email.trim(), accessCode.trim(), authToken);
      await saveAccountSession(email.trim());
      setLoggedIn(true);
      setView('home');
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Código inválido.'); }
    finally { setCodeLoading(false); }
  }

  async function loginWithGoogle() {
    if (googleLoginInProgress.current || loginLoading) return;
    if (Platform.OS === 'web' && (!googleConfigured || !googleRequest)) {
      setAuthMessage(googleConfigMessage || 'O login com Google está temporariamente indisponível. Use outra opção de acesso.');
      return;
    }

    googleLoginInProgress.current = true;
    let stage = 'google';
    try {
      setAuthMessage(null);
      setLoginLoading(true);

      let credential = '';
      let accessToken = '';
      let googleEmail = '';

      if (Platform.OS === 'web') {
        const result = await promptGoogleAsync();
        if (result.type !== 'success') {
          if (result.type !== 'cancel' && result.type !== 'dismiss') setAuthMessage('Não foi possível abrir o login com Google.');
          return;
        }
        credential = result.params.id_token || result.authentication?.idToken || '';
        accessToken = result.authentication?.accessToken || result.params.access_token || '';
      } else {
        const result = await signInWithNativeGoogle(Platform.OS === 'ios' ? 'ios' : 'android', {
          webClientId: configuredGoogleWebClientId,
          androidClientId: configuredGoogleAndroidClientId,
          iosClientId: configuredGoogleIosClientId,
        });
        if (!result) return;
        credential = result.idToken;
        googleEmail = result.email;
      }

      if (!credential && !accessToken) throw new GoogleLoginError('credential');
      stage = 'vtex';
      // Prefer the existing Google ID-token flow. The optional VTEX OAuth
      // exchange must not replace it just because the web SDK also returns an access token.
      const data = credential ? await loginVtexGoogle(credential) : await exchangeVtexGoogleAccessToken(accessToken);
      const accountEmail = getGoogleEmailFromIdToken(credential) || googleEmail.toLowerCase() || (data.userId?.includes('@') ? data.userId.toLowerCase() : '');
      if (!accountEmail) throw new GoogleLoginError('identity');
      stage = 'session';
      await saveAccountSession(accountEmail);
      setEmail(accountEmail);
      setLoggedIn(true);
      setView('home');
    } catch (error) {
      const failure = getGoogleLoginFailure(error);
      setAuthMessage(failure.message);
      // Only fixed diagnostic codes: never log credentials, personal data or native stacks.
      if (__DEV__ && failure.message) console.info('[Google login]', { stage, reason: failure.code });
    } finally {
      googleLoginInProgress.current = false;
      setLoginLoading(false);
    }
  }

  function loginWithApple() {
    setAuthMessage('O login com Apple será ativado após a configuração das credenciais da Apple.');
  }

  function openRegister() {
    setAuthMessage(null);
    setNewsletterOptIn(true);
    setView('register');
  }

  if (view === 'home') {
    return <ThemedView style={styles.container}><SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}><View style={styles.accountScreen}><ScrollView onScroll={onScroll} scrollEventThrottle={16} style={styles.accountScroll}>
      <ScreenHeader back={false} showSearch={false} showCart={false} logoWidth={88} logoHeight={24} logoOffsetY={0} />
      <View style={styles.content}>
        {loggedIn ? <LoggedAccountV2 email={email} notifications={notifications} onNotificationsChange={(value) => { void changeNotifications(value); }} notificationsLoading={notificationsLoading} notificationsMessage={notificationsMessage} onLogout={logout} logoutLoading={logoutLoading} onPersonal={() => setView('personal')} onOrders={() => router.push('/orders')} onFavorites={() => router.push('/favorites')} onPasswordReset={() => { setAuthMessage(null); setView('recovery-email'); }} onCoupons={() => router.push('/coupons' as never)} onReturns={() => router.push('/returns' as never)} onPrivacy={() => router.push('/privacy-policy' as never)} onHelp={() => { void openCustomerServiceWhatsApp(); }} /> : <GuestAccount notifications={notifications} onNotificationsChange={(value) => { void changeNotifications(value); }} notificationsLoading={notificationsLoading} notificationsMessage={notificationsMessage} onEnter={() => setView('access')} onRegister={openRegister} onCoupons={() => router.push('/coupons' as never)} onReturns={() => router.push('/returns' as never)} onPrivacy={() => router.push('/privacy-policy' as never)} onHelp={() => { void openCustomerServiceWhatsApp(); }} />}
      </View>
    </ScrollView><View style={styles.themeToggleAbove}>{SHOW_THEME_TOGGLE && <ThemeToggle />}</View></View></SafeAreaView></ThemedView>;
  }

  if (view === 'personal') return <PersonalData email={email} profile={profile} profileMessage={profileMessage} onSaved={setProfile} onBack={() => setView('home')} onPrivacyPress={() => router.push('/privacy-policy' as never)} />;

  const previousAccountView = () => {
    if (view === 'access') return setView('home');
    if (view === 'password' || view === 'email') return setView('access');
    if (view === 'code') return setView('email');
    if (view === 'register') return setView('access');
    if (view === 'register-code') return setView('register');
    if (view === 'register-password') return setView('register');
    if (view === 'recovery-email') return setView(loggedIn ? 'home' : 'password');
    if (view === 'recovery-password') return setView('recovery-email');
  };

  const headerTitle = view === 'register' || view === 'register-code' ? 'Criar conta' : view === 'register-password' ? 'Criar senha' : view === 'recovery-email' || view === 'recovery-password' ? 'Senha' : 'Acesse sua conta';
  return <ThemedView style={styles.container}><SafeAreaView style={[styles.safeArea, styles.authSafeArea, styles.accountSubscreenSafeArea]}><ScreenHeader title={headerTitle} onBack={previousAccountView} showSearch={false} showCart variant="checkout" /><ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={[styles.content, styles.accountSubscreenContent]}>
    {view === 'access' && <AccessView onPassword={() => setView('password')} onEmail={() => setView('email')} onGoogle={loginWithGoogle} onApple={loginWithApple} googleLoading={loginLoading} message={authMessage} onRegister={openRegister} />}
    {view === 'password' && <PasswordView email={email} setEmail={setEmail} password={password} setPassword={setPassword} onLogin={login} loading={loginLoading} message={authMessage} onBack={() => setView('access')} onForgot={() => { setAuthMessage(null); setView('recovery-email'); }} rememberAccess={rememberAccess} onRememberAccessChange={changeRememberAccess} rememberHelpVisible={rememberHelpVisible} onRememberHelp={() => setRememberHelpVisible(true)} onCloseRememberHelp={() => setRememberHelpVisible(false)} />}
    {view === 'email' && <EmailAccessView email={email} setEmail={setEmail} onSend={requestAccessCode} loading={accessCodeLoading} onRegister={openRegister} onPrivacy={() => router.push('/privacy-policy' as never)} message={authMessage} />}
    {view === 'code' && <CodeView email={email} code={accessCode} setCode={setAccessCode} sentAt={codeSentAt} onValidate={validateAccessCode} onResend={resendAccessCode} loading={codeLoading} resendLoading={accessCodeLoading} onBack={() => setView('email')} message={authMessage} />}
    {view === 'register' && <RegisterView email={email} setEmail={setEmail} newsletterOptIn={newsletterOptIn} setNewsletterOptIn={setNewsletterOptIn} onSend={sendRegistrationCode} loading={accessCodeLoading} message={authMessage} onPrivacy={() => router.push('/privacy-policy' as never)} />}
    {view === 'register-code' && <RegisterCodeView email={email} code={accessCode} setCode={setAccessCode} sentAt={codeSentAt} onValidate={validateAccessCode} onResend={resendAccessCode} loading={codeLoading} resendLoading={accessCodeLoading} message={authMessage} onBack={() => setView('register')} />}
    {view === 'register-password' && <PasswordSetupView mode="register" email={email} code={accessCode} setCode={setAccessCode} newPassword={newPassword} setNewPassword={setNewPassword} newPasswordConfirmation={newPasswordConfirmation} setNewPasswordConfirmation={setNewPasswordConfirmation} onSubmit={completePasswordSetup} loading={codeLoading} message={authMessage} onBack={() => setView('register')} />}
    {view === 'recovery-email' && <RecoveryEmailView email={email} setEmail={setEmail} onSend={sendRecoveryCode} loading={accessCodeLoading} message={authMessage} onBack={() => setView('password')} />}
    {view === 'recovery-password' && <PasswordSetupView mode="recovery" email={email} code={accessCode} setCode={setAccessCode} newPassword={newPassword} setNewPassword={setNewPassword} newPasswordConfirmation={newPasswordConfirmation} setNewPasswordConfirmation={setNewPasswordConfirmation} onSubmit={completePasswordSetup} loading={codeLoading} message={authMessage} onBack={() => setView('recovery-email')} />}
  </ScrollView></SafeAreaView></ThemedView>;
}

function GuestAccount({ onEnter, onRegister, onCoupons, onReturns, onPrivacy, onHelp, notifications, onNotificationsChange, notificationsLoading, notificationsMessage }: { onEnter: () => void; onRegister: () => void; onCoupons: () => void; onReturns: () => void; onPrivacy: () => void; onHelp: () => void; notifications: boolean; onNotificationsChange: (value: boolean) => void; notificationsLoading: boolean; notificationsMessage: string | null }) {
  const { colorScheme } = useAppTheme();
  const theme = useTheme();
  const dark = colorScheme === 'dark';
  return <><ThemedText style={styles.greeting}>Para uma melhor experiência, entre ou cadastre-se</ThemedText><Pressable onPress={onEnter} style={[styles.primaryButton, dark && { backgroundColor: theme.surface }]}><ThemedText style={[styles.primaryText, dark && { color: theme.text }]}>Entrar</ThemedText></Pressable><UtilityGrid onRegister={onRegister} onCoupons={onCoupons} onReturns={onReturns} onPrivacy={onPrivacy} /><Preference value={notifications} onChange={onNotificationsChange} disabled={notificationsLoading} message={notificationsMessage} /><ThemedText type="subtitle" style={styles.helpTitle}>Ficou com alguma dúvida?</ThemedText><Pressable accessibilityRole="button" accessibilityLabel="Abrir Central de Ajuda no WhatsApp" onPress={onHelp} style={[styles.helpButton, dark && { borderColor: theme.borderStrong }]}><ThemedText type="smallBold">Central de Ajuda</ThemedText></Pressable><ThemedText style={styles.powered}>Powered by WML</ThemedText></>;
}

type AccountTileData = { label: string; icon: ReactNode; onPress?: () => void };

function AccountTile({ label, icon, onPress }: AccountTileData) {
  const theme = useTheme();
  return <Pressable onPress={onPress} style={[styles.tile, styles.accountTile, { backgroundColor: theme.surface }]}>
    <View style={styles.tileHeader}>
      <View style={styles.tileIcon}>{icon}</View>
      <ChevronRightIcon color={theme.text} size={14} />
    </View>
    <ThemedText numberOfLines={2} style={[styles.tileLabel, { color: theme.text }]}>{label}</ThemedText>
  </Pressable>;
}

function LoggedAccount({ email, notifications, setNotifications, onLogout, onPersonal, onOrders, onFavorites }: { email: string; notifications: boolean; setNotifications: (value: boolean) => void; onLogout: () => void; onPersonal: () => void; onOrders: () => void; onFavorites: () => void }) {
  return <LoggedAccountV2 email={email} notifications={notifications} onNotificationsChange={setNotifications} notificationsLoading={false} notificationsMessage={null} onLogout={onLogout} logoutLoading={false} onPersonal={onPersonal} onOrders={onOrders} onFavorites={onFavorites} onPasswordReset={() => undefined} />;
}

function UtilityGrid({ onRegister, onCoupons, onReturns, onPrivacy }: { onRegister: () => void; onCoupons: () => void; onReturns: () => void; onPrivacy: () => void }) {
  const theme = useTheme();
  const tiles: AccountTileData[] = [
    { label: 'Cupons de desconto', icon: <HomeUtilityDiscountIcon color={theme.text} size={16} />, onPress: onCoupons },
    { label: 'Trocas e devoluções', icon: <HomeUtilityReturnsIcon color={theme.text} size={18} />, onPress: onReturns },
    { label: 'Política de privacidade', icon: <HomeUtilityPrivacyIcon color={theme.text} size={18} />, onPress: onPrivacy },
    { label: 'Nossas lojas', icon: <HomeUtilityStoresIcon color={theme.text} size={18} />, onPress: onRegister },
  ];
  return <View style={styles.tileGrid}>{tiles.map((tile) => <AccountTile key={tile.label} {...tile} />)}</View>;
}
function Preference({ value = false, onChange, disabled = false, message }: { value?: boolean; onChange?: (value: boolean) => void; disabled?: boolean; message?: string | null }) {
  const theme = useTheme();
  return <View style={styles.preferenceBlock}>
    <View style={styles.preference}>
      <View style={styles.preferenceLabel}>
        <HomeNotificationsIcon color={theme.text} size={18} />
        <ThemedText style={[styles.preferenceText, { color: theme.text }]}>Notificações</ThemedText>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        onPress={() => onChange?.(!value)}
        style={[styles.notificationSwitch, value ? [styles.notificationSwitchOn, { backgroundColor: theme.primary }] : [styles.notificationSwitchOff, { backgroundColor: theme.border }], disabled && styles.disabled]}
      >
        <View style={styles.notificationThumb} />
      </Pressable>
    </View>
    {!!message && <ThemedText style={styles.notificationMessage}>{message}</ThemedText>}
  </View>;
}
function AccessView({ onPassword, onEmail, onGoogle, onApple, googleLoading, message, onRegister }: { onPassword: () => void; onEmail: () => void; onGoogle: () => void; onApple: () => void; googleLoading: boolean; message: string | null; onRegister: () => void }) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle" style={styles.authTitle}>Acesse sua conta</ThemedText>
      <ThemedText style={styles.authText}>Entre de forma rápida e segura usando uma das opções abaixo</ThemedText>
      <View style={styles.divider} />
      <Pressable onPress={onEmail} style={styles.outlineButton}>
        <ThemedText type="smallBold">Receber código de acesso por e-mail</ThemedText>
      </Pressable>
      {!!message && <ThemedText style={styles.errorMessage}>{message}</ThemedText>}
      <Pressable onPress={onPassword} style={styles.outlineButton}>
        <ThemedText type="smallBold">Entrar com e-mail e senha</ThemedText>
      </Pressable>
      {SHOW_GOOGLE_LOGIN && (
        <Pressable disabled={googleLoading} onPress={onGoogle} style={[styles.outlineButton, styles.googleButton, googleLoading && styles.disabled]}>
          <GoogleGIcon size={18} />
          {googleLoading ? <ActivityIndicator size="small" color="#0a0a0a" /> : <ThemedText type="smallBold">Entrar com Google</ThemedText>}
        </Pressable>
      )}
      {SHOW_APPLE_LOGIN && (
        <Pressable onPress={onApple} style={[styles.outlineButton, styles.googleButton]}>
          <AppleLogoIcon size={22} />
          <ThemedText type="smallBold">Entrar com Apple</ThemedText>
        </Pressable>
      )}
      <View style={styles.divider} />
      <ThemedText style={styles.centerText}>Ainda não possui uma conta?</ThemedText>
      <Pressable onPress={onRegister} style={styles.outlineButton}>
        <ThemedText type="smallBold">Crie sua conta</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
function PasswordView({ email, setEmail, password, setPassword, onLogin, loading, message, onBack, onForgot, rememberAccess, onRememberAccessChange, rememberHelpVisible, onRememberHelp, onCloseRememberHelp }: { email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; onLogin: () => void; loading: boolean; message: string | null; onBack: () => void; onForgot: () => void; rememberAccess: boolean; onRememberAccessChange: (value: boolean) => void; rememberHelpVisible: boolean; onRememberHelp: () => void; onCloseRememberHelp: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  return (
    <>
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle" style={styles.authTitle}>Entrar com e-mail e senha</ThemedText>
        <ThemedText type="subtitle" style={styles.authSubtitle}>Insira seu e-mail e senha abaixo</ThemedText>
        <TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
        <View style={styles.passwordInputWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Digite sua senha"
            secureTextEntry={!showPassword}
            style={[styles.input, styles.passwordInput]}
          />
          <Pressable
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setShowPassword((current) => !current)}
            style={styles.passwordToggle}>
            <EyeIcon color="#5d5955" size={20} off={!showPassword} />
          </Pressable>
        </View>
        <Pressable disabled={loading} onPress={onForgot} style={styles.forgotButton}><ThemedText type="smallBold" style={styles.linkText}>Esqueceu a senha?</ThemedText></Pressable>
        <View style={styles.rememberAccessRow}>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="Lembrar meu acesso"
            accessibilityState={{ checked: rememberAccess, disabled: loading }}
            disabled={loading}
            onPress={() => onRememberAccessChange(!rememberAccess)}
            style={[styles.rememberSwitch, rememberAccess ? styles.rememberSwitchOn : styles.rememberSwitchOff]}>
            <View style={styles.rememberSwitchThumb} />
          </Pressable>
          <ThemedText themeColor="textSecondary" style={styles.rememberAccessText}>Lembrar meu acesso</ThemedText>
          <Pressable accessibilityLabel="Como funciona lembrar meu acesso" accessibilityRole="button" onPress={onRememberHelp} style={styles.rememberHelpButton}>
            <ThemedText themeColor="textSecondary" style={styles.rememberHelpIcon}>?</ThemedText>
          </Pressable>
        </View>
        {!!message && <ThemedText style={styles.linkTextAlert}>{message}</ThemedText>}
        <Pressable disabled={loading} onPress={onLogin} style={[styles.primaryButton, loading && styles.disabled]}>{loading ? <ActivityIndicator size="small" color="#0a0a0a" /> : <ThemedText style={styles.primaryText}>Entrar</ThemedText>}</Pressable>
        <Pressable onPress={onBack} style={styles.textButton}><ThemedText>Voltar</ThemedText></Pressable>
      </ThemedView>

      <Modal visible={rememberHelpVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCloseRememberHelp}>
        <ThemedView style={styles.rememberHelpScreen}>
          <SafeAreaView style={styles.rememberHelpSafeArea}>
            <View style={styles.rememberHelpHeader}>
              <View style={styles.rememberHelpHeaderSpacer} />
              <Pressable accessibilityLabel="Fechar explicação sobre lembrar meu acesso" onPress={onCloseRememberHelp} style={styles.rememberHelpClose}>
                <CloseIcon color={theme.textSecondary} size={22} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.rememberHelpContent}>
              <ThemedText style={styles.rememberHelpTitle}>Como funciona:</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.rememberHelpBody}>
                “Lembrar meu acesso” memoriza apenas seu e-mail. Ao habilitar, o e-mail será preenchido quando você voltar à tela de login, mas a senha deverá ser digitada novamente.
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.rememberHelpBody}>
                A senha nunca é armazenada pelo aplicativo. Ainda assim, habilite essa opção apenas em dispositivos aos quais você tem acesso.
              </ThemedText>
              <ThemedText style={styles.rememberHelpTitle}>Como desabilitar:</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.rememberHelpBody}>
                Basta tocar em “Lembrar meu acesso” na tela de login para desativar. O e-mail salvo será removido, e você precisará digitar seu e-mail e sua senha novamente.
              </ThemedText>
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </>
  );
}
function EmailAccessView({ email, setEmail, onSend, loading, onRegister, onPrivacy, message }: { email: string; setEmail: (value: string) => void; onSend: () => void; loading: boolean; onRegister: () => void; onPrivacy: () => void; message: string | null }) {
  return <ThemedView style={styles.card}><ThemedText type="subtitle" style={styles.authTitle}>Acesse sua conta</ThemedText><ThemedText style={styles.authSubtitleDesc}>Informe seu e-mail para acessar ou registrar seus dados com segurança</ThemedText><TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} /><Pressable disabled={loading} onPress={onSend} style={[styles.primaryButton, loading && styles.disabled]}>{loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Insira seu e-mail</ThemedText>}</Pressable>{!!message && <ThemedText style={styles.errorMessage}>{message}</ThemedText>}<ThemedText style={styles.authSubtitleDesc}>Ao se cadastrar, você concorda com nossa <Text onPress={onPrivacy} style={styles.privacyLink}>Política de Privacidade.</Text></ThemedText><Pressable disabled={loading} onPress={onRegister}><ThemedText type="link" style={styles.privacyCreateLink}>Criar uma conta</ThemedText></Pressable></ThemedView>;
}
function CodeView({ email, code, setCode, sentAt, onValidate, onResend, loading, resendLoading, onBack, message }: { email: string; code: string; setCode: (value: string) => void; sentAt: number | null; onValidate: () => void; onResend: () => void; loading: boolean; resendLoading: boolean; onBack: () => void; message: string | null }) {
  return <CodeAccessView title="Acesse sua conta" email={email} code={code} setCode={setCode} sentAt={sentAt} onValidate={onValidate} onResend={onResend} loading={loading} resendLoading={resendLoading} onBack={onBack} message={message} />;
}

function RegisterCodeView({ email, code, setCode, sentAt, onValidate, onResend, loading, resendLoading, onBack, message }: { email: string; code: string; setCode: (value: string) => void; sentAt: number | null; onValidate: () => void; onResend: () => void; loading: boolean; resendLoading: boolean; onBack: () => void; message: string | null }) {
  return <CodeAccessView title="Acessar com o seu e-mail" email={email} code={code} setCode={setCode} sentAt={sentAt} showEmailInput onValidate={onValidate} onResend={onResend} loading={loading} resendLoading={resendLoading} onBack={onBack} message={message} />;
}

function CodeAccessView({ title, email, code, setCode, sentAt, showEmailInput = false, onValidate, onResend, loading, resendLoading, onBack, message }: { title: string; email: string; code: string; setCode: (value: string) => void; sentAt: number | null; showEmailInput?: boolean; onValidate: () => void; onResend: () => void; loading: boolean; resendLoading: boolean; onBack: () => void; message: string | null }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const hasCode = Boolean(code.trim());
  const resendDisabled = secondsLeft > 0 || loading || resendLoading;

  useEffect(() => {
    if (!sentAt) {
      setSecondsLeft(0);
      return;
    }
    const updateRemaining = () => setSecondsLeft(Math.max(0, 60 - Math.floor((Date.now() - sentAt) / 1000)));
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  return <ThemedView style={styles.card}>
    <ThemedText type="subtitle" style={styles.authTitle}>{title}</ThemedText>
    {showEmailInput ? <TextInput value={email} editable={false} style={[styles.input, styles.readonly]} /> : <ThemedText themeColor="textSecondary">Enviamos um código para o e-mail {email}.</ThemedText>}
    <ThemedText themeColor="textSecondary">Código de verificação</ThemedText>
    <TextInput value={code} onChangeText={setCode} placeholder="Código de verificação" keyboardType="number-pad" style={styles.input} />
    {!!message && <ThemedText style={styles.errorMessage}>{message}</ThemedText>}
    <Pressable disabled={!hasCode || loading || resendLoading} onPress={onValidate} style={[styles.primaryButton, (!hasCode || loading || resendLoading) && styles.disabled]}>
      {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Login</ThemedText>}
    </Pressable>
    <Pressable disabled={resendDisabled} onPress={() => { void onResend(); }} style={[styles.resendButton, resendDisabled && styles.disabled]}>
      {resendLoading ? <ActivityIndicator size="small" color="#5d5955" /> : <ThemedText style={styles.resendText}>{secondsLeft > 0 ? `Reenviar código (${secondsLeft})` : 'Reenviar código'}</ThemedText>}
    </Pressable>
    <Pressable disabled={loading || resendLoading} onPress={onBack} style={styles.outlineButton}><ThemedText type="smallBold">Voltar</ThemedText></Pressable>
  </ThemedView>;
}

function RegisterView({ email, setEmail, newsletterOptIn, setNewsletterOptIn, onSend, loading, message, onPrivacy }: { email: string; setEmail: (value: string) => void; newsletterOptIn: boolean; setNewsletterOptIn: (value: boolean) => void; onSend: () => void; loading: boolean; message: string | null; onPrivacy: () => void }) {
  const canSubmit = isValidEmail(email);
  return <ThemedView style={[styles.card, styles.registerCard]}>
    <ThemedText style={styles.registerTitle}>Criar conta</ThemedText>
    <ThemedText style={styles.registerSubtitle}>Informe seu e-mail para começar</ThemedText>
    <TextInput value={email} onChangeText={setEmail} placeholder="Digite seu e-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={[styles.input, styles.registerInput]} />
    <NewsletterOptIn value={newsletterOptIn} onChange={setNewsletterOptIn} onPrivacyPress={onPrivacy} />
    {!!message && <ThemedText style={styles.registerMessage}>{message}</ThemedText>}
    <Pressable disabled={!canSubmit || loading} onPress={onSend} style={[styles.primaryButton, styles.registerButton, (!canSubmit || loading) && styles.disabled]}>
      {loading ? <ActivityIndicator size="small" color="#9e9991" /> : <ThemedText style={[styles.registerButtonText, (!canSubmit || loading) && styles.registerButtonTextDisabled]}>Enviar código</ThemedText>}
    </Pressable>
  </ThemedView>;
}

function RecoveryEmailView({ email, setEmail, onSend, loading, message, onBack }: { email: string; setEmail: (value: string) => void; onSend: () => void; loading: boolean; message: string | null; onBack: () => void }) {
  return <ThemedView style={styles.card}>
    <ThemedText type="subtitle" style={styles.authTitle}>Esqueceu sua senha?</ThemedText>
    <ThemedText style={styles.authSubtitle}>Confirme seus dados que vamos ajudar a redefinir a senha.</ThemedText>
    <TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
    {!!message && <ThemedText style={styles.errorMessage}>{message}</ThemedText>}
    <Pressable disabled={loading} onPress={onSend} style={[styles.primaryButton, loading && styles.disabled]}>
      {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Enviar código</ThemedText>}
    </Pressable>
		<ThemedText style={styles.authTextTip}><ThemedText style={styles.authTextTipBold}>Dica: </ThemedText>Alterar sua senha com frequência aumenta a sua segurança!</ThemedText>
    <Pressable onPress={onBack} style={styles.outlineButtonNone}><ThemedText type="smallBold">Voltar</ThemedText></Pressable>
  </ThemedView>;
}

function PasswordRules({ value }: { value: string }) {
  const rules = getPasswordRules(value);
  return <View style={styles.passwordRules}>
    <ThemedText style={[styles.passwordRule, rules.uppercase ? styles.passwordRuleValid : styles.passwordRuleInvalid]}>ABC&nbsp;&nbsp;&nbsp;1 letra maiúscula</ThemedText>
    <ThemedText style={[styles.passwordRule, rules.lowercase ? styles.passwordRuleValid : styles.passwordRuleInvalid]}>abc&nbsp;&nbsp;&nbsp;1 letra minúscula</ThemedText>
    <ThemedText style={[styles.passwordRule, rules.number ? styles.passwordRuleValid : styles.passwordRuleInvalid]}>123&nbsp;&nbsp;&nbsp;1 número</ThemedText>
    <ThemedText style={[styles.passwordRule, rules.length ? styles.passwordRuleValid : styles.passwordRuleInvalid]}>***&nbsp;&nbsp;&nbsp;No mínimo 8 caracteres</ThemedText>
  </View>;
}

function PasswordSetupView({ mode, email, code, setCode, newPassword, setNewPassword, newPasswordConfirmation, setNewPasswordConfirmation, onSubmit, loading, message, onBack }: { mode: 'register' | 'recovery'; email: string; code: string; setCode: (value: string) => void; newPassword: string; setNewPassword: (value: string) => void; newPasswordConfirmation: string; setNewPasswordConfirmation: (value: string) => void; onSubmit: () => void; loading: boolean; message: string | null; onBack: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const title = mode === 'register' ? 'Validar e-mail e criar nova senha' : 'Validar e alterar senha';
  const submitLabel = mode === 'register' ? 'Criar conta' : 'Alterar senha';
  return <ThemedView style={styles.card}>
    <ThemedText type="subtitle" style={styles.authTitle}>{title}</ThemedText>
    <ThemedText themeColor="textSecondary">Insira o código que enviamos para o e-mail {email} e crie uma nova senha.</ThemedText>
    <TextInput value={code} onChangeText={setCode} placeholder="Código enviado por e-mail" keyboardType="number-pad" style={styles.input} />
    <View style={styles.passwordInputWrap}>
      <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="Nova senha" secureTextEntry={!showPassword} autoCapitalize="none" style={[styles.input, styles.passwordInput]} />
      <Pressable accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'} accessibilityRole="button" hitSlop={8} onPress={() => setShowPassword((current) => !current)} style={styles.passwordToggle}><EyeIcon color="#5d5955" size={20} off={!showPassword} /></Pressable>
    </View>
    <View style={styles.passwordInputWrap}>
      <TextInput value={newPasswordConfirmation} onChangeText={setNewPasswordConfirmation} placeholder="Confirme a nova senha" secureTextEntry={!showConfirmation} autoCapitalize="none" style={[styles.input, styles.passwordInput]} />
      <Pressable accessibilityLabel={showConfirmation ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'} accessibilityRole="button" hitSlop={8} onPress={() => setShowConfirmation((current) => !current)} style={styles.passwordToggle}><EyeIcon color="#5d5955" size={20} off={!showConfirmation} /></Pressable>
    </View>
    <PasswordRules value={newPassword} />
    {!!message && <ThemedText style={styles.errorMessage}>{message}</ThemedText>}
    <View style={styles.authFooter}>
      <Pressable disabled={loading} onPress={onBack} style={[styles.outlineButton, styles.authFooterButton]}><ThemedText type="smallBold">Voltar</ThemedText></Pressable>
      <Pressable disabled={loading} onPress={onSubmit} style={[styles.primaryButton, styles.authFooterButton, loading && styles.disabled]}>{loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>{submitLabel}</ThemedText>}</Pressable>
    </View>
  </ThemedView>;
}
const logoutButtonStyles = StyleSheet.create({
  content: { width: '100%', padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: Spacing.two },
  label: { color: '#0a0a0a', fontWeight: '600' },
});

function LoggedAccountV2({ email, notifications, onNotificationsChange, notificationsLoading, notificationsMessage, onLogout, logoutLoading, onPersonal, onOrders, onFavorites, onPasswordReset, onCoupons, onReturns, onPrivacy, onHelp }: { email: string; notifications: boolean; onNotificationsChange: (value: boolean) => void; notificationsLoading: boolean; notificationsMessage: string | null; onLogout: () => void; logoutLoading: boolean; onPersonal: () => void; onOrders: () => void; onFavorites: () => void; onPasswordReset: () => void; onCoupons?: () => void; onReturns?: () => void; onPrivacy?: () => void; onHelp?: () => void }) {
  const theme = useTheme();
  const tiles: AccountTileData[] = [
    { label: 'Meus pedidos', icon: <Box01Icon color={theme.text} size={18} />, onPress: onOrders },
    { label: 'Dados pessoais', icon: <UserIcon color={theme.text} size={18} />, onPress: onPersonal },
    { label: 'Favoritos', icon: <HeartIcon color={theme.text} size={20} />, onPress: onFavorites },
    { label: 'Trocas e devoluções', icon: <HomeUtilityReturnsIcon color={theme.text} size={16} />, onPress: onReturns },
    { label: 'Redefinição de senha', icon: <LockIcon color={theme.text} size={18} />, onPress: onPasswordReset },
    { label: 'Cupons de desconto', icon: <HomeUtilityDiscountIcon color={theme.text} size={18} />, onPress: onCoupons },
    { label: 'Nossas lojas', icon: <HomeUtilityStoresIcon color={theme.text} size={18} /> },
    { label: 'Política de privacidade', icon: <HomeUtilityPrivacyIcon color={theme.text} size={18} />, onPress: onPrivacy },
  ];
  return <><ThemedText style={styles.loggedGreeting}>Olá,</ThemedText><ThemedText style={styles.email}>{email}</ThemedText><View style={styles.tileGrid}>{tiles.map((tile) => <AccountTile key={tile.label} {...tile} />)}</View><Preference value={notifications} onChange={onNotificationsChange} disabled={notificationsLoading} message={notificationsMessage} /><View style={styles.logoutDivider} /><Pressable disabled={logoutLoading} onPress={onLogout} style={[styles.logout, { borderColor: theme.border }, logoutLoading && styles.disabled]}><View style={logoutButtonStyles.content}>{logoutLoading ? <ActivityIndicator size="small" color={theme.text} /> : <><LogoutIcon color={theme.text} size={16} /><ThemedText style={[logoutButtonStyles.label, { color: theme.text }]}>Sair</ThemedText></>}</View></Pressable><View style={styles.logoutDivider} /><ThemedText type="subtitle" style={styles.helpTitle}>Ficou com alguma dúvida?</ThemedText><Pressable accessibilityRole="button" accessibilityLabel="Abrir Central de Ajuda no WhatsApp" onPress={onHelp} style={[styles.helpButton, { borderColor: theme.borderStrong }]}><ThemedText type="smallBold">Central de Ajuda</ThemedText></Pressable><ThemedText style={styles.powered}>Powered by WML</ThemedText></>;
}

function PersonalData({ email, profile, profileMessage, onSaved, onBack, onPrivacyPress }: { email: string; profile: CustomerProfile; profileMessage: string | null; onSaved: (profile: CustomerProfile) => void; onBack: () => void; onPrivacyPress: () => void }) {
  const { colorScheme } = useAppTheme();
  const theme = useTheme();
  const dark = colorScheme === 'dark';
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  const [document, setDocument] = useState(profile.document ?? '');
  const [phone, setPhone] = useState(formatPhoneWithoutCountryCode(profile.phone ?? profile.homePhone ?? ''));
  const [birthDate, setBirthDate] = useState(formatBirthDate(profile.birthDate ?? ''));
  const [gender, setGender] = useState(profile.gender ?? '');
  const [newsletterOptIn, setNewsletterOptIn] = useState(profile.isNewsletterOptIn ?? true);
  const [newsletterSaving, setNewsletterSaving] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const genders = ['Feminino', 'Masculino', 'Prefiro não informar', 'Outro'];

  useEffect(() => {
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setDocument(profile.document ?? '');
    setPhone(formatPhoneWithoutCountryCode(profile.phone ?? profile.homePhone ?? ''));
    setBirthDate(formatBirthDate(profile.birthDate ?? ''));
    setGender(profile.gender ?? '');
    setNewsletterOptIn(profile.isNewsletterOptIn ?? true);
  }, [profile]);

  useEffect(() => {
    if (!saveSuccessVisible) return;
    const timeout = setTimeout(() => setSaveSuccessVisible(false), 2600);
    return () => clearTimeout(timeout);
  }, [saveSuccessVisible]);

  async function save() {
    try {
      setSaving(true); setMessage(null); setSaveSuccessVisible(false);
      const normalizedBirthDate = birthDateToApi(birthDate);
      const updated = await updateCustomerProfile(email, { email, firstName, lastName, document, phone: phoneToApi(phone), gender, ...(normalizedBirthDate ? { birthDate: normalizedBirthDate } : {}), isNewsletterOptIn: newsletterOptIn });
      onSaved(updated);
      setEditing(false);
      setSaveSuccessVisible(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar os dados.'); }
    finally { setSaving(false); }
  }

  async function changeNewsletterOptIn(value: boolean) {
    const previous = newsletterOptIn;
    setNewsletterOptIn(value);
    setNewsletterSaving(true);
    setMessage(null);
    try {
      const updated = await updateCustomerProfile(email, { email, isNewsletterOptIn: value });
      onSaved(updated);
    } catch (error) {
      setNewsletterOptIn(previous);
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar a preferência de novidades.');
    } finally {
      setNewsletterSaving(false);
    }
  }

  const fields = [{ label: 'Nome', value: firstName, set: setFirstName }, { label: 'Sobrenome', value: lastName, set: setLastName }, { label: 'CPF', value: document, set: setDocument }, { label: 'Data de nascimento', value: birthDate, set: (value: string) => setBirthDate(formatBirthDateInput(value)) }, { label: 'Telefone com DDD', value: phone, displayValue: formatPhoneWithoutCountryCode(phone), set: (value: string) => setPhone(formatPhoneInput(value)) }];
  const feedbackMessage = message || profileMessage;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={[styles.safeArea, styles.subscreenSafeArea, styles.accountSubscreenSafeArea]}>
        <ScreenHeader title="Dados Pessoais" onBack={onBack} showSearch={false} variant="checkout" />
        <ScrollView contentContainerStyle={[styles.content, styles.personalDataContent, styles.accountSubscreenContent]}>
          <ThemedView style={[styles.card, styles.personalDataCard, dark && { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText style={[styles.personalDataTitle, { color: theme.text }]}>Dados Pessoais</ThemedText>
            <View style={styles.personalDataFields}>
              <View style={styles.personalDataField}>
                <ThemedText style={styles.personalDataLabel}>E-mail</ThemedText>
                {editing ? (
                  <TextInput value={email} editable={false} style={[styles.personalDataInput, styles.personalDataReadonlyInput, dark && { backgroundColor: theme.surfaceMuted, color: theme.textSecondary }]} />
                ) : (
                  <ThemedText style={styles.personalDataValue}>{email || 'Não informado'}</ThemedText>
                )}
              </View>

              {fields.map((field) => (
                <View key={field.label} style={styles.personalDataField}>
                  <ThemedText style={styles.personalDataLabel}>{field.label}</ThemedText>
                  {editing ? (
                    <TextInput
                      value={field.label === 'Telefone com DDD' ? formatPhoneWithoutCountryCode(field.value) : field.value}
                      onChangeText={field.set}
                      style={[styles.personalDataInput, dark && { backgroundColor: theme.inputBackground, color: theme.text }]}
                    />
                  ) : (
                    <ThemedText style={styles.personalDataValue}>{(field.displayValue ?? field.value) || 'Não informado'}</ThemedText>
                  )}
                </View>
              ))}

              <View style={styles.personalDataField}>
                <ThemedText style={styles.personalDataLabel}>Gênero (opcional)</ThemedText>
                {editing ? (
                  <>
                    <Pressable onPress={() => setGenderOpen(!genderOpen)} style={[styles.personalDataSelect, dark && { backgroundColor: theme.inputBackground }]}>
                      <ThemedText style={styles.personalDataSelectText}>{formatGenderLabel(gender) || 'Selecione'}</ThemedText>
                      <View style={[styles.genderDropdownIcon, genderOpen && styles.genderDropdownIconOpen]}>
                        <ChevronRightIcon color={dark ? theme.textSecondary : '#625d57'} size={16} />
                      </View>
                    </Pressable>
                    {genderOpen && <View style={[styles.personalDataDropdown, dark && { backgroundColor: theme.backgroundElement }]}>{genders.map((option) => <Pressable key={option} onPress={() => { setGender(option); setGenderOpen(false); }} style={styles.personalDataOption}><ThemedText style={styles.personalDataSelectText}>{option}</ThemedText></Pressable>)}</View>}
                  </>
                ) : (
                  <ThemedText style={styles.personalDataValue}>{formatGenderLabel(gender) || 'Não informado'}</ThemedText>
                )}
              </View>
            </View>

            {editing && <NewsletterOptIn value={newsletterOptIn} onChange={changeNewsletterOptIn} onPrivacyPress={onPrivacyPress} disabled={newsletterSaving} />}

            {!!feedbackMessage && <ThemedText style={styles.personalDataFeedback}>{feedbackMessage}</ThemedText>}

            <View style={styles.personalDataEditSection}>
              {editing ? (
                <Pressable disabled={saving} onPress={save} style={[styles.primaryButton, styles.personalDataConfirmButton, dark && { backgroundColor: theme.primary }, saving && styles.disabled]}>
                  {saving ? <ActivityIndicator size="small" color={dark ? theme.onPrimary : '#ffffff'} /> : <ThemedText style={[styles.primaryText, dark && { color: theme.onPrimary }]}>Confirmar</ThemedText>}
                </Pressable>
              ) : (
                <Pressable onPress={() => setEditing(true)}>
                  <ThemedText style={styles.personalDataEditLink}>Editar dados pessoais</ThemedText>
                </Pressable>
              )}
            </View>
          </ThemedView>
        </ScrollView>
        {saveSuccessVisible && <View accessibilityLiveRegion="polite" pointerEvents="none" style={styles.saveSuccessOverlay}>
          <View style={styles.saveSuccessToast}>
            <ThemedText style={styles.saveSuccessText}>Salvo com sucesso!</ThemedText>
          </View>
        </View>}
      </SafeAreaView>
    </ThemedView>
  );
}

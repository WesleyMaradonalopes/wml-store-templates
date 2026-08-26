import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { NewsletterOptIn } from '@/components/newsletter-opt-in';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { clearAccountSession, exchangeVtexGoogleAccessToken, getAccountSession, getGoogleEmailFromIdToken, getVtexGoogleClientId, loginVtexGoogle, loginVtexPassword, saveAccountSession, sendVtexAccessKey, setVtexPassword, startVtexAuthentication, validateVtexAccessKey } from '@/services/auth';
import { getOrderForm, type OrderForm } from '@/services/cart';
import { getCustomerProfileFromMasterData, updateCustomerProfile } from '@/services/customer';
import { birthDateToApi, formatBirthDate, formatBirthDateInput, formatGenderLabel, formatPhoneInput, formatPhoneWithoutCountryCode, phoneToApi } from '@/utils/customer-formatters';

import AppleLogoIcon from '@/components/icons/AppleLogoIcon';
import Box01Icon from '@/components/icons/Box01Icon';
import ChevronRightIcon from '@/components/icons/ChevronRightIcon';
import EyeIcon from '@/components/icons/EyeIcon';
import GoogleGIcon from '@/components/icons/GoogleGIcon';
import HeartIcon from '@/components/icons/HeartIcon';
import HomeNotificationsIcon from '@/components/icons/HomeNotificationsIcon';
import HomeUtilityDiscountIcon from '@/components/icons/HomeUtilityDiscountIcon';
import HomeUtilityPrivacyIcon from '@/components/icons/HomeUtilityPrivacyIcon';
import HomeUtilityReturnsIcon from '@/components/icons/HomeUtilityReturnsIcon';
import HomeUtilityStoresIcon from '@/components/icons/HomeUtilityStoresIcon';
import LockIcon from '@/components/icons/LockIcon';
import UserIcon from '@/components/icons/UserIcon';

type AccountView = 'home' | 'access' | 'password' | 'email' | 'code' | 'register' | 'register-password' | 'recovery-email' | 'recovery-password' | 'personal';
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

const userEmail = 'wesley.lopes@grupohope.com.br';
const googleClientIdPlaceholder = 'not-configured.apps.googleusercontent.com';
const googleRedirectUri = makeRedirectUri({ scheme: 'lojahr', path: 'oauthredirect' });

WebBrowser.maybeCompleteAuthSession();

export default function AccountScreen() {
  const router = useRouter();
  const { view: requestedView } = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<AccountView>(requestedView === 'access' ? 'access' : 'home');
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState(userEmail);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [authToken, setAuthToken] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [accessCodeLoading, setAccessCodeLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const configuredGoogleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
  const configuredGoogleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
  const configuredGoogleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
  const [googleWebClientId, setGoogleWebClientId] = useState(configuredGoogleWebClientId || googleClientIdPlaceholder);
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

  useEffect(() => {
    if (configuredGoogleWebClientId || Platform.OS !== 'web') return;
    let active = true;
    getVtexGoogleClientId().then((clientId) => {
      if (!active) return;
      setGoogleWebClientId(clientId);
    }).catch(() => {
      if (!active) return;
      setGoogleConfigMessage('Não foi possível carregar a configuração do Google da VTEX.');
    });
    return () => { active = false; };
  }, [configuredGoogleWebClientId]);

  useEffect(() => {
    if (requestedView === 'access') setView('access');
  }, [requestedView]);

  useEffect(() => {
    getAccountSession().then((session) => {
      if (session) {
        setEmail(session.email); setLoggedIn(true);
        getCustomerProfileFromMasterData(session.email).then((customer) => {
          if (!customer) return;
          setProfile(customer);
          if (customer.email) setEmail(customer.email);
        }).catch((error) => setProfileMessage(error instanceof Error ? error.message : 'Não foi possível carregar o perfil VTEX.'));
        getOrderForm().then((orderForm) => {
          if (orderForm.clientProfileData) {
            setProfile((current) => mergeOrderFormProfile(current, orderForm.clientProfileData!));
            if (orderForm.clientProfileData.email) setEmail(orderForm.clientProfileData.email);
          }
        }).catch(() => undefined);
      }
    });
  }, [loggedIn]);

  async function login() {
    if (!email.trim() || !password.trim()) {
      setAuthMessage('Informe seu e-mail e sua senha.');
      return;
    }
    try {
      setAuthMessage(null);
      setLoginLoading(true);
      await loginVtexPassword(email.trim(), password);
      await saveAccountSession(email.trim());
      setLoggedIn(true);
      setView('home');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    setLogoutLoading(true);
    try {
      await clearAccountSession();
      setLoggedIn(false);
      setPassword('');
      setView('home');
    } finally {
      setLogoutLoading(false);
    }
  }

  async function requestAccessCode() {
    try {
      setAuthMessage(null);
      setAccessCodeLoading(true);
      const token = await startVtexAuthentication();
      await sendVtexAccessKey(email.trim(), token);
      setAuthToken(token);
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
    if (!accepted) {
      setAuthMessage('Aceite os termos de serviço para continuar.');
      return;
    }
    try {
      setAuthMessage(null);
      setAccessCodeLoading(true);
      // Garante que o cliente também exista no Shopper/Master Data antes de
      // concluir o cadastro da senha na VTEX.
      await updateCustomerProfile(normalizedEmail, { email: normalizedEmail, isNewsletterOptIn: true });
      const token = await startVtexAuthentication();
      await sendVtexAccessKey(normalizedEmail, token);
      setEmail(normalizedEmail);
      setAuthToken(token);
      setAccessCode('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setView('register-password');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível enviar o código.');
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
    if (!googleConfigured || !googleRequest) {
      const platformMessage = Platform.OS === 'ios'
        ? 'Configure o Client ID OAuth do iOS para este app.'
        : Platform.OS === 'android'
          ? 'Configure o Client ID OAuth do Android para este app.'
          : 'A configuração web do login Google ainda não está pronta.';
      setAuthMessage(googleConfigMessage || platformMessage);
      return;
    }
    try {
      setAuthMessage(null);
      setLoginLoading(true);
      const result = await promptGoogleAsync();
      if (result.type !== 'success') {
        if (result.type !== 'cancel' && result.type !== 'dismiss') setAuthMessage('Não foi possível abrir o login com Google.');
        return;
      }
      const credential = result.params.id_token || result.authentication?.idToken || '';
      const accessToken = result.authentication?.accessToken || result.params.access_token || '';
      if (!credential && !accessToken) throw new Error('O Google não retornou a credencial de acesso.');
      const data = accessToken ? await exchangeVtexGoogleAccessToken(accessToken) : await loginVtexGoogle(credential);
      const accountEmail = getGoogleEmailFromIdToken(credential) || (data.userId?.includes('@') ? data.userId.toLowerCase() : '');
      if (!accountEmail) throw new Error('Não foi possível identificar o e-mail da conta Google.');
      await saveAccountSession(accountEmail);
      setEmail(accountEmail);
      setLoggedIn(true);
      setView('home');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Não foi possível entrar com Google.');
    } finally {
      setLoginLoading(false);
    }
  }

  function loginWithApple() {
    setAuthMessage('O login com Apple será ativado após a configuração das credenciais da Apple.');
  }

  if (view === 'home') {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader back={false} showSearch={false} showCart={false} /><ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
      {loggedIn ? <LoggedAccountV2 email={email} notifications={notifications} setNotifications={setNotifications} onLogout={logout} logoutLoading={logoutLoading} onPersonal={() => setView('personal')} onOrders={() => router.push('/orders')} onFavorites={() => router.push('/favorites')} /> : <GuestAccount onEnter={() => setView('access')} onRegister={() => setView('register')} />}
    </ScrollView></SafeAreaView></ThemedView>;
  }

  if (view === 'personal') return <PersonalData email={email} profile={profile} profileMessage={profileMessage} onSaved={setProfile} onBack={() => setView('home')} onPrivacyPress={() => router.push('/privacy-policy' as never)} />;

  const previousAccountView = () => {
    if (view === 'access') return setView('home');
    if (view === 'password' || view === 'email') return setView('access');
    if (view === 'code') return setView('email');
    if (view === 'register') return setView('access');
    if (view === 'register-password') return setView('register');
    if (view === 'recovery-email') return setView('password');
    if (view === 'recovery-password') return setView('recovery-email');
  };

  const headerTitle = view === 'register' ? 'Registrar' : view === 'register-password' ? 'Criar senha' : view === 'recovery-email' || view === 'recovery-password' ? 'Alterar senha' : 'Acesse sua conta';
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title={headerTitle} onBack={previousAccountView} showSearch={false} showCart={false} /><ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
    {view === 'access' && <AccessView onPassword={() => setView('password')} onEmail={() => setView('email')} onGoogle={loginWithGoogle} onApple={loginWithApple} googleLoading={loginLoading} message={authMessage} onRegister={() => setView('register')} />}
    {view === 'password' && <PasswordView email={email} setEmail={setEmail} password={password} setPassword={setPassword} onLogin={login} loading={loginLoading} message={authMessage} onBack={() => setView('access')} onForgot={() => { setAuthMessage(null); setView('recovery-email'); }} />}
    {view === 'email' && <EmailAccessView email={email} setEmail={setEmail} onSend={requestAccessCode} loading={accessCodeLoading} onRegister={() => setView('register')} message={authMessage} />}
    {view === 'code' && <CodeView code={accessCode} setCode={setAccessCode} onValidate={validateAccessCode} loading={codeLoading} onBack={() => setView('email')} message={authMessage} />}
    {view === 'register' && <RegisterView email={email} setEmail={setEmail} accepted={accepted} setAccepted={setAccepted} onSend={sendRegistrationCode} loading={accessCodeLoading} message={authMessage} onBack={() => setView('access')} />}
    {view === 'register-password' && <PasswordSetupView mode="register" email={email} code={accessCode} setCode={setAccessCode} newPassword={newPassword} setNewPassword={setNewPassword} newPasswordConfirmation={newPasswordConfirmation} setNewPasswordConfirmation={setNewPasswordConfirmation} onSubmit={completePasswordSetup} loading={codeLoading} message={authMessage} onBack={() => setView('register')} />}
    {view === 'recovery-email' && <RecoveryEmailView email={email} setEmail={setEmail} onSend={sendRecoveryCode} loading={accessCodeLoading} message={authMessage} onBack={() => setView('password')} />}
    {view === 'recovery-password' && <PasswordSetupView mode="recovery" email={email} code={accessCode} setCode={setAccessCode} newPassword={newPassword} setNewPassword={setNewPassword} newPasswordConfirmation={newPasswordConfirmation} setNewPasswordConfirmation={setNewPasswordConfirmation} onSubmit={completePasswordSetup} loading={codeLoading} message={authMessage} onBack={() => setView('recovery-email')} />}
  </ScrollView></SafeAreaView></ThemedView>;
}

function GuestAccount({ onEnter, onRegister }: { onEnter: () => void; onRegister: () => void }) {
  return <><ThemedText style={styles.greeting}>Para uma melhor experiência, entre ou cadastre-se</ThemedText><Pressable onPress={onEnter} style={styles.primaryButton}><ThemedText style={styles.primaryText}>Entrar</ThemedText></Pressable><UtilityGrid onRegister={onRegister} /><Preference /><ThemedText type="subtitle" style={styles.helpTitle}>Ficou com alguma dúvida?</ThemedText><Pressable style={styles.helpButton}><ThemedText type="smallBold">Ajuda</ThemedText></Pressable><ThemedText style={styles.powered}>Powered by lojahr</ThemedText></>;
}

type AccountTileData = { label: string; icon: ReactNode; onPress?: () => void };

function AccountTile({ label, icon, onPress }: AccountTileData) {
  return <Pressable onPress={onPress} style={[styles.tile, styles.accountTile]}>
    <View style={styles.tileHeader}>
      <View style={styles.tileIcon}>{icon}</View>
      <ChevronRightIcon color="#0a0a0a" size={14} />
    </View>
    <ThemedText numberOfLines={2} style={styles.tileLabel}>{label}</ThemedText>
  </Pressable>;
}

function LoggedAccount({ email, notifications, setNotifications, onLogout, onPersonal, onOrders, onFavorites }: { email: string; notifications: boolean; setNotifications: (value: boolean) => void; onLogout: () => void; onPersonal: () => void; onOrders: () => void; onFavorites: () => void }) {
  return <LoggedAccountV2 email={email} notifications={notifications} setNotifications={setNotifications} onLogout={onLogout} logoutLoading={false} onPersonal={onPersonal} onOrders={onOrders} onFavorites={onFavorites} />;
}

function UtilityGrid({ onRegister }: { onRegister: () => void }) {
  const tiles: AccountTileData[] = [
    { label: 'Cupons de desconto', icon: <HomeUtilityDiscountIcon color="#313235" size={18} /> },
    { label: 'Trocas e devoluções', icon: <HomeUtilityReturnsIcon color="#313235" size={18} /> },
    { label: 'Política de privacidade', icon: <HomeUtilityPrivacyIcon color="#313235" size={18} /> },
    { label: 'Nossas lojas', icon: <HomeUtilityStoresIcon color="#313235" size={18} />, onPress: onRegister },
  ];
  return <View style={styles.tileGrid}>{tiles.map((tile) => <AccountTile key={tile.label} {...tile} />)}</View>;
}
function Preference({ value = true, onChange }: { value?: boolean; onChange?: (value: boolean) => void }) {
  return <View style={styles.preference}>
    <View style={styles.preferenceLabel}>
      <HomeNotificationsIcon color="#313235" size={18} />
      <ThemedText style={styles.preferenceText}>Notificações</ThemedText>
    </View>
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange?.(!value)}
      style={[styles.notificationSwitch, value ? styles.notificationSwitchOn : styles.notificationSwitchOff]}
    >
      <View style={styles.notificationThumb} />
    </Pressable>
  </View>;
}
function AccessView({ onPassword, onEmail, onGoogle, onApple, googleLoading, message, onRegister }: { onPassword: () => void; onEmail: () => void; onGoogle: () => void; onApple: () => void; googleLoading: boolean; message: string | null; onRegister: () => void }) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle" style={styles.authTitle}>Acesse sua conta</ThemedText>
      <ThemedText themeColor="textSecondary">Entre de forma rápida e segura usando uma das opções abaixo</ThemedText>
      <View style={styles.divider} />
      <Pressable onPress={onEmail} style={styles.outlineButton}>
        <ThemedText type="smallBold">Receber código de acesso por e-mail</ThemedText>
      </Pressable>
      {!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}
      <Pressable onPress={onPassword} style={styles.outlineButton}>
        <ThemedText type="smallBold">Entrar com e-mail e senha</ThemedText>
      </Pressable>
      <Pressable disabled={googleLoading} onPress={onGoogle} style={[styles.outlineButton, styles.googleButton, googleLoading && styles.disabled]}>
        <GoogleGIcon size={18} />
        {googleLoading ? <ActivityIndicator size="small" color="#0a0a0a" /> : <ThemedText type="smallBold">Entrar com Google</ThemedText>}
      </Pressable>
      <Pressable onPress={onApple} style={[styles.outlineButton, styles.googleButton]}>
        <AppleLogoIcon size={22} />
        <ThemedText type="smallBold">Entrar com Apple</ThemedText>
      </Pressable>
      <View style={styles.divider} />
      <ThemedText style={styles.centerText}>Ainda não possui uma conta?</ThemedText>
      <Pressable onPress={onRegister} style={styles.outlineButton}>
        <ThemedText type="smallBold">Crie sua conta</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
function PasswordView({ email, setEmail, password, setPassword, onLogin, loading, message, onBack, onForgot }: { email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; onLogin: () => void; loading: boolean; message: string | null; onBack: () => void; onForgot: () => void }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle" style={styles.authTitle}>Entrar com e-mail e senha</ThemedText>
      <ThemedText themeColor="textSecondary">Insira seu e-mail e senha abaixo</ThemedText>
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
      {!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}
      <Pressable disabled={loading} onPress={onLogin} style={[styles.primaryButton, loading && styles.disabled]}>{loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Entrar</ThemedText>}</Pressable>
      <Pressable onPress={onBack} style={styles.textButton}><ThemedText>Voltar</ThemedText></Pressable>
    </ThemedView>
  );
}
function EmailAccessView({ email, setEmail, onSend, loading, onRegister, message }: { email: string; setEmail: (value: string) => void; onSend: () => void; loading: boolean; onRegister: () => void; message: string | null }) { return <ThemedView style={styles.card}><ThemedText type="subtitle" style={styles.authTitle}>Acesse sua conta</ThemedText><ThemedText themeColor="textSecondary">Informe seu e-mail para acessar ou registrar seus dados com segurança</ThemedText><TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} /><Pressable disabled={loading} onPress={onSend} style={[styles.primaryButton, loading && styles.disabled]}>{loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Insira seu e-mail</ThemedText>}</Pressable>{!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}<ThemedText themeColor="textSecondary">Ao se cadastrar, você concorda com nossa Política de Privacidade.</ThemedText><Pressable disabled={loading} onPress={onRegister}><ThemedText type="link">Criar uma conta</ThemedText></Pressable></ThemedView>; }
function CodeView({ code, setCode, onValidate, loading, onBack, message }: { code: string; setCode: (value: string) => void; onValidate: () => void; loading: boolean; onBack: () => void; message: string | null }) { return <ThemedView style={styles.card}><ThemedText type="subtitle" style={styles.authTitle}>Digite o código de acesso</ThemedText><ThemedText themeColor="textSecondary">Enviamos um código para o seu e-mail.</ThemedText><TextInput value={code} onChangeText={setCode} placeholder="Código de acesso" keyboardType="number-pad" style={styles.input} /><Pressable disabled={loading} onPress={onValidate} style={[styles.primaryButton, loading && styles.disabled]}>{loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Confirmar código</ThemedText>}</Pressable>{!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}<Pressable disabled={loading} onPress={onBack} style={styles.textButton}><ThemedText>Voltar</ThemedText></Pressable></ThemedView>; }
function RegisterView({ email, setEmail, accepted, setAccepted, onSend, loading, message, onBack }: { email: string; setEmail: (value: string) => void; accepted: boolean; setAccepted: (value: boolean) => void; onSend: () => void; loading: boolean; message: string | null; onBack: () => void }) {
  return <ThemedView style={styles.card}>
    <ThemedText type="subtitle" style={styles.authTitle}>Acessar com o seu e-mail</ThemedText>
    <TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: accepted }}
      onPress={() => setAccepted(!accepted)}
      style={styles.checkRow}>
      <View style={[styles.checkbox, accepted && styles.checked]}>
        {accepted && <ThemedText style={styles.checkboxMark}>✓</ThemedText>}
      </View>
      <ThemedText themeColor="textSecondary">Ao clicar em Registrar você concorda com os termos de serviço.</ThemedText>
    </Pressable>
    {!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}
    <Pressable disabled={!accepted || loading} onPress={onSend} style={[styles.primaryButton, (!accepted || loading) && styles.disabled]}>
      {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Enviar código</ThemedText>}
    </Pressable>
    <Pressable onPress={onBack} style={styles.outlineButton}><ThemedText type="smallBold">Voltar</ThemedText></Pressable>
  </ThemedView>;
}

function RecoveryEmailView({ email, setEmail, onSend, loading, message, onBack }: { email: string; setEmail: (value: string) => void; onSend: () => void; loading: boolean; message: string | null; onBack: () => void }) {
  return <ThemedView style={styles.card}>
    <ThemedText type="subtitle" style={styles.authTitle}>Alterar senha</ThemedText>
    <ThemedText themeColor="textSecondary">Informe seu e-mail para receber o código e criar uma nova senha.</ThemedText>
    <TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
    {!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}
    <Pressable disabled={loading} onPress={onSend} style={[styles.primaryButton, loading && styles.disabled]}>
      {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Enviar código</ThemedText>}
    </Pressable>
    <Pressable onPress={onBack} style={styles.outlineButton}><ThemedText type="smallBold">Voltar</ThemedText></Pressable>
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
    {!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}
    <View style={styles.authFooter}>
      <Pressable disabled={loading} onPress={onBack} style={[styles.outlineButton, styles.authFooterButton]}><ThemedText type="smallBold">Voltar</ThemedText></Pressable>
      <Pressable disabled={loading} onPress={onSubmit} style={[styles.primaryButton, styles.authFooterButton, loading && styles.disabled]}>{loading ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>{submitLabel}</ThemedText>}</Pressable>
    </View>
  </ThemedView>;
}
function LoggedAccountV2({ email, notifications, setNotifications, onLogout, logoutLoading, onPersonal, onOrders, onFavorites }: { email: string; notifications: boolean; setNotifications: (value: boolean) => void; onLogout: () => void; logoutLoading: boolean; onPersonal: () => void; onOrders: () => void; onFavorites: () => void }) {
  const tiles: AccountTileData[] = [
    { label: 'Meus pedidos', icon: <Box01Icon color="#313235" size={18} />, onPress: onOrders },
    { label: 'Dados pessoais', icon: <UserIcon color="#313235" size={18} />, onPress: onPersonal },
    { label: 'Favoritos', icon: <HeartIcon color="#313235" size={18} />, onPress: onFavorites },
    { label: 'Trocas e devoluções', icon: <HomeUtilityReturnsIcon color="#313235" size={18} /> },
    { label: 'Redefinição de senha', icon: <LockIcon color="#313235" size={18} /> },
    { label: 'Cupons de desconto', icon: <HomeUtilityDiscountIcon color="#313235" size={18} /> },
    { label: 'Nossas lojas', icon: <HomeUtilityStoresIcon color="#313235" size={18} /> },
    { label: 'Política de privacidade', icon: <HomeUtilityPrivacyIcon color="#313235" size={18} /> },
  ];
  return <><ThemedText style={styles.loggedGreeting}>Olá,</ThemedText><ThemedText style={styles.email}>{email}</ThemedText><Pressable disabled={logoutLoading} onPress={onLogout} style={[styles.logout, logoutLoading && styles.disabled]}>{logoutLoading ? <ActivityIndicator size="small" color="#0a0a0a" /> : <ThemedText style={styles.logoutText}>Sair</ThemedText>}</Pressable><View style={styles.tileGrid}>{tiles.map((tile) => <AccountTile key={tile.label} {...tile} />)}</View><Preference value={notifications} onChange={setNotifications} /><ThemedText type="subtitle" style={styles.helpTitle}>Ficou com alguma dúvida?</ThemedText><Pressable style={styles.helpButton}><ThemedText type="smallBold">Ajuda</ThemedText></Pressable><ThemedText style={styles.powered}>Powered by lojahr</ThemedText></>;
}

function PersonalData({ email, profile, profileMessage, onSaved, onBack, onPrivacyPress }: { email: string; profile: CustomerProfile; profileMessage: string | null; onSaved: (profile: CustomerProfile) => void; onBack: () => void; onPrivacyPress: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function save() {
    try {
      setSaving(true); setMessage(null);
      const normalizedBirthDate = birthDateToApi(birthDate);
      const updated = await updateCustomerProfile(email, { email, firstName, lastName, document, phone: phoneToApi(phone), gender, ...(normalizedBirthDate ? { birthDate: normalizedBirthDate } : {}), isNewsletterOptIn: newsletterOptIn });
      onSaved(updated);
      setEditing(false);
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
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Dados Pessoais" onBack={onBack} /><ScrollView contentContainerStyle={styles.content}><ThemedView style={styles.card}><ThemedText type="subtitle">Dados Pessoais</ThemedText><ThemedText themeColor="textSecondary">E-mail</ThemedText>{editing ? <TextInput value={email} editable={false} style={[styles.input, styles.readonly]} /> : <ThemedText>{email || 'Não informado'}</ThemedText>}{fields.map((field) => <View key={field.label}><ThemedText themeColor="textSecondary">{field.label}</ThemedText>{editing ? <TextInput value={field.label === 'Telefone com DDD' ? formatPhoneWithoutCountryCode(field.value) : field.value} onChangeText={field.set} style={styles.input} /> : <ThemedText>{(field.displayValue ?? field.value) || 'Não informado'}</ThemedText>}</View>)}<ThemedText themeColor="textSecondary">Gênero (opcional)</ThemedText>{editing ? <><Pressable onPress={() => setGenderOpen(!genderOpen)} style={styles.select}><ThemedText>{formatGenderLabel(gender) || 'Selecione'}</ThemedText><View style={[styles.genderDropdownIcon, genderOpen && styles.genderDropdownIconOpen]}><ChevronRightIcon color="#625d57" size={16} /></View></Pressable>{genderOpen && <View style={styles.dropdown}>{genders.map((option) => <Pressable key={option} onPress={() => { setGender(option); setGenderOpen(false); }} style={styles.option}><ThemedText>{option}</ThemedText></Pressable>)}</View>}</> : <ThemedText>{formatGenderLabel(gender) || 'Não informado'}</ThemedText>}{!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}{editing ? <Pressable disabled={saving} onPress={save} style={[styles.primaryButton, saving && styles.disabled]}>{saving ? <ActivityIndicator size="small" color="#ffffff" /> : <ThemedText style={styles.primaryText}>Confirmar</ThemedText>}</Pressable> : <Pressable onPress={() => setEditing(true)}><ThemedText style={styles.primaryDadosText} type="link">Editar dados pessoais</ThemedText></Pressable>}</ThemedView><NewsletterOptIn value={newsletterOptIn} onChange={changeNewsletterOptIn} onPrivacyPress={onPrivacyPress} disabled={newsletterSaving} /></ScrollView></SafeAreaView></ThemedView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1, padding: 20}, content: { gap: Spacing.three, paddingVertical: Spacing.five }, greeting: { textAlign: 'center', color: '#8f8f8f' }, loggedGreeting: { fontSize: 22 }, email: { fontSize: 16 }, primaryButton: { padding: Spacing.four, borderRadius: 8, alignItems: 'center', backgroundColor: '#0a0a0a' }, primaryText: { color: '#ffffff', fontWeight: '700' }, primaryDadosText: { textDecorationLine: 'underline', color: '#0a0a0a' }, logout: { alignSelf: 'flex-start', paddingVertical: Spacing.one, width: '100%', textAlign: 'center' }, logoutText: { color: '#0a0a0a', fontWeight: '600', width: '100%', textAlign: 'center', borderWidth: 1, borderColor: '#0a0a0a', borderRadius: 5, padding: 8 }, tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, tile: { width: '48%', minHeight: 72, padding: Spacing.three, borderRadius: 14, backgroundColor: '#e9e7e3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, preference: { paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: '#dedbd5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, notificationSwitch: { width: 30, height: 16, padding: 3, borderRadius: 14, justifyContent: 'center' }, notificationSwitchOn: { backgroundColor: '#0a0a0a', alignItems: 'flex-end' }, notificationSwitchOff: { backgroundColor: '#dedbd5', alignItems: 'flex-start' }, notificationThumb: { width: 12, height: 12, borderRadius: 11, backgroundColor: '#ffffff', shadowColor: '#0a0a0a', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }, helpTitle: { fontSize: 18, textAlign: 'center' }, helpButton: { padding: Spacing.four, borderRadius: 8, borderWidth: 1, borderColor: '#0a0a0a', alignItems: 'center' }, powered: { textAlign: 'center', fontSize: 10, color: '#777' }, card: { gap: Spacing.three, padding: Spacing.three, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6e2dc' }, divider: { height: 1, backgroundColor: '#dedbd5' }, outlineButton: { padding: Spacing.three, borderRadius: 8, borderWidth: 1, borderColor: '#7b7772', alignItems: 'center' }, googleButton: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two, minHeight: 48 }, centerText: { textAlign: 'center' }, input: { padding: Spacing.three, borderRadius: 8, backgroundColor: '#f7f6f3', borderWidth: 1, borderColor: '#e0ddd7', fontSize: 15, fontFamily: Fonts.sans }, passwordInputWrap: { minHeight: 48, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f7f6f3', borderWidth: 1, borderColor: '#e0ddd7', flexDirection: 'row', alignItems: 'center' }, passwordInput: { flex: 1, paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, backgroundColor: 'transparent' }, passwordToggle: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, readonly: { color: '#999' }, select: { padding: Spacing.three, borderRadius: 8, backgroundColor: '#f7f6f3', borderWidth: 1, borderColor: '#cfc8bd', flexDirection: 'row', justifyContent: 'space-between' }, genderDropdownIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '90deg' }] }, genderDropdownIconOpen: { transform: [{ rotate: '-90deg' }] }, dropdown: { borderWidth: 1, borderColor: '#e0ddd7', borderRadius: 8, backgroundColor: '#fff' }, option: { padding: Spacing.three, borderBottomWidth: 1, borderBottomColor: '#eee' }, textButton: { alignItems: 'center', padding: Spacing.two }, forgotButton: { alignSelf: 'flex-start' }, linkText: { color: '#625d57', textDecorationLine: 'underline' }, authFooter: { flexDirection: 'row', gap: Spacing.two }, authFooterButton: { flex: 1, minHeight: 48, justifyContent: 'center' }, passwordRules: { gap: Spacing.one, paddingVertical: Spacing.one }, passwordRule: { fontSize: 12, lineHeight: 17 }, passwordRuleValid: { color: '#2f8f5b' }, passwordRuleInvalid: { color: '#df5f5f' }, checkRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }, checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: '#aaa', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, checkboxMark: { color: '#ffffff', fontSize: 13, lineHeight: 16, fontWeight: '700' }, checked: { backgroundColor: '#0a0a0a' }, disabled: { opacity: 0.5 },
  authTitle: { fontFamily: Fonts.bold, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  accountTile: { minHeight: 96, flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' },
  tileHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileIcon: { width: 20, height: 20, alignItems: 'flex-start', justifyContent: 'flex-start' },
  tileLabel: { color: '#313235', fontSize: 13, lineHeight: 18 },
  preferenceLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  preferenceText: { color: '#313235', fontSize: 14 },
});

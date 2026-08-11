import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { clearAccountSession, getAccountSession, loginVtexPassword, saveAccountSession, sendVtexAccessKey, startVtexAuthentication, validateVtexAccessKey } from '@/services/auth';
import { getOrderForm, type OrderForm } from '@/services/cart';
import { getCustomerProfileFromMasterData, updateCustomerProfile } from '@/services/customer';

type AccountView = 'home' | 'access' | 'password' | 'email' | 'code' | 'register' | 'personal';
type CustomerProfile = NonNullable<OrderForm['clientProfileData']> & { gender?: string; birthDate?: string; homePhone?: string };

const userEmail = 'wesley.lopes@hopelingerie.com.br';

export default function AccountScreen() {
  const router = useRouter();
  const [view, setView] = useState<AccountView>('home');
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState(userEmail);
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [authToken, setAuthToken] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile>({});
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const onScroll = useTabBarScroll();

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
            setProfile((current) => ({ ...current, ...orderForm.clientProfileData }));
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

  function logout() {
    clearAccountSession().finally(() => { setLoggedIn(false); setPassword(''); setView('home'); });
  }

  async function requestAccessCode() {
    try {
      setAuthMessage(null);
      const token = await startVtexAuthentication();
      await sendVtexAccessKey(email.trim(), token);
      setAuthToken(token);
      setView('code');
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Não foi possível enviar o código.'); }
  }

  async function validateAccessCode() {
    try {
      setAuthMessage(null);
      await validateVtexAccessKey(email.trim(), accessCode.trim(), authToken);
      await saveAccountSession(email.trim());
      setLoggedIn(true);
      setView('home');
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'Código inválido.'); }
  }

  if (view === 'home') {
    return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader back={false} showSearch={false} showCart={false} /><ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
      {loggedIn ? <LoggedAccountV2 email={email} notifications={notifications} setNotifications={setNotifications} onLogout={logout} onPersonal={() => setView('personal')} onOrders={() => router.push('/orders')} onFavorites={() => router.push('/favorites')} /> : <GuestAccount onEnter={() => setView('access')} onRegister={() => setView('register')} />}
    </ScrollView></SafeAreaView></ThemedView>;
  }

  if (view === 'personal') return <PersonalData email={email} profile={profile} profileMessage={profileMessage} onSaved={setProfile} onBack={() => setView('home')} />;

  const previousAccountView = () => {
    if (view === 'access') return setView('home');
    if (view === 'password' || view === 'email') return setView('access');
    if (view === 'code') return setView('email');
    if (view === 'register') return setView('access');
  };

  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title={view === 'register' ? 'Registrar' : 'Acesse sua conta'} onBack={previousAccountView} showSearch={false} showCart={false} /><ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={styles.content}>
    {view === 'access' && <AccessView onPassword={() => setView('password')} onEmail={() => setView('email')} onRegister={() => setView('register')} />}
    {view === 'password' && <PasswordView email={email} setEmail={setEmail} password={password} setPassword={setPassword} onLogin={login} loading={loginLoading} message={authMessage} onBack={() => setView('access')} />}
    {view === 'email' && <EmailAccessView email={email} setEmail={setEmail} onSend={requestAccessCode} onRegister={() => setView('register')} message={authMessage} />}
    {view === 'code' && <CodeView code={accessCode} setCode={setAccessCode} onValidate={validateAccessCode} onBack={() => setView('email')} message={authMessage} />}
    {view === 'register' && <RegisterView email={email} setEmail={setEmail} accepted={accepted} setAccepted={setAccepted} onBack={() => setView('access')} />}
  </ScrollView></SafeAreaView></ThemedView>;
}

function GuestAccount({ onEnter, onRegister }: { onEnter: () => void; onRegister: () => void }) {
  return <><ThemedText style={styles.greeting}>Para uma melhor experiência, entre ou cadastre-se</ThemedText><Pressable onPress={onEnter} style={styles.primaryButton}><ThemedText style={styles.primaryText}>Entrar</ThemedText></Pressable><UtilityGrid onRegister={onRegister} /><Preference /><ThemedText type="subtitle" style={styles.helpTitle}>Ficou com alguma dúvida?</ThemedText><Pressable style={styles.helpButton}><ThemedText type="smallBold">Ajuda</ThemedText></Pressable><ThemedText style={styles.powered}>Powered by LojaBL</ThemedText></>;
}

function LoggedAccount({ email, notifications, setNotifications, onLogout, onPersonal, onOrders, onFavorites }: { email: string; notifications: boolean; setNotifications: (value: boolean) => void; onLogout: () => void; onPersonal: () => void; onOrders: () => void; onFavorites: () => void }) {
  return <><ThemedText style={styles.loggedGreeting}>Olá,</ThemedText><ThemedText style={styles.email}>{email}</ThemedText><Pressable onPress={onLogout} style={styles.logout}><ThemedText style={styles.logoutText}>Sair da conta</ThemedText></Pressable><View style={styles.tileGrid}>{[['Meus pedidos', onOrders], ['Dados pessoais', onPersonal], ['Favoritos', () => undefined], ['Trocas e devoluções', () => undefined], ['Redefinição de senha', () => undefined], ['Cupons de desconto', () => undefined], ['Nossas lojas', () => undefined], ['Política de privacidade', () => undefined]].map(([label, action]) => <Pressable key={String(label)} onPress={action as () => void} style={styles.tile}><ThemedText>{String(label)}</ThemedText><ThemedText>›</ThemedText></Pressable>)}</View><Preference value={notifications} onChange={setNotifications} /><ThemedText type="subtitle" style={styles.helpTitle}>Ficou com alguma dúvida?</ThemedText><Pressable style={styles.helpButton}><ThemedText type="smallBold">Ajuda</ThemedText></Pressable><ThemedText style={styles.powered}>Powered by LojaBL</ThemedText></>;
}

function UtilityGrid({ onRegister }: { onRegister: () => void }) { return <View style={styles.tileGrid}>{['Cupons de desconto', 'Trocas e devoluções', 'Política de privacidade', 'Nossas lojas'].map((label) => <Pressable key={label} onPress={label === 'Nossas lojas' ? onRegister : undefined} style={styles.tile}><ThemedText>{label}</ThemedText><ThemedText>›</ThemedText></Pressable>)}</View>; }
function Preference({ value = false, onChange }: { value?: boolean; onChange?: (value: boolean) => void }) { return <View style={styles.preference}><ThemedText>Notificações</ThemedText><Switch value={value} onValueChange={onChange} trackColor={{ false: '#dedbd5', true: '#1e120d' }} /></View>; }
function AccessView({ onPassword, onEmail, onRegister }: { onPassword: () => void; onEmail: () => void; onRegister: () => void }) { return <ThemedView style={styles.card}><ThemedText type="subtitle">Acesse sua conta</ThemedText><ThemedText themeColor="textSecondary">Entre de forma rápida e segura usando uma das opções abaixo</ThemedText><View style={styles.divider} /><Pressable onPress={onEmail} style={styles.outlineButton}><ThemedText type="smallBold">Receber código de acesso por e-mail</ThemedText></Pressable><Pressable onPress={onPassword} style={styles.outlineButton}><ThemedText type="smallBold">Entrar com e-mail e senha</ThemedText></Pressable><View style={styles.divider} /><ThemedText style={styles.centerText}>Ainda não possui uma conta?</ThemedText><Pressable onPress={onRegister} style={styles.outlineButton}><ThemedText type="smallBold">Crie sua conta</ThemedText></Pressable></ThemedView>; }
function PasswordView({ email, setEmail, password, setPassword, onLogin, loading, message, onBack }: { email: string; setEmail: (value: string) => void; password: string; setPassword: (value: string) => void; onLogin: () => void; loading: boolean; message: string | null; onBack: () => void }) { return <ThemedView style={styles.card}><ThemedText type="subtitle">Entrar com e-mail e senha</ThemedText><ThemedText themeColor="textSecondary">Insira seu e-mail e senha abaixo</ThemedText><TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" style={styles.input} /><TextInput value={password} onChangeText={setPassword} placeholder="Digite sua senha" secureTextEntry style={styles.input} /><ThemedText type="smallBold">Esqueceu a senha?</ThemedText>{!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}<Pressable disabled={loading} onPress={onLogin} style={[styles.primaryButton, loading && styles.disabled]}><ThemedText style={styles.primaryText}>{loading ? 'Entrando...' : 'Entrar'}</ThemedText></Pressable><Pressable onPress={onBack} style={styles.textButton}><ThemedText>Voltar</ThemedText></Pressable></ThemedView>; }
function EmailAccessView({ email, setEmail, onSend, onRegister, message }: { email: string; setEmail: (value: string) => void; onSend: () => void; onRegister: () => void; message: string | null }) { return <ThemedView style={styles.card}><ThemedText type="subtitle">Acesse sua conta</ThemedText><ThemedText themeColor="textSecondary">Informe seu e-mail para acessar ou registrar seus dados com segurança</ThemedText><TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" style={styles.input} /><Pressable onPress={onSend} style={styles.primaryButton}><ThemedText style={styles.primaryText}>Insira seu e-mail</ThemedText></Pressable>{!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}<ThemedText themeColor="textSecondary">Ao se cadastrar, você concorda com nossa Política de Privacidade.</ThemedText><Pressable onPress={onRegister}><ThemedText type="link">Criar uma conta</ThemedText></Pressable></ThemedView>; }
function CodeView({ code, setCode, onValidate, onBack, message }: { code: string; setCode: (value: string) => void; onValidate: () => void; onBack: () => void; message: string | null }) { return <ThemedView style={styles.card}><ThemedText type="subtitle">Digite o código de acesso</ThemedText><ThemedText themeColor="textSecondary">Enviamos um código para o seu e-mail.</ThemedText><TextInput value={code} onChangeText={setCode} placeholder="Código de acesso" keyboardType="number-pad" style={styles.input} /><Pressable onPress={onValidate} style={styles.primaryButton}><ThemedText style={styles.primaryText}>Confirmar código</ThemedText></Pressable>{!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}<Pressable onPress={onBack} style={styles.textButton}><ThemedText>Voltar</ThemedText></Pressable></ThemedView>; }
function RegisterView({ email, setEmail, accepted, setAccepted, onBack }: { email: string; setEmail: (value: string) => void; accepted: boolean; setAccepted: (value: boolean) => void; onBack: () => void }) { return <ThemedView style={styles.card}><ThemedText type="subtitle">Acessar com o seu e-mail</ThemedText><TextInput value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" style={styles.input} /><Pressable onPress={() => setAccepted(!accepted)} style={styles.checkRow}><View style={[styles.checkbox, accepted && styles.checked]} /><ThemedText themeColor="textSecondary">Ao clicar em Registrar você concorda com os termos de serviço.</ThemedText></Pressable><Pressable disabled={!accepted} style={[styles.primaryButton, !accepted && styles.disabled]}><ThemedText style={styles.primaryText}>Enviar código</ThemedText></Pressable><Pressable onPress={onBack} style={styles.outlineButton}><ThemedText type="smallBold">Voltar</ThemedText></Pressable></ThemedView>; }
function LoggedAccountV2({ email, notifications, setNotifications, onLogout, onPersonal, onOrders, onFavorites }: { email: string; notifications: boolean; setNotifications: (value: boolean) => void; onLogout: () => void; onPersonal: () => void; onOrders: () => void; onFavorites: () => void }) {
  const tiles: Array<[string, () => void]> = [['Meus pedidos', onOrders], ['Dados pessoais', onPersonal], ['Favoritos', onFavorites], ['Trocas e devoluções', () => undefined], ['Redefinição de senha', () => undefined], ['Cupons de desconto', () => undefined], ['Nossas lojas', () => undefined], ['Política de privacidade', () => undefined]];
  return <><ThemedText style={styles.loggedGreeting}>Olá,</ThemedText><ThemedText style={styles.email}>{email}</ThemedText><Pressable onPress={onLogout} style={styles.logout}><ThemedText style={styles.logoutText}>Sair da conta</ThemedText></Pressable><View style={styles.tileGrid}>{tiles.map(([label, action]) => <Pressable key={label} onPress={action} style={styles.tile}><ThemedText>{label}</ThemedText><ThemedText>›</ThemedText></Pressable>)}</View><Preference value={notifications} onChange={setNotifications} /><ThemedText type="subtitle" style={styles.helpTitle}>Ficou com alguma dúvida?</ThemedText><Pressable style={styles.helpButton}><ThemedText type="smallBold">Ajuda</ThemedText></Pressable><ThemedText style={styles.powered}>Powered by LojaBL</ThemedText></>;
}

function PersonalData({ email, profile, profileMessage, onSaved, onBack }: { email: string; profile: CustomerProfile; profileMessage: string | null; onSaved: (profile: CustomerProfile) => void; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  const [document, setDocument] = useState(profile.document ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? '');
  const [gender, setGender] = useState(profile.gender ?? '');
  const [genderOpen, setGenderOpen] = useState(false);
  const genders = ['Feminino', 'Masculino', 'Prefiro não informar', 'Outro'];

  useEffect(() => {
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setDocument(profile.document ?? '');
    setPhone(profile.phone ?? profile.homePhone ?? '');
    setBirthDate(profile.birthDate ?? '');
    setGender(profile.gender ?? '');
  }, [profile]);

  async function save() {
    try {
      setSaving(true); setMessage(null);
      const updated = await updateCustomerProfile(email, { email, firstName, lastName, document, phone, gender, birthDate });
      onSaved(updated);
      setEditing(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar os dados.'); }
    finally { setSaving(false); }
  }

  const fields = [{ label: 'Nome', value: firstName, set: setFirstName }, { label: 'Sobrenome', value: lastName, set: setLastName }, { label: 'CPF', value: document, set: setDocument }, { label: 'Data de nascimento', value: birthDate, set: setBirthDate }, { label: 'Telefone com DDD', value: phone, set: setPhone }];
  return <ThemedView style={styles.container}><SafeAreaView style={styles.safeArea}><ScreenHeader title="Dados Pessoais" onBack={onBack} /><ScrollView contentContainerStyle={styles.content}><ThemedView style={styles.card}><ThemedText type="subtitle">Dados Pessoais</ThemedText><ThemedText themeColor="textSecondary">E-mail</ThemedText>{editing ? <TextInput value={email} editable={false} style={[styles.input, styles.readonly]} /> : <ThemedText>{email || 'Não informado'}</ThemedText>}{fields.map((field) => <View key={field.label}><ThemedText themeColor="textSecondary">{field.label}</ThemedText>{editing ? <TextInput value={field.value} onChangeText={field.set} style={styles.input} /> : <ThemedText>{field.value || 'Não informado'}</ThemedText>}</View>)}<ThemedText themeColor="textSecondary">Gênero (opcional)</ThemedText>{editing ? <><Pressable onPress={() => setGenderOpen(!genderOpen)} style={styles.select}><ThemedText>{gender || 'Selecione'}</ThemedText><ThemedText>⌄</ThemedText></Pressable>{genderOpen && <View style={styles.dropdown}>{genders.map((option) => <Pressable key={option} onPress={() => { setGender(option); setGenderOpen(false); }} style={styles.option}><ThemedText>{option}</ThemedText></Pressable>)}</View>}</> : <ThemedText>{gender || 'Não informado'}</ThemedText>}{!!message && <ThemedText themeColor="textSecondary">{message}</ThemedText>}{editing ? <Pressable disabled={saving} onPress={save} style={[styles.primaryButton, saving && styles.disabled]}><ThemedText style={styles.primaryText}>{saving ? 'Salvando...' : 'Confirmar'}</ThemedText></Pressable> : <Pressable onPress={() => setEditing(true)}><ThemedText type="link">Editar dados pessoais</ThemedText></Pressable>}</ThemedView></ScrollView></SafeAreaView></ThemedView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1, padding: 20}, content: { gap: Spacing.three, paddingVertical: Spacing.five }, greeting: { textAlign: 'center', color: '#8f8f8f' }, loggedGreeting: { fontSize: 22 }, email: { fontSize: 16 }, primaryButton: { padding: Spacing.four, borderRadius: 8, alignItems: 'center', backgroundColor: '#1e120d' }, primaryText: { color: '#ffffff', fontWeight: '700' }, logout: { alignSelf: 'flex-start', paddingVertical: Spacing.one }, logoutText: { color: '#9b1c1c', fontWeight: '700' }, tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, tile: { width: '48%', minHeight: 72, padding: Spacing.three, borderRadius: 14, backgroundColor: '#e9e7e3', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, preference: { paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: '#dedbd5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, helpTitle: { fontSize: 18, textAlign: 'center' }, helpButton: { padding: Spacing.four, borderRadius: 8, borderWidth: 1, borderColor: '#231f20', alignItems: 'center' }, powered: { textAlign: 'center', fontSize: 10, color: '#777' }, card: { gap: Spacing.three, padding: Spacing.three, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6e2dc' }, divider: { height: 1, backgroundColor: '#dedbd5' }, outlineButton: { padding: Spacing.three, borderRadius: 8, borderWidth: 1, borderColor: '#7b7772', alignItems: 'center' }, centerText: { textAlign: 'center' }, input: { padding: Spacing.three, borderRadius: 8, backgroundColor: '#f7f6f3', borderWidth: 1, borderColor: '#e0ddd7', fontSize: 15 }, readonly: { color: '#999' }, select: { padding: Spacing.three, borderRadius: 8, backgroundColor: '#f7f6f3', borderWidth: 1, borderColor: '#cfc8bd', flexDirection: 'row', justifyContent: 'space-between' }, dropdown: { borderWidth: 1, borderColor: '#e0ddd7', borderRadius: 8, backgroundColor: '#fff' }, option: { padding: Spacing.three, borderBottomWidth: 1, borderBottomColor: '#eee' }, textButton: { alignItems: 'center', padding: Spacing.two }, checkRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }, checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: '#aaa', borderRadius: 4 }, checked: { backgroundColor: '#1e120d' }, disabled: { opacity: 0.5 },
});

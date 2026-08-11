import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import {
	AppCard,
	HeaderContentWrapper,
	HeaderReturn,
	HeaderText,
	Loading,
} from 'wml-store-templates-shared'

import Alert from '../components/Alert/Alert'
import SignInAccessKeyMode from '../components/SignIn/SignInAccessKeyMode'
import SignInOptionsMode from '../components/SignIn/SignInOptionsMode'
import SignInPasswordMode from '../components/SignIn/SignInPasswordMode'
import { useLocalShoppingCart } from '../providers/LocalCart'
import {
	doLogin,
	loadUserEmailFromStorage,
	loginWithGoogle,
	saveUserEmailOnStorage,
} from '../services/CustomerService'
import { navigate, PAGES } from '../services/NavigationService'
import { getLoginProviders } from '../services/StoreService'
import { sendScreenView, trackLogin } from '../services/TrackingService'
import useOtpLogin from '../services/useOtpLogin'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'

export default function SignIn(props) {
	const PAGE = 'Login'

	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()

	const redirectTo = props?.location?.state?.redirectTo
	const redirectState = props?.location?.state?.redirectState
	const closeAppAfterLogin = props?.location?.state?.closeAppAfterLogin
	const openWithBottomBar = props?.location?.state?.tabIndex !== undefined

	const LOGIN_WITH_EMAIL_AND_PASSWORD = 'emailAndPassword'
	const LOGIN_WITH_EMAIL_AND_ACCESS_KEY = 'emailAndAccessKey'
	const LOGIN_OPTIONS = 'loginOptions'

	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [showLoginErrorAlert, setShowLoginErrorAlert] = useState(false)
	const [alertMessage, setAlertMessage] = useState('')
	const [loginMode, setLoginMode] = useState(LOGIN_OPTIONS)
	const [loginProviders, setLoginProviders] = useState()
	const [loadingLoginProviders, setLoadingLoginProviders] = useState(false)
	const [canUseSocialLogin, setCanUseSocialLogin] = useState(false)

	const onLoggedIn = () => {
		if (redirectTo) {
			navigate('/' + redirectTo, redirectState)
		} else if (closeAppAfterLogin) {
			Eitri.close()
		} else {
			Eitri.navigation.back()
		}
	}

	const otp = useOtpLogin({
		onSuccess: () => {
			saveUserEmailOnStorage(otp.email)
			onLoggedIn()
		},
		onError: () => {
			saveUserEmailOnStorage(otp.email)
		},
		t,
	})

	useEffect(() => {
		loadLoginProviders()
		addonUserTappedActiveTabListener()
		sendScreenView(PAGE, 'SignIn')
	}, [])

	useEffect(() => {
		loadUserEmailFromStorage()
			.then((email) => {
				if (email) {
					setUsername(email)
					otp.setEmail(email)
				}
			})
			.catch()
	}, [])

	const loadLoginProviders = async () => {
		try {
			setLoadingLoginProviders(true)
			const providers = await getLoginProviders()
			if (!providers?.passwordAuthentication && providers?.accessKeyAuthentication) {
				setLoginMode(LOGIN_WITH_EMAIL_AND_ACCESS_KEY)
			}
			const { applicationData } = await Eitri.getConfigs()
			if (applicationData?.platform === 'android') {
				setCanUseSocialLogin(true)
			}
			setLoginProviders(providers)
			setLoadingLoginProviders(false)
		} catch (e) {
			console.error('Erro ao carregar provedores de login', e)
			setLoadingLoginProviders(false)
		}
	}

	const goToPasswordReset = () => {
		navigate(PAGES.PASSWORD_RESET, { email: username })
	}

	const setLoginMethod = (method) => {
		setLoginMode(method)
	}

	const handleLogin = async () => {
		setLoading(true)
		try {
			const loggedIn = await doLogin(username, password)
			if (loggedIn === 'Success') {
				await onLoggedIn()
				trackLogin()
				return
			}
			setAlertMessage(t('signIn.verifyAgain'))
			setShowLoginErrorAlert(true)
		} catch (e) {
			setAlertMessage(t('signIn.errorInvalidUser'))
			setShowLoginErrorAlert(true)
		} finally {
			saveUserEmailOnStorage(username)
			setLoading(false)
		}
	}

	const handleSocialLogin = async () => {
		try {
			onLoggedIn()
		} catch (error) {
			console.error(error)
		}
	}

	const handleGoogleLogin = async () => {
		try {
			await loginWithGoogle()
			handleSocialLogin()
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<Page
			title={PAGE}
			topInset
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }} showAccountAction={false}>
				{!openWithBottomBar && <HeaderReturn />}
				<HeaderText text={t('signIn.headerText')} />
			</HeaderContentWrapper>

			<Loading
				isLoading={loadingLoginProviders || loading}
				fullScreen={true}
			/>

			<View className='min-h-full bg-[#f7f7f7] px-4 pb-4 pt-4'>
				<AppCard className='rounded-xl border-gray-200 shadow-sm'>
					{loginMode === LOGIN_OPTIONS && (
						<SignInOptionsMode
							t={t}
							loginProviders={loginProviders}
							canUseSocialLogin={canUseSocialLogin}
							onGoogleLogin={handleGoogleLogin}
							onSelectAccessKey={() => setLoginMethod(LOGIN_WITH_EMAIL_AND_ACCESS_KEY)}
							onSelectPassword={() => setLoginMethod(LOGIN_WITH_EMAIL_AND_PASSWORD)}
							onCreateAccount={() => navigate(PAGES.SIGNUP)}
						/>
					)}

					{loginMode === LOGIN_WITH_EMAIL_AND_PASSWORD && (
						<SignInPasswordMode
							t={t}
							username={username}
							password={password}
							onChangeUsername={setUsername}
							onChangePassword={setPassword}
							onSubmit={handleLogin}
							onForgotPassword={goToPasswordReset}
						/>
					)}

					{loginMode === LOGIN_WITH_EMAIL_AND_ACCESS_KEY && (
						<SignInAccessKeyMode
							t={t}
							otp={otp}
							onEmailChange={(email) => {
								otp.setEmail(email)
								setUsername(email)
							}}
							onOpenPrivacyPolicy={() => navigate(PAGES.PRIVACY_POLICY)}
						/>
					)}
				</AppCard>
			</View>

			<Alert
				show={showLoginErrorAlert || otp.showLoginErrorAlert}
				onDismiss={() => {
					setShowLoginErrorAlert(false)
					otp.setShowLoginErrorAlert(false)
				}}
				duration={10}
				message={alertMessage || otp.alertMessage}
			/>
		</Page>
	)
}

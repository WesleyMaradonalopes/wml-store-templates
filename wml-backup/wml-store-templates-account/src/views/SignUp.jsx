import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import {
	AppActionButton,
	AppCard,
	AppInput,
	HeaderText,
	HeaderContentWrapper,
	HeaderReturn,
	Loading,
} from 'wml-store-templates-shared'

import userIcon from '../assets/icons/user.svg'
import CCheckbox from '../components/CCheckbox/CCheckbox'
import { sendScreenView } from '../services/TrackingService'
import { getStorePreferences } from '../services/StoreService'
import { getSavedUser } from '../services/CustomerService'
import { navigate, PAGES } from '../services/NavigationService'
import Alert from '../components/Alert/Alert'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { useLocalShoppingCart } from '../providers/LocalCart'
import useOtpLogin from '../services/useOtpLogin'

export default function SignUp(props) {
	const PAGE = 'Cadastro'

	const [storeConfig, setStoreConfig] = useState(false)
	const [termsChecked, setTermsChecked] = useState(false)

	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()

	const otp = useOtpLogin({
		onSuccess: () => navigate(PAGES.HOME),
		t,
		requireTerms: true,
		termsChecked,
	})

	useEffect(() => {
		getStorePreferences().then((conf) => {
			setStoreConfig(conf)
		})
		const loadSavedUser = async () => {
			const user = await getSavedUser()
			if (user && user.email) {
				otp.setEmail(user.email)
			}
		}

		loadSavedUser()
		addonUserTappedActiveTabListener()
		sendScreenView(PAGE, 'SignUp')
	}, [])

	return (
		<Page
			title={PAGE}
			topInset
			className='font-sans text-base text-primary'>
			<Loading
				isLoading={otp.loading}
				fullScreen={true}
			/>

			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={t('signUp.lbRegister')} />
			</HeaderContentWrapper>

			<View className='bg-[#F7F7F7] p-4 pb-6'>
				<AppCard title={t('signUp.lbEmailAccess')}>

					<View className='mt-8 flex flex-col gap-y-4'>
						<AppInput
						icon={userIcon}
						value={otp.email}
						type='email'
						placeholder='Email'
						onChange={(e) => otp.setEmail(e.target.value)}
						showClearInput={false}
						required={true}
						/>

						<CCheckbox
							label={`${t('signUp.textTerms')}${storeConfig?.displayCompanyName ? ' ' + storeConfig?.displayCompanyName : ''}.`}
							checked={termsChecked}
							onChange={setTermsChecked}
						/>

						{otp.emailCodeSent && (
							<>
								<AppInput
								label={t('signUp.lbVerifyCode')}
								placeholder={t('signUp.lbVerifyCode')}
								inputMode='numeric'
								value={otp.verificationCode}
								onChange={(e) => otp.setVerificationCode(e.target.value)}
								height='45px'
								/>

								<AppActionButton
								label={t('signUp.lbLogin')}
								onPress={otp.loginWithEmailAndAccessKey}
								disabled={!otp.email || !otp.verificationCode}
								type='email'
								/>
							</>
						)}

						<AppActionButton
							label={
								!otp.emailCodeSent
									? t('signIn.textSendCode')
									: `${t('signIn.textResendCode')}${!otp.resendCode ? ` (${otp.timeOutToResentEmail})` : ''}`
							}
							disabled={!otp.resendCode || !otp.email || otp.loadingSendingCode}
							onPress={otp.sendAccessKey}
						/>

						<AppActionButton
						variant='outlined'
						label={t('signUp.lbBack')}
						onPress={() => Eitri.navigation.back()}
						/>
					</View>
				</AppCard>
				</View>

			<Alert
				type='negative'
				show={otp.showLoginErrorAlert}
				onDismiss={() => otp.setShowLoginErrorAlert(false)}
				duration={7}
				message={otp.alertMessage}
			/>
		</Page>
	)
}

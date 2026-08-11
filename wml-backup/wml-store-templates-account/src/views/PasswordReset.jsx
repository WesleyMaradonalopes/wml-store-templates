import { useTranslation } from 'eitri-i18n'

import {
	Loading,
	HeaderContentWrapper,
	HeaderText,
	HeaderReturn,
	AppActionButton,
	AppCard,
	AppInput,
} from 'wml-store-templates-shared'

import Alert from '../components/Alert/Alert'
import { sendPasswordResetCode } from '../services/CustomerService'
import { sendScreenView } from '../services/TrackingService'
import { navigate, PAGES } from '../services/NavigationService'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { useLocalShoppingCart } from '../providers/LocalCart'

export default function PasswordReset(props) {
	const PAGE = 'Reset de senha - início'

	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()

	const [username, setUsername] = useState('')
	const [loading, setLoading] = useState(false)
	const [showErrorAlert, setShowErrorAlert] = useState(false)

	useEffect(() => {
		const email = props?.location?.state?.email
		if (email) {
			setUsername(email)
		}

		addonUserTappedActiveTabListener()
		sendScreenView(PAGE, 'PasswordReset')
	}, [])

	const goToPasswordResetCode = async () => {
		try {
			if (!username) {
				return
			}
			setLoading(true)
			await sendPasswordResetCode(username)
			navigate(PAGES.PASSWORD_RESET_CODE, { email: username })
			setLoading(false)
		} catch (e) {
			setShowErrorAlert(true)
			setLoading(false)
		}
	}

	return (
		<Page
			title={PAGE}
			topInset
			className='font-sans text-base text-primary'>
			<Loading
				isLoading={loading}
				fullScreen={true}
			/>

			<HeaderContentWrapper
				className=''
				cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={t('passwordReset.headerText')} />
			</HeaderContentWrapper>

			<View className='bg-[#F7F7F7] p-4 pb-6'>
				<AppCard
					title={t('passwordReset.emailRecoveryTitle')}
					subtitle={t('passwordReset.messageRecovery')}
					>

					<AppInput
						inputMode='email'
						placeholder={t('passwordReset.setEmail')}
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>

					<View className='mt-6'>
						<AppActionButton
							label={t('passwordReset.sendButton')}
							onPress={goToPasswordResetCode}
							disabled={!username || loading}
						/>
					</View>
				</AppCard>
			</View>

			<Alert
				type='negative'
				show={showErrorAlert}
				onDismiss={() => setShowErrorAlert(false)}
				duration={7}
				message={t('passwordReset.messageError')}
			/>
		</Page>
	)
}

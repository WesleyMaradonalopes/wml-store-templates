// /Users/calindra/Workspace/Eitri/eitri-shopping-template/shopping-vtex-template-account/src/views/PasswordResetNewPass.jsx
import { useTranslation } from 'eitri-i18n'

import {
	Loading,
	AppActionButton,
	AppCard,
	AppInput,
	AppText,
	HeaderContentWrapper,
	HeaderReturn,
	HeaderText,
} from 'wml-store-templates-shared'

import Alert from '../components/Alert/Alert'
import { navigate, PAGES } from '../services/NavigationService'
import { setPassword } from '../services/CustomerService'
import { sendScreenView } from '../services/TrackingService'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { useLocalShoppingCart } from '../providers/LocalCart'

export default function PasswordResetNewPass(props) {
	const PAGE = 'Reset de senha - Nova senha'
	const email = props?.location?.state?.email
	const recoveryCode = props?.location?.state?.recoveryCode

	const { cart } = useLocalShoppingCart()
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [showErrorAlert, setShowErrorAlert] = useState(false)

	const { t } = useTranslation()

	const requirements = [
		{
			text: t('passwordResetNewPass.passwordRequirementsCharacters'),
			valid: newPassword?.length >= 8,
		},
		{
			text: t('passwordResetNewPass.passwordRequirementsNumber'),
			valid: /[0-9]/.test(newPassword),
		},
		{
			text: t('passwordResetNewPass.passwordRequirementsUppercase'),
			valid: /[A-Z]/.test(newPassword),
		},
		{
			text: t('passwordResetNewPass.passwordRequirementsLowercase'),
			valid: /[a-z]/.test(newPassword),
		},
	]

	useEffect(() => {
		addonUserTappedActiveTabListener()
		sendScreenView(PAGE, 'PasswordResetNewPass')
	}, [])

	const confirmNewPassword = async () => {
		try {
			if (!email || !recoveryCode || !newPassword) {
				return
			}
			setLoading(true)
			await setPassword(email, recoveryCode, newPassword)
			navigate(PAGES.HOME, {}, true)
			setLoading(false)
		} catch (e) {
			console.error(e)
			// logError(PAGE, 'Erro ao redefinir senha', e) // logError não está definido no escopo
			setShowErrorAlert(true)
			setLoading(false)
		}
	}

	const allRequirementsMet = requirements.every((req) => req.valid)
	const passwordsMatch = newPassword && newPassword === confirmPassword

	return (
		<Page
			title={PAGE}
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={t('passwordResetNewPass.headerText')} />
			</HeaderContentWrapper>

			<Loading
				isLoading={loading}
				fullScreen={true}
			/>

			<View className='bg-[#F7F7F7] p-4 pb-6'>
				<AppCard
					title={t('passwordResetNewPass.forgotPass')}>

					<View className='mt-4 flex flex-col gap-2'>
						<AppInput
						autoFocus
						type='password'
						label={t('passwordResetNewPass.newPass')}
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						/>
						<AppInput
						type='password'
						label={t('passwordResetNewPass.confirmPass')}
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						/>
					</View>

					<View className='mt-4'>
						<View className='flex flex-col gap-1'>
						{requirements.map((req) => (
							<View
								key={req.text}
								className={`flex items-center gap-2 transition-colors duration-300 ${
									req.valid ? 'text-green-600' : 'text-red-600'
								}`}>
								{req.valid ? (
									<svg
										xmlns='http://www.w3.org/2000/svg'
										className='h-4 w-4 stroke-current'
										fill='none'
										viewBox='0 0 24 24'>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth='2'
											d='M5 13l4 4L19 7'
										/>
									</svg>
								) : (
									<svg
										xmlns='http://www.w3.org/2000/svg'
										className='h-4 w-4 stroke-current'
										fill='none'
										viewBox='0 0 24 24'>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth='2'
											d='M6 18L18 6M6 6l12 12'
										/>
									</svg>
								)}
								<AppText className='text-sm'>{req.text}</AppText>
							</View>
						))}
						</View>
					</View>

					<View className='mt-6'>
						<AppActionButton
						disabled={!allRequirementsMet || !passwordsMatch || loading}
						label={t('passwordResetNewPass.sendButton')}
						onPress={confirmNewPassword}
						/>
					</View>
				</AppCard>
				</View>

			<Alert
				type='negative'
				show={showErrorAlert}
				onDismiss={() => setShowErrorAlert(false)}
				duration={7}
				message={t('passwordResetNewPass.messageError')}
			/>
		</Page>
	)
}

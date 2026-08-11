import { useTranslation } from 'eitri-i18n'

import { HeaderContentWrapper, HeaderReturn, HeaderText, AppActionButton, AppCard, AppInput, AppText } from 'wml-store-templates-shared'

import { navigate, PAGES } from '../services/NavigationService'
import { sendScreenView } from '../services/TrackingService'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { useLocalShoppingCart } from '../providers/LocalCart'

export default function PasswordResetCode(props) {
	const PAGE = 'Reset de senha - código'

	const [recoveryCode, setRecoveryCode] = useState('')

	const RECOVERY_CODE_LENGTH = 6

	const email = props?.location?.state?.email

	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()

	useEffect(() => {
		addonUserTappedActiveTabListener()
		sendScreenView(PAGE, 'PasswordResetCode')
	}, [])

	const goToPasswordNewPass = () => {
		if (recoveryCode.length !== RECOVERY_CODE_LENGTH) {
			return
		}
		navigate(PAGES.PASSWORD_RESET_NEW_PASS, { email: email, recoveryCode })
	}

	const onCodeFilled = (e) => {
		setRecoveryCode(e.target.value)
	}

	return (
		<Page
			title={PAGE}
			topInset
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={t('passwordResetCode.headerText')} />
			</HeaderContentWrapper>

			<View className='bg-[#F7F7F7] p-4 pb-6'>
				<AppCard title={t('passwordResetCode.forgotPass')}>
					<View>
						<AppText className='text text-gray-600'>
							{`${t('passwordResetCode.messageEmail')} ${email || ''}`}
						</AppText>
					</View>

					<View className='mt-4 flex w-full justify-between gap-1'>
						<AppInput
						maxLength={RECOVERY_CODE_LENGTH}
						onChange={onCodeFilled}
						inputMode='numeric'
						inputClassName='text-center'
						/>
					</View>

					<View className='mt-8'>
						<AppActionButton
						disabled={recoveryCode?.length !== RECOVERY_CODE_LENGTH}
						label={t('passwordResetCode.sendButton')}
						onPress={goToPasswordNewPass}
						/>
					</View>
				</AppCard>
			</View>
		</Page>
	)
}

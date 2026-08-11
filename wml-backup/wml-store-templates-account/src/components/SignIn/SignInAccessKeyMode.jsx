import { View } from 'eitri-luminus'
import { AppActionButton, AppInput, AppText } from 'wml-store-templates-shared'

export default function SignInAccessKeyMode(props) {
	const {
		t,
		otp,
		onEmailChange,
		onOpenPrivacyPolicy = () => {},
	} = props

	const isEmailEmpty = !otp.email?.trim() || otp.loadingSendingCode
	const isCodeEmpty = !otp.verificationCode?.trim() || otp.loading
	const resendSeconds = Number.isFinite(otp.timeOutToResentEmail)
		? Math.max(0, otp.timeOutToResentEmail)
		: 54

	return (
		<View className='flex flex-col'>
			{!otp.emailCodeSent && (
				<>
					<View className='flex flex-col gap-2'>
						<AppText variant='title'>
							{t('signIn.accessTitle')}
						</AppText>
						<AppText variant='subtitle'>
							{t('signIn.emailAccessSubtitle')}
						</AppText>
					</View>

					<View className='mt-6'>
						<AppInput
							value={otp.email}
							inputMode='email'
							placeholder={t('signIn.emailPlaceholder')}
							
							onChange={(e) => onEmailChange(e.target.value)}
						/>

						<View className='mt-6'>
							<AppActionButton
								label={t('signIn.insertEmailButton')}
								onPress={otp.sendAccessKey}
								disabled={isEmailEmpty}
							/>
						</View>
					</View>

					<View className='mt-6 flex flex-row flex-wrap items-center gap-x-1 text-right'>
						<AppText className='text-[10px] leading-4 text-[#0F0805]'>
							{t('signIn.privacyAgreementPrefix')}
						</AppText>
						<View onClick={onOpenPrivacyPolicy}>
							<AppText className='text-[10px] leading-4 text-[#0F0805] underline'>
								{t('signIn.privacyPolicyLabel')}
							</AppText>
						</View>
					</View>
				</>
			)}

			{otp.emailCodeSent && (
				<>
					<AppText variant='title'>
						{t('signIn.accessTitle')}
					</AppText>

					<View className='mt-2'>
						<AppText variant='subtitle'>
							{t('signIn.codeSubtitle')}
						</AppText>
					</View>

					<View className='mt-6'>
						<AppText variant='subtitle'>
							{t('signIn.codeSentToText', { email: otp.email || t('signIn.fallbackEmail') })}
						</AppText>
					</View>

					<View className='mt-6'>
						<AppInput
							value={otp.verificationCode}
							inputMode='numeric'
							placeholder={t('signIn.accessCodePlaceholder')}
							onChange={(e) => otp.setVerificationCode(e.target.value)}
						/>
					</View>

					<View className='mt-4'>
						<AppText className='text-xs leading-4 text-[#0F0805]'>
							{t('signIn.needAnotherCode')}
						</AppText>
						<AppText className='text-xs leading-4 text-[#575756]'>
							{t('signIn.requestAnotherCodeAfter', { seconds: resendSeconds })}
						</AppText>
					</View>

					<View className='mt-6'>
						<AppActionButton
							label={t('signIn.confirmButton')}
							onPress={otp.loginWithEmailAndAccessKey}
							disabled={isCodeEmpty}
						/>
					</View>
				</>
			)}
		</View>
	)
}

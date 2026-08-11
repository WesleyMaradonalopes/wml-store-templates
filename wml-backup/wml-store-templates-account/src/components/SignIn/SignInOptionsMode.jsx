import Eitri from 'eitri-bifrost'
import { View } from 'eitri-luminus'
import { AppActionButton, AppText } from 'wml-store-templates-shared'

import iconGoogle from '../../assets/icons/google-icon.svg'

export default function SignInOptionsMode(props) {
	const {
		t,
		loginProviders,
		canUseSocialLogin,
		onGoogleLogin,
		onSelectAccessKey,
		onSelectPassword,
		onCreateAccount,
	} = props

	return (
		<>
			<View className='flex flex-col gap-2'>
				<AppText variant='title'>
					{t('signIn.accessTitle')}
				</AppText>
				<AppText variant='subtitle'>
					{t('signIn.accessSubtitle')}
				</AppText>
			</View>

			{Eitri.canIUse('23') &&
				canUseSocialLogin &&
				loginProviders?.oAuthProviders?.some((p) => p.providerName === 'Google') && (
					<AppActionButton
						label={t('signIn.googleButton')}
						onPress={onGoogleLogin}
						variant='outlined'
						className='mt-6 h-12'
						beforeIconSrc={iconGoogle}
					/>
				)}

			<View className='py-8'>
				<View className='h-px w-full bg-[#0f0805]/20' />
			</View>

			{loginProviders?.accessKeyAuthentication && (
				<View className='mt-0'>
					<AppActionButton
						variant='outlined'
						label={t('signIn.receiveCodeButton')}
						onPress={onSelectAccessKey}
					/>
				</View>
			)}

			{loginProviders?.passwordAuthentication && (
				<View className='mt-3'>
					<AppActionButton
						variant='outlined'
						label={t('signIn.enterWithEmailPassword')}
						onPress={onSelectPassword}
					/>
				</View>
			)}

			<View className='py-8'>
				<View className='h-px w-full bg-[#0f0805]/20' />
			</View>

			<View className='text-center'>
				<AppText variant='subtitle'>
					{t('signIn.noAccountText')}
				</AppText>
			</View>

			<View className='mt-3'>
				<AppActionButton
					variant='outlined'
					label={t('signIn.createAccountButton')}
					onPress={onCreateAccount}
				/>
			</View>

		</>
	)
}

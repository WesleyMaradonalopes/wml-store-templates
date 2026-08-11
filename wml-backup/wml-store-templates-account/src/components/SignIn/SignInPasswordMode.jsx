import { View } from 'eitri-luminus'
import { AppActionButton, AppInput, AppText } from 'wml-store-templates-shared'

import userIcon from '../../assets/images/user.svg'
import lockIcon from '../../assets/icons/lock.svg'

export default function SignInPasswordMode(props) {
	const {
		t,
		username,
		password,
		onChangeUsername,
		onChangePassword,
		onSubmit,
		onForgotPassword,
	} = props

	return (
		<View className='flex flex-col'>
			<View className='flex flex-col gap-2'>
				<AppText variant='title'>
					{t('signIn.enterWithEmailPassword')}
				</AppText>
				<AppText variant='subtitle'>
					{t('signIn.passwordSubtitle')}
				</AppText>
			</View>

			<View className='mt-6'>
				<AppInput
					icon={userIcon}
					value={username}
					placeholder={t('signIn.emailPlaceholder')}
					inputMode='email'
					placeholderTextColor='#B0A69B'
					onChange={(e) => onChangeUsername(e?.target?.value)}
				/>
			</View>

			<View className='mt-4'>
				<AppInput
					placeholder={t('signIn.passwordPlaceholder')}
					icon={lockIcon}
					value={password}
					type='password'
					placeholderTextColor='#B0A69B'
					onChange={(e) => onChangePassword(e.target.value)}
				/>
			</View>

			<View className='mt-4'>
				<View onClick={onForgotPassword}>
					<AppText className='text-sm font-semibold text-primary'>{t('signIn.forgotPass')}</AppText>
				</View>
			</View>

			<View className='mt-6'>
				<AppActionButton
					label={t('signIn.loginButton')}
					onPress={onSubmit}
				/>
			</View>
		</View>
	)
}

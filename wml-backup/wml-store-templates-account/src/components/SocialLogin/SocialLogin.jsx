// /Users/calindra/Workspace/Eitri/eitri-shopping-template/shopping-vtex-template-account/src/components/SocialLogin/SocialLogin.jsx
import { useTranslation } from 'eitri-i18n'

import iconFacebook from '../../assets/images/social_facebook.svg'
import iconGoogle from '../../assets/images/social_google.svg'
import { loginWithFacebook, loginWithGoogle } from '../../services/CustomerService'

export default function SocialLogin(props) {
	const { handleSocialLogin, oAuthProviders } = props
	const { t } = useTranslation()

	const onSocialLogin = async (executor) => {
		try {
			console.log('onSocialLogin')
			await executor()
			handleSocialLogin()
		} catch (e) {
			console.log('Error on social login:', e)
		}
	}

	return (
		<View className='flex flex-col gap-3'>
			{oAuthProviders?.some((p) => p.providerName === 'Google') && (
				<View
					className='flex h-12 cursor-pointer items-center justify-center gap-3 rounded border border-gray-300 bg-white p-2'
					onClick={() => onSocialLogin(loginWithGoogle)}>
					<Image
						src={iconGoogle}
						width='24px'
						height='24px'
					/>
					<Text className='text-sm font-bold uppercase text-gray-700'>{t('socialLogin.lbButton')}</Text>
				</View>
			)}

			{oAuthProviders?.some((p) => p.providerName === 'Facebook') && (
				<View
					className='flex h-12 cursor-pointer items-center justify-center gap-3 rounded bg-[#3D5A98] p-2'
					onClick={() => onSocialLogin(loginWithFacebook)}>
					<Image
						src={iconFacebook}
						width='24px'
						height='24px'
					/>
					<Text className='text-sm font-bold uppercase text-white'>Continuar com Facebook</Text>
				</View>
			)}
		</View>
	)
}

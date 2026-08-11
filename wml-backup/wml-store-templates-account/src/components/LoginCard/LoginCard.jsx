import { useTranslation } from 'eitri-i18n'

import { CustomButton } from 'wml-store-templates-shared'

import { navigate, PAGES } from '../../services/NavigationService'

export default function LoginCard(props) {
	const { t } = useTranslation()

	return (
		<View className='py-4'>
			<View className='flex w-full flex-col gap-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm'>
				<View className='flex flex-col gap-2'>
					<Text className='text-lg font-bold text-gray-800'>{t('loginCard.lbOpen')}</Text>
					<Text className='leading-relaxed text-gray-600'>{t('loginCard.infoPage')}</Text>
				</View>
				<CustomButton
					label={t('loginCard.lbButton')}
					className='rounded-xl'
					onPress={() => navigate(PAGES.SIGNIN, { redirectTo: 'Home' })}
				/>
			</View>
		</View>
	)
}

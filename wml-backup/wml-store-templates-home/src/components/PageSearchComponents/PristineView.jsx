import { useTranslation } from 'eitri-i18n'
import { Text, View } from 'eitri-luminus'
export default function PristineView() {
	const { t } = useTranslation()
	return (
		<View className='flex h-[100vh] items-center justify-center'>
			<Text className='text-lg font-bold text-neutral-content'>{t('pristineView.content')}</Text>
		</View>
	)
}

import { View, Text } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

export default function SizebayVFRFeedback({ suggestedSize }) {
	const { t } = useTranslation()

	if (!suggestedSize) return null

	return (
		<View>
			<View className='rounded bg-[#f3e7c2] px-3 py-1 text-xs text-[#9c7b2f]'>
				<Text>
					{t('sizebay.feedbackRecommendedSizePrefix')}
					{' '}
					<Text className='font-bold' fontWeight='bold' inline>
						{suggestedSize}
					</Text>
				</Text>
			</View>
		</View>
	)
}

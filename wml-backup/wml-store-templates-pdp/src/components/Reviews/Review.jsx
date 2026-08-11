import { useTranslation } from 'eitri-i18n'

import { Divisor } from 'wml-store-templates-shared'

import RatingStars from '../Rating/RatingStars'
export default function Review(props) {
	const { review } = props
	const { t } = useTranslation()
	return (
		<View>
			<View className='py-2'>
				<Text className='text-base font-bold'>{review?.user?.name}</Text>
				<View className='flex items-center justify-between pt-1'>
					<RatingStars ratingValue={review?.rate} />
					<Text className='font-bold text-neutral-content'>{review?.created_at}</Text>
				</View>
				<View className='py-1'>
					<Text>{review?.opinion || t('review.txtOpnion')}</Text>
				</View>
			</View>
			<Divisor />
		</View>
	)
}

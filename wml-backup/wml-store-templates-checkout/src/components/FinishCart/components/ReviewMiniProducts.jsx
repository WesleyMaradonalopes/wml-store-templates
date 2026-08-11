import { View, Text, Image } from 'eitri-luminus'

import { navigateToProduct } from '../../../services/navigationService'

export default function ReviewMiniProducts(props) {
	const { products } = props

	return (
		<View className='flex flex-col gap-2'>
			{products?.map((item) => (
				<View
					onClick={() => navigateToProduct(item.productId)}
					key={item.imageUrl}
					className='flex w-full flex-row justify-between gap-2'>
					<View className='flex shrink-0 justify-center bg-neutral-100'>
						<Image
							src={item.imageUrl}
							className='aspect-[3/4] h-auto w-14 shrink-0 object-contain'
						/>
					</View>
					<Text className='line-clamp-3 grow text-sm'>{item.name}</Text>
				</View>
			))}
		</View>
	)
}

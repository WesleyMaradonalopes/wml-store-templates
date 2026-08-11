import { Text, View } from 'eitri-luminus'

import { HIDE_SCROLLBAR_CLASS, HIDE_SCROLLBAR_STYLE } from '../../../../utils/hideScrollbar'

export default function RoundedBannerList(props) {
	const { data, onClick } = props
	const { size } = data

	const imagesList = data.images

	const getBannerDimensions = () => {
		const maxWidth = size?.maxWidth
		const maxHeight = size?.maxHeight

		if (maxWidth || maxHeight) {
			if (maxWidth > maxHeight) {
				return { width: `${maxHeight}px`, height: `${maxHeight}px` }
			} else {
				return { width: `${maxWidth}px`, height: `${maxWidth}px` }
			}
		}

		return { width: `200px`, height: `200px` }
	}

	return (
		<View className='flex flex-col gap-2 mb-6'>
			{data.mainTitle && (
				<View className='px-4'>
					<Text className='text-[22px] font-regular font-serif'>{data.mainTitle}</Text>
				</View>
			)}
			<View
				className={`flex flex-row overflow-x-auto ${HIDE_SCROLLBAR_CLASS}`}
				style={HIDE_SCROLLBAR_STYLE}
				title={data.mainTitle}>
				<View className={`flex flex-row gap-4 px-4`}>
					{imagesList &&
						imagesList.map((slider) => (
							<View
								key={slider.imageUrl}
								className='flex flex-col items-center'>
								<View
									style={{
										backgroundImage: `url(${slider.imageUrl})`,
										...getBannerDimensions(),
										backgroundSize: 'cover',
									}}
									className='rounded-full shadow-md'
									onClick={() => onClick(slider)}
								/>
								{slider?.action?.title && (
									<View className='pt-1'>
										<Text className='line-clamp-2 text-center font-bold leading-4 text-[11px]'>
											{slider?.action?.title}
										</Text>
									</View>
								)}
							</View>
						))}
				</View>
			</View>
		</View>
	)
}

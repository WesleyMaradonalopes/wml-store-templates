import { Text, View } from 'eitri-luminus'

export default function BannerList(props) {
	const { data, onClick } = props
	const { images = [], mainTitle, size, aspectRatio } = data ?? {}

	const { maxWidth = 254, maxHeight = 328 } = size ?? {}

	const [aspectW, aspectH] = aspectRatio?.split(':')?.map(Number) ?? [maxWidth, maxHeight]

	const width = maxWidth
	const height = maxWidth * (aspectH / aspectW)

	if (images.length === 0) return null

	return (
		<View className='flex flex-col gap-2'>
			{mainTitle && (
				<View className='px-4'>
					<Text className='text-lg font-bold'>{mainTitle}</Text>
				</View>
			)}
			<View className='relative'>
				<View className='flex overflow-x-auto'>
					<View className='flex gap-4 px-4'>
						{images.map(({ imageUrl, action }) => {
							const { title } = action ?? {}

							return (
								<View
									key={imageUrl}
									className='flex flex-col'>
									<View
										style={{
											backgroundImage: `url(${imageUrl})`,
											width: `${width}px`,
											height: `${height}px`,
											backgroundSize: 'cover',
										}}
										className={'flex flex-col justify-end rounded-2xl p-4'}
										onClick={() => onClick({ imageUrl, action })}>
										{title && (
											// h-14 for top alignment
											<View className=''>
												<Text className='text-[22px] font-normal leading-7 text-white'>
													{title}
												</Text>
											</View>
										)}
									</View>
								</View>
							)
						})}
					</View>
				</View>
			</View>
		</View>
	)
}

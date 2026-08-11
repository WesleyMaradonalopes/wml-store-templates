import { Text, View, Image, HTMLRender } from 'eitri-luminus'

function normalizeHighlightColor(color) {
	if (!color || typeof color !== 'string') return undefined

	const trimmedColor = color.trim()
	if (!trimmedColor) return undefined

	return trimmedColor.startsWith('#') ? trimmedColor : `#${trimmedColor}`
}

function getTitleHighlightColor(image, index) {
	if (index !== 0) return undefined

	return normalizeHighlightColor(image.action?.highlightColor)
}

function BannerItem({ image, onClick, index }) {
	const highlightColor = getTitleHighlightColor(image, index)

	return (
		<View
			className='flex min-w-0 flex-1 flex-col'
			onClick={() => onClick(image)}>
			<Image
				src={image.imageUrl}
				className='w-full rounded'
			/>
			{image.action?.title && (
				<View
					className='mt-auto w-full'
					style={highlightColor ? { color: highlightColor } : undefined}>
					{highlightColor ? (
						<HTMLRender
							className='text-center font-medium'
							html={`<span style="color:${highlightColor}">${image.action.title}</span>`}
						/>
					) : (
						<Text className='text-center font-medium flex items-center justify-center'>{image.action.title}</Text>
					)}
				</View>
			)}
		</View>
	)
}

function BannerRow({ images, onClick }) {
	return (
		<View className={`flex items-stretch gap-2 ${images.length > 1 ? 'px-4' : ''}`}>
			{images.map((image, index) => (
				<BannerItem
					key={image.imageUrl}
					image={image}
					onClick={onClick}
					index={index}
				/>
			))}
		</View>
	)
}

export default function FitOnScreen(props) {
	const { data, onClick } = props
	const images = data?.images ?? []

	return (
		<View>
			{data?.mainTitle && (
				<View className='px-4'>
					<Text className='text-lg font-bold'>{data.mainTitle}</Text>
				</View>
			)}

			<BannerRow
				images={images}
				onClick={onClick}
			/>
		</View>
	)
}

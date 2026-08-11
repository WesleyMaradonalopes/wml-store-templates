export default function ImageCard(props) {
	const { imageUrl } = props

	return (
		<View className='flex max-h-12 min-h-12 min-w-12 max-w-12 items-center justify-center rounded'>
			<Image
				src={imageUrl}
				className='max-h-full max-w-full'
			/>
		</View>
	)
}

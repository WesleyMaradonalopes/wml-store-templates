import { Image, Text, View } from 'eitri-luminus'
import { IoChevronForwardSharp } from 'react-icons/io5'

export default function SingleBanner(props) {
	const { data, onClick } = props

	const imagesList = data.images

	const padding = data?.padding || 0

	let proportionalHeight = 'auto'

	if (data?.aspectRatio) {
		try {
			const [aspectWidth, aspectHeight] = data?.aspectRatio?.split(':')?.map(Number)
			const screenWidth = window.innerWidth
			proportionalHeight = screenWidth * (aspectHeight / aspectWidth)
		} catch (e) {}
	}

	const image = imagesList?.[0]

	return (
		<View className='relative'>
			{data.mainTitle && (
				<View className='flex w-full items-center justify-center px-4'>
					<Text className='mb-8 font-bold'>{data.mainTitle}</Text>
				</View>
			)}

			{image && (
				<View
					key={image.imageUrl}
					onClick={() => onClick(image)}
					className={`relative flex w-full flex-row px-${padding} py-2`}>
					<View
						className='relative w-full'
						height={proportionalHeight}>
						<Image
							src={image.imageUrl}
							className='h-full w-full rounded'
						/>

						{(image.overlayTitle || image.overlaySubtitle) && (
							<View className='absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 px-4 text-center'>
								{image.overlayTitle && (
									<Text className='font-serif text-[32px] uppercase leading-tight text-white'>
										{image.overlayTitle}
									</Text>
								)}

								{image.overlaySubtitle && (
									<View className='flex flex-row items-center gap-1'>
										<Text className='text-[11px] font-medium uppercase tracking-wide text-white'>
											{image.overlaySubtitle}
										</Text>
										<IoChevronForwardSharp className='h-3 w-3 text-white' />
									</View>
								)}
							</View>
						)}

						{image.imageText && (
							<Text className='absolute bottom-10 right-4 text-[10px] font-light text-white'>
								{image.imageText}
							</Text>
						)}
					</View>
				</View>
			)}
		</View>
	)
}

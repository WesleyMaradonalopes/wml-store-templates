import { Image, Text, View } from 'eitri-luminus'
import { IoChevronForwardSharp } from 'react-icons/io5'

export default function GridList(props) {
	const { data, onClick } = props
	const imagesList = data?.images
	const radius = data?.borderRadius || 0

	return (
		<View>
			{data?.mainTitle && (
				<View className='px-4'>
					<Text className='font-bold'>{data.mainTitle}</Text>
				</View>
			)}
			<View className='grid grid-cols-2 gap-2 px-4'>
				{imagesList?.map((image) => (
					<View
						key={image.imageUrl}
						onClick={() => onClick(image)}
						className='relative'
					>
						<Image
							src={image.imageUrl}
							className='h-auto w-full'
							style={{ borderRadius: `${radius}px` }}
						/>
						{(image.overlayTitle || image.overlaySubtitle) && (
							<View className='absolute inset-0 flex p-4 flex-col justify-center gap-2 font-montserrat'>
								{image.overlayTitle && (
									<View className='max-w-[120px]'>
										<Text className='font-serif text-[16px] text-white'>{image.overlayTitle}</Text>
									</View>
								)}
								{image.overlaySubtitle && (
									<View className='flex flex-row items-center gap-1'>
										<Text className='text-[11px] font-bold text-white'>{image.overlaySubtitle}</Text>
										<IoChevronForwardSharp className='h-3 w-3 text-white' />
									</View>
								)}
							</View>
						)}
					</View>
				))}
			</View>
		</View>
	)
}

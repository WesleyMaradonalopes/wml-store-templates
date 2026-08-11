import { View, Text, Image, HTMLRender } from 'eitri-luminus'

import { useRef, useState } from 'react'
import { IoChevronForwardSharp } from 'react-icons/io5'

import { Slider } from 'wml-store-templates-shared'

const ARROW_BUTTON_CLASS =
	'absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full'
const ARROW_BUTTON_STYLE = { backgroundColor: '#FCFAF5E5' }

export default function SlideHero({ data, onClick }) {
	const carouselRef = useRef(null)
	const [currentSlide, setCurrentSlide] = useState(0)

	const { aspectRatio, autoPlay = true, images = [], mainTitle, borderRadius = 0, showArrows = true, showDots = true } = data
	const cssAspectRatio = aspectRatio ? aspectRatio.replace(':', ' / ') : undefined

	const canGoPrev = showArrows && currentSlide > 0
	const canGoNext = showArrows && currentSlide < images.length - 1

	if (images.length === 0) return null

	return (
		<View
			data-banner-hero=''
			data-has-border-radius={borderRadius > 0 ? '' : undefined}
			className='flex w-full flex-col gap-4 data-[has-border-radius]:px-4'>
			{/* Title */}
			{mainTitle && (
				<View className='flex items-center'>
					<Text className='text-center text-[22px] text-lg font-normal'>{mainTitle}</Text>
				</View>
			)}

			{/* Carousel */}
			<View
				className='relative w-full overflow-hidden'
				style={{ aspectRatio: cssAspectRatio || '4 / 3' }}>
				<Slider
					options={{
						loop: images.length === 1 ? false : autoPlay,
						renderMode: 'performance',
						slideChanged(s) {
							setCurrentSlide(s.track.details.rel)
						}
					}}
					autoPlay={autoPlay}
					autoPlayTimeout={7000}>
					{images.map((image) => {
						const { imageText, imageUrl, videoUrl } = image ?? {}

						const subTitleHtml = imageText?.replaceAll(/([^\s]*@[^\s]*)/g, '<strong>$1</strong>')

						return (
							<View
								key={`image_${imageUrl}`}
								className='relative h-full w-full'
								onClick={() => onClick(image)}>
								<Image
									style={{
										borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined,
									}}
									fadeIn={1000}
									src={imageUrl}
									className='h-full w-full object-cover'
								/>

								{subTitleHtml && (
									<View className='absolute bottom-7 left-4 max-w-32'>
										<HTMLRender
											html={subTitleHtml}
											className='text-white'
										/>
									</View>
								)}
							</View>
						)
					})}
				</Slider>

				{canGoPrev && (
					<View
						role='button'
						aria-label='Slide anterior'
						onClick={(e) => {
							e.stopPropagation()
							carouselRef.current?.goPrev()
						}}
						className={`left-0 ${ARROW_BUTTON_CLASS}`}
						style={ARROW_BUTTON_STYLE}>
						<IoChevronForwardSharp className='h-5 w-5 rotate-180 text-primary' />
					</View>
				)}

				{canGoNext && (
					<View
						role='button'
						aria-label='Próximo slide'
						onClick={(e) => {
							e.stopPropagation()
							carouselRef.current?.goNext()
						}}
						className={`right-0 ${ARROW_BUTTON_CLASS}`}
						style={ARROW_BUTTON_STYLE}>
						<IoChevronForwardSharp className='h-5 w-5 text-primary' />
					</View>
				)}

				{/* Dots */}
				{showDots && images.length > 1 && (
					<View className='pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center gap-1.5'>
						{images.map((_, index) => (
							<View
								key={index}
								className={`h-1.5 transition-all duration-300 ${
									index === currentSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/50'
								}`}
							/>
						))}
					</View>
				)}
			</View>
		</View>
	)
}

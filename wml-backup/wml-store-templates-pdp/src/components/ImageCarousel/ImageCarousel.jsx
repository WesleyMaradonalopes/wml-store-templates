import { Image, Text, View } from 'eitri-luminus'

import Eitri from 'eitri-bifrost'
import { useEffect, useRef, useState } from 'react'

import { BottomInset, SliderWithRef as Slider } from 'wml-store-templates-shared'

import CustomModal from '../CustomModal/CustomModal'

const MAIN_IMAGE_HEIGHT = 641

function withVtexHeight(imageUrl, height) {
	if (!imageUrl) return imageUrl

	return imageUrl.replace(/(\/ids\/\d+)-[^/?#]+-[^/?#]+/, `$1-auto-${height}`)
}

export default function ImageCarousel(props) {
	const carouselRef = useRef(null)
	const zoomCarouselRef = useRef(null)
	const [selectedImageIndex, setSelectedImageIndex] = useState(0)
	const { currentSku, isZoomModalOpen, setIsZoomModalOpen } = props
	const images = currentSku?.images || []
	const [currentSlide, setCurrentSlide] = useState(0)
	const [zoomCurrentSlide, setZoomCurrentSlide] = useState(0)

	useEffect(() => {
		setSelectedImageIndex(0)
		setCurrentSlide(0)
		setZoomCurrentSlide(0)
		setIsZoomModalOpen(false)
	}, [currentSku?.itemId])

	useEffect(() => {
		if (selectedImageIndex > images.length - 1) {
			setSelectedImageIndex(0)
		}
	}, [images.length, selectedImageIndex])

	useEffect(() => {
		if (!isZoomModalOpen || images.length === 0) {
			return
		}

		if (zoomCurrentSlide !== selectedImageIndex) {
			zoomCarouselRef.current?.goTo(selectedImageIndex)
		}
	}, [isZoomModalOpen, selectedImageIndex, zoomCurrentSlide, images.length])

	useEffect(() => {
		if (isZoomModalOpen || images.length === 0) {
			return
		}

		carouselRef.current?.goTo(selectedImageIndex)
	}, [selectedImageIndex, isZoomModalOpen, images.length])

	useEffect(() => {
		if (!isZoomModalOpen) {
			return
		}

		Eitri.navigation.addBackHandler(() => {
			setIsZoomModalOpen(false)
			return false
		})

		return () => {
			Eitri.navigation.clearBackHandlers()
		}
	}, [isZoomModalOpen])

	const handleThumbnailSelect = (index) => {
		setZoomCurrentSlide(index)
		setSelectedImageIndex(index)
		zoomCarouselRef.current?.goTo(index)
	}

	const openZoomModal = (index) => {
		setSelectedImageIndex(index)
		setIsZoomModalOpen(true)
	}

	const closeZoomModal = () => {
		setIsZoomModalOpen(false)
	}
	const getMainImageUrl = (imageUrl) => withVtexHeight(imageUrl, MAIN_IMAGE_HEIGHT)

	return (
		<>
			<View
				className='h-auto w-full'>
				<View className='relative'>
					<Slider
						ref={carouselRef}
						options={{
							loop: images.length > 1,
							slides: { perView: 1, spacing: 0 },
							renderMode: 'performance',
							slideChanged(slider) {
								const nextIndex = slider.track.details.rel
								setCurrentSlide(nextIndex)
								if (!isZoomModalOpen) {
									setSelectedImageIndex(nextIndex)
								}
							}
						}}
						autoPlay={false}
					>
						{images.map((item, index) => (
							<View
								key={item.imageUrl}
								className="flex h-[639px] min-h-[420px] max-h-[720px] items-center justify-center overflow-hidden">
								<Image
									fadeIn={500}
									src={getMainImageUrl(item.imageUrl)}
									zoomMaxScale={8}
									className="cursor-zoom-in h-full w-full object-cover"
									onClick={() => openZoomModal(index)}
								/>
							</View>
						))}
					</Slider>
					{images.length > 1 && (
						<View className="my-2 flex flex-row justify-center gap-1.5">
							{images.map((_, index) => (
								<View
									key={index}
									className={`h-1.5 bg-[#575756] transition-all duration-300 ${currentSlide === index ? 'w-8' : 'w-1.5'
										}`}
								/>
							))}
						</View>
					)}
				</View>
			</View>

			<CustomModal
				open={isZoomModalOpen}
				onClose={closeZoomModal}>
				<View
					onClick={(event) => event.stopPropagation()}
					className='relative flex h-full w-full flex-col bg-base-100'>
					<View
						topInset={'auto'}
						className='bg-base-100'
					/>

					<View className='flex h-14 w-full flex-row items-center justify-between border-b border-neutral-200 px-4'>
						<Text className='text-base font-medium text-neutral-900'>Zoom</Text>
						<View
							role='button'
							aria-label='Fechar zoom'
							onClick={closeZoomModal}
							className='z-30 flex h-[24px] w-[24px] cursor-pointer items-center justify-center bg-base-100'>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M20.4233 3.50009C20.4333 3.50011 20.4434 3.50213 20.4526 3.50595C20.4618 3.50979 20.47 3.51554 20.4771 3.52255C20.484 3.52948 20.4898 3.53766 20.4937 3.54697C20.4975 3.55622 20.4995 3.56632 20.4995 3.57626C20.4995 3.58623 20.4975 3.59627 20.4937 3.60556C20.4898 3.61491 20.484 3.62303 20.4771 3.62997L12.4614 11.6446L12.1079 11.9981L12.4614 12.3526L20.4761 20.3702C20.4903 20.3845 20.4985 20.4036 20.4985 20.4239C20.4985 20.4442 20.4903 20.4634 20.4761 20.4776C20.4618 20.4918 20.4425 20.5001 20.4224 20.5001C20.4022 20.5001 20.3829 20.4919 20.3687 20.4776L12.353 12.463L11.9995 12.1095L11.646 12.463L3.63037 20.4776C3.61605 20.4919 3.59594 20.5001 3.57568 20.5001C3.55551 20.5 3.53624 20.4919 3.52197 20.4776C3.50761 20.4633 3.49954 20.444 3.49951 20.4239C3.49951 20.4039 3.50764 20.3846 3.52197 20.3702L11.5386 12.3526L11.8921 11.9981L11.5386 11.6446L3.52295 3.62997C3.50855 3.61558 3.50049 3.59635 3.50049 3.57626C3.50051 3.55621 3.50858 3.53692 3.52295 3.52255C3.53725 3.50831 3.55646 3.50009 3.57666 3.50009C3.59687 3.50011 3.61607 3.50829 3.63037 3.52255L11.646 11.5372L11.9995 11.8907L12.353 11.5372L20.3696 3.52255C20.3767 3.51556 20.3848 3.50977 20.394 3.50595C20.4033 3.50212 20.4133 3.50009 20.4233 3.50009Z" fill="#0F0805" stroke="#0F0805" />
							</svg>
						</View>
					</View>

					<View className='relative z-10 flex flex-1 flex-col overflow-hidden bg-base-100'>
						<View className='flex-1 min-h-0'>
							<Slider
								ref={zoomCarouselRef}
								className='h-full'
								options={{
									loop: false,
									slides: { perView: 1, spacing: 0 },
									renderMode: 'performance',
									slideChanged(slider) {
										const nextIndex = slider.track.details.rel
										setZoomCurrentSlide(nextIndex)
										setSelectedImageIndex(nextIndex)
									}
								}}
								autoPlay={false}>
								{images.map((item) => {
									return (
										<View
											key={`zoom-${item.imageUrl}`}
											className='h-full w-full overflow-hidden'>
											<Image
												pinchZoom
												zoomMaxScale={8}
												src={item.imageUrl}
												className='h-full w-full object-cover'
											/>
										</View>
									)
								})}
							</Slider>
						</View>
					</View>

					{images.length > 1 && (
						<View className='relative z-20 w-full border-t border-neutral-200 bg-base-100 py-2'>
							<View className='mx-auto w-[376px] max-w-full overflow-x-auto px-3'>
								<View className='flex min-w-full w-max flex-row justify-center gap-2'>
									{images.map((item, index) => {
										const isSelected = selectedImageIndex === index

										return (
											<View
												key={`${item.imageUrl}-${index}`}
												role='button'
												aria-label={`Selecionar imagem ${index + 1}`}
												onClick={() => handleThumbnailSelect(index)}
												className={`h-24 w-20 shrink-0 cursor-pointer border-transparent overflow-hidden rounded-lg border-2 ${isSelected ? 'border-transparent' : 'opacity-50'
													}`}>
												<Image
													src={item.imageUrl}
													className='h-full w-full object-cover'
												/>
											</View>
										)
									})}
								</View>
							</View>
							<View className='mt-2 flex w-full flex-row justify-center gap-1.5'>
								{images.map((_, index) => (
									<View
										key={index}
										className={`h-1.5 bg-[#575756] transition-all duration-300 ${selectedImageIndex === index ? 'w-8' : 'w-1.5'
											}`}
									/>
								))}
							</View>
						</View>
					)}

					<View className='bg-base-100'>
						<BottomInset />
					</View>
				</View>
			</CustomModal>
		</>
	)
}

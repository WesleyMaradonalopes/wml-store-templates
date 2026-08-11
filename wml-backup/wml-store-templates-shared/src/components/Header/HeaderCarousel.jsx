import Eitri from 'eitri-bifrost'
import { HTMLRender, Image, View } from 'eitri-luminus'

import { useRef, useState } from 'react'

import chevronLeft from '../../assets/chevronLeft.svg'
import chevronRight from '../../assets/chevronRight.svg'
import CustomCarousel from '../CustomCarousel/CustomCarousel'

// TODO: Receber conteúdo do CMS
const HEADER_CAROUSEL_SLIDES = [
	{
		text: 'Últimos dias: <strong>LEVE 3, PAGUE 2*</strong> CUECAS. Aproveite!',
		path: 'ProductCatalog',
		state: { params: { fq: 'C:1000002' }, title: 'Masculino - Leve 3 Pague 2' },
	},
	{
		text: '<strong>Calcinhas essenciais</strong> para os seus dias a partir de <strong>R$ 19,90*</strong>',
		path: 'ProductCatalog',
		state: { params: { fq: 'C:1000001' }, title: 'Calcinhas' },
	},
	{
		text: '<strong>FRETE GRÁTIS</strong> a partir de R$ 249 | Cupom 1ª compra: <strong>PRIMEIRACOMPRA</strong> para 10% OFF*',
		path: 'ProductCatalog',
		state: { params: {}, title: 'Todos os produtos' },
	},
]

export default function HeaderCarousel() {
	const carouselRef = useRef(null)
	const [currentSlide, setCurrentSlide] = useState(0)

	const handleSlidePress = (slide) => {
		if (slide?.path) {
			Eitri.navigation.navigate({
				path: slide.path,
				state: slide.state || {},
			})
		}
	}

	return (
		<View className='relative bg-black'>
			<View className='relative h-11 overflow-hidden'>
				<CustomCarousel
					ref={carouselRef}
					autoPlay={true}
					interval={5000}
					loop={true}
					onSlideChange={(i) => setCurrentSlide(i)}>
					{HEADER_CAROUSEL_SLIDES.map((slide, index) => (
						<View
							key={index}
							onClick={() => handleSlidePress(slide)}
							className='flex min-h-11 w-full flex-shrink-0 items-center justify-center px-4'>
							<HTMLRender
								className='text-center text-xs font-medium text-white'
								html={slide.text}
							/>
						</View>
					))}
				</CustomCarousel>
				{HEADER_CAROUSEL_SLIDES.length > 1 && (
					<>
						<View
							role='button'
							aria-label='Slide anterior'
							onClick={(e) => {
								e.stopPropagation()
								carouselRef.current?.goPrev()
							}}
							className='absolute left-0 top-0 z-10 flex h-11 w-10 cursor-pointer items-center justify-center'>
							<Image
								className='h-3 w-3'
								src={chevronLeft}
							/>
						</View>
						<View
							role='button'
							aria-label='Próximo slide'
							onClick={(e) => {
								e.stopPropagation()
								carouselRef.current?.goNext()
							}}
							className='absolute right-0 top-0 z-10 flex h-11 w-10 cursor-pointer items-center justify-center'>
							<Image
								className='h-3 w-3'
								src={chevronRight}
							/>
						</View>
					</>
				)}
			</View>
		</View>
	)
}

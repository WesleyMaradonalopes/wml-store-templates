import { View } from 'eitri-luminus'
import { useCallback, useEffect } from 'react'

import ProductCard from '../../ProductCard/ProductCard'
import { HIDE_SCROLLBAR_CLASS, HIDE_SCROLLBAR_STYLE } from '../../../utils/hideScrollbar'

const CAROUSEL_ID = 'shelf-carousel-peek'

export default function ShelfOfProductsCarousel(props) {
	const { isLoading, products } = props
	const [currentSlide, setCurrentSlide] = useState(0)

	const cardGap = 8

	const handleScroll = useCallback(() => {
		const el = document.getElementById(CAROUSEL_ID)
		if (!el || !products?.length) return

		const cardWidth = el.clientWidth * 0.75 + cardGap
		const index = Math.round(el.scrollLeft / cardWidth)
		const clamped = Math.max(0, Math.min(index, products.length - 1))

		if (clamped !== currentSlide) {
			setCurrentSlide(clamped)
		}
	}, [products, currentSlide])

	useEffect(() => {
		const el = document.getElementById(CAROUSEL_ID)
		if (!el) return

		el.addEventListener('scroll', handleScroll, { passive: true })
		return () => el.removeEventListener('scroll', handleScroll)
	}, [handleScroll])

	if (isLoading) {
		return (
			<View className={`flex overflow-x-auto ${HIDE_SCROLLBAR_CLASS}`} style={HIDE_SCROLLBAR_STYLE}>
				<View className='flex gap-2 px-4 py-2'>
					<View className='mt-2 h-[388px] min-w-[75vw] animate-pulse rounded bg-gray-200' />
				</View>
			</View>
		)
	}

	return (
		<>
			<View
				id={CAROUSEL_ID}
				className={`flex overflow-x-auto ${HIDE_SCROLLBAR_CLASS}`}
				style={{
					...HIDE_SCROLLBAR_STYLE,
					scrollSnapType: 'x mandatory',
				}}>
				{products?.map((product, index) => (
					<View
						key={product.productId}
						className='flex-shrink-0 pl-4'
						style={{
							width: '75vw',
							scrollSnapAlign: 'start',
							marginLeft: index === 0 ? 16 : 0,
							marginRight: index === products.length - 1 ? 16 : cardGap,
						}}>
						<ProductCard product={product} />
					</View>
				))}
			</View>

			{/* Dots */}
			{products?.length > 1 && (
				<View className='mt-2 flex justify-center gap-1.5'>
					{products.map((_, index) => (
						<View
							key={index}
							className={`h-1.5 bg-[#575756] transition-all duration-300 ${
								currentSlide === index ? 'w-8' : 'w-1.5'
							}`}
						/>
					))}
				</View>
			)}
		</>
	)
}

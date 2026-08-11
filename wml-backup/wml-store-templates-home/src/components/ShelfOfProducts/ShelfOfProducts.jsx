import { Text, View } from 'eitri-luminus'
import Eitri from 'eitri-bifrost'

import ShelfOfProductsCarousel from './components/ShelfOfProductsCarousel'
import ShelfOfProductsSlider from './components/ShelfOfProductsSlider'

export default function ShelfOfProducts(props) {
	const { products, title, isLoading, mode, searchParams, ...rest } = props

	return (
		<View className='flex flex-col gap-2 py-2'>
			{mode === 'carousel' && (
				<ShelfOfProductsCarousel
					isLoading={isLoading}
					products={products}
				/>
			)}

			{mode !== 'carousel' && (
				<ShelfOfProductsSlider
					isLoading={isLoading}
					products={products}
				/>
			)}
		</View>
	)
}

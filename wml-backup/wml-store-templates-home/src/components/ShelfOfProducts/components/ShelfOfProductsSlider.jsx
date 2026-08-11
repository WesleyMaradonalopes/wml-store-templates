import { View } from 'eitri-luminus'

import ProductCard from '../../ProductCard/ProductCard'

export default function ShelfOfProductsSlider(props) {
	const { isLoading, products } = props

	return (
		<>
			{isLoading ? (
				<View className='flex overflow-x-auto'>
					<View className='flex gap-4 px-4 py-2'>
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
					</View>
				</View>
			) : (
				<View className='relative'>
					<View className='flex overflow-x-auto'>
						<View className='flex gap-4 px-4 py-2'>
							{products.map((product) => (
								<ProductCard
									key={product.productId}
									product={product}
									className='w-60'
								/>
							))}
						</View>
					</View>
				</View>
			)}
		</>
	)
}

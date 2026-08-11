import { Text, View, Skeleton } from 'eitri-luminus'
import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import { Loading } from 'wml-store-templates-shared'

import ProductCard from '../ProductCard/ProductCard'
import ShelfOfProductsCarousel from './components/ShelfOfProductsCarousel'
export default function ShelfOfProducts(props) {
	const { products, title, gap, paddingHorizontal, isLoading, mode, searchParams, ...rest } = props
	const { t } = useTranslation()
	const seeMore = () => {
		Eitri.navigation.navigate({
			path: 'ProductCatalog',
			state: {
				params: searchParams,
				title: title,
			},
		})
	}
	return (
		<View>
			{title && (
				<View className={`flex items-center justify-between pl-4 px-${paddingHorizontal || '36'}`}>
					<Text className='text-lg font-bold'>{isLoading ? t('shelfOfProducts.loading') : title}</Text>
					{searchParams && (
						<View
							onClick={seeMore}
							className='flex min-w-fit items-center'>
							<Text className='font-bold text-primary-content'>{t('shelfOfProducts.seeMore')}</Text>
							<View>
								{/* <Icon iconKey="chevron-right" color="primary-900" width={18} height={18} /> */}
							</View>
						</View>
					)}
				</View>
			)}
			{mode === 'carousel' && (
				<ShelfOfProductsCarousel
					paddingHorizontal={paddingHorizontal}
					isLoading={isLoading}
					products={products}
					gap={gap}
				/>
			)}
			{mode !== 'carousel' && (
				<View className={`scroll-snap-x-mandatory flex flex-row overflow-x-scroll gap-${gap}`}>
					{gap && <View className={`h-[1px] w-[${gap}px]`} />}
					{isLoading && (
						<View className={`flex flex-row justify-center gap-2 px-4`}>
							<Skeleton className='min-h-[288px] w-[188px] bg-neutral'></Skeleton>
							<Skeleton className='min-h-[288px] w-[188px] bg-neutral'></Skeleton>
						</View>
					)}
					{!isLoading &&
						products &&
						products.map((product) => (
							<View
								key={product?.productId}
								className={`scroll-snap-start ml-[${gap}px]`}>
								<ProductCard
									product={product}
									width='188px'
								/>
							</View>
						))}
					{gap && <View className={`h-[1px] w-[${gap}px]`} />}
				</View>
			)}
		</View>
	)
}

import { useTranslation } from 'eitri-i18n'

import { searchProductsByFq, getProductById } from '../../services/productService'
import ProductCard from '../ProductCard/ProductCard'

export default function RelatedProducts(props) {
	const { product } = props
	const { t } = useTranslation()
	const [relatedProducts, setRelatedProducts] = useState(null)
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		if (!product) return
		loadRelatedProducts(product?.productId)
	}, [product])

	const loadRelatedProducts = async (productId) => {
	try {
		setIsLoading(true)

		const buildCategoryPath = (tree) => {
			const path = tree.map(category => category?.id).join('/')
			return tree.length === 1 ? `${path}/` : path
		}

		const shuffleArray = (arr) => {
			for (let i = arr.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1))

				;[arr[i], arr[j]] = [arr[j], arr[i]]
			}
			return arr
		}

		const enrichProducts = async (products) => {
			const detailedProducts = await Promise.all(
				products.map(async (item) => {
					try {
						return await getProductById(item.productId)
					} catch (error) {
						console.error(
							`Erro ao buscar produto ${item.productId}`,
							error
						)
						return null
					}
				})
			)

			return detailedProducts.filter(Boolean)
		}

		let categoryTree = product?.categoryTree ?? []

		let categoryPath = buildCategoryPath(categoryTree)
		let relatedProducts = await searchProductsByFq([`C:${categoryPath}`])

		const availableRelatedProducts = relatedProducts?.filter((rp) => {
			return rp.items.some((i) =>
				i.sellers.some(
					(s) => s.commertialOffer.AvailableQuantity > 0
				)
			)
		})

		const filteredData = availableRelatedProducts?.filter(
			(item) => item?.productId !== product?.productId
		)

		if (filteredData.length < 4) {
			categoryTree = categoryTree.slice(0, -1)
			categoryPath = buildCategoryPath(categoryTree)

			const responseRetry = await searchProductsByFq([
				`C:${categoryPath}`
			])

			const filteredDataRetry = responseRetry.filter(
				(item) => item.productId !== product?.productId
			)

			const detailedProducts = await enrichProducts(
				shuffleArray(filteredDataRetry)
			)

			setRelatedProducts(detailedProducts)
		} else {
			const detailedProducts = await enrichProducts(
				shuffleArray(filteredData)
			)

			setRelatedProducts(detailedProducts)
		}

		return relatedProducts
	} catch (e) {
		console.error('loadRelatedProducts: Error', e)
	} finally {
		setIsLoading(false)
	}
}

	if (!relatedProducts && !isLoading) return null

	return (
		<View className='mt-4'>
			<View className='px-4 pb-2'>
				<Text className="font-serif text-[22px] font-normal leading-[26px] tracking-normal text-[#0F0805]">
					{t('productBasicTemplate.txtWhoSaw')}
				</Text>
			</View>

			{isLoading ? (
				<View className='flex overflow-x-auto overflow-y-hidden'>
					<View className='flex gap-4 px-4 py-2'>
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
					</View>
				</View>
			) : (
				<ShelfOfProductsCarousel
					isLoading={isLoading}
					products={relatedProducts}
				/>
			)}
		</View>

		// <ShelfOfProductsCarousel
		// 	paddingHorizontal={paddingHorizontal}
		// 	isLoading={isLoading}
		// 	products={products}
		// 	gap={gap}
		// />

		// <ShelfOfProducts
		// 	title={t('productBasicTemplate.txtWhoSaw')}
		// 	mode='carousel'
		// 	products={relatedProducts}
		// />
	)
}

import { searchProductsByFq, getProductById } from '../../services/ProductService'
import ProductCard from '../ProductCard/ProductCard'

export default function CategoryProducts(props) {
	const { categoryId, categoryIds } = props
	const [relatedProducts, setRelatedProducts] = useState(null)
	const [isLoading, setIsLoading] = useState(false)

	const normalizedCategoryIds = Array.isArray(categoryIds)
		? categoryIds
		: categoryId
			? [categoryId]
			: []

	useEffect(() => {
		if (!normalizedCategoryIds.length) return
		loadProducts(normalizedCategoryIds)
	}, [normalizedCategoryIds.join('-')])

	const loadProducts = async (ids) => {
		try {
			setIsLoading(true)

			const buildCategoryPath = (tree) => {
				if (!tree?.length) return ''
				const path = tree.join('/')
				return tree.length === 1 ? `${path}/` : path
			}

			const shuffleArray = (arr) => {
				const shuffled = [...arr]
				for (let i = shuffled.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1))
					;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
				}
				return shuffled
			}

			const enrichProducts = async (products) => {
				const detailedProducts = await Promise.all(
					products.map(async (item) => {
						try {
							return await getProductById(item.productId)
						} catch (error) {
							console.error(`Erro ao buscar produto ${item.productId}`, error)
							return null
						}
					}),
				)

				return detailedProducts.filter(Boolean)
			}

			let categoryPath = buildCategoryPath(ids)
			let products = await searchProductsByFq([`C:${categoryPath}`])

			const availableProducts = (products || []).filter((rp) =>
				rp.items?.some((item) =>
					item.sellers?.some((seller) => seller.commertialOffer?.AvailableQuantity > 0),
				),
			)

			if (availableProducts.length < 4 && ids.length > 1) {
				const idsExceptLast = ids.slice(0, -1)
				categoryPath = buildCategoryPath(idsExceptLast)
				products = await searchProductsByFq([`C:${categoryPath}`])
			}

			const detailedProducts = await enrichProducts(shuffleArray(products || []))
			setRelatedProducts(detailedProducts)
		} catch (e) {
			console.error('loadRelatedProducts: Error', e)
			setRelatedProducts([])
		} finally {
			setIsLoading(false)
		}
	}

	if (!relatedProducts && !isLoading) return null
	if (!isLoading && (!relatedProducts || relatedProducts.length === 0)) return null

	return (
		<View className='mt-4'>
			{isLoading ? (
				<View className='flex overflow-x-auto'>
					<View className='flex gap-4 px-4 py-2'>
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
						<View className='mt-2 h-[388px] min-w-[50vw] animate-pulse rounded bg-gray-200' />
					</View>
				</View>
			) : (
				<View className='flex overflow-x-auto'>
					<View className='flex gap-4 py-2'>
						{relatedProducts.map((product) => (
							<ProductCard
								key={product.productId}
								product={product}
								className='min-w-[50vw]'
							/>
						))}
					</View>
				</View>
			)}
		</View>
	)
}

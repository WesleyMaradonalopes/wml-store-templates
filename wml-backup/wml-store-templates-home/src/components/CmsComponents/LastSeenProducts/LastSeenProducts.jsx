import Eitri from 'eitri-bifrost'

import { getProductById } from '../../../services/ProductService'
import ShelfOfProducts from '../../ShelfOfProducts/ShelfOfProducts'
export default function LastSeenProducts(props) {
	const { data } = props
	const [products, setProducts] = useState([])
	const [isLoading, setIsLoading] = useState([])
	useEffect(() => {
		loadLastSeenProducts()
	}, [])
	const loadLastSeenProducts = async () => {
		try {
			setIsLoading(true)
			const result = await Eitri.sharedStorage.getItemJson('last-seen-products')
			if (!result || result.length === 0) return
			const _products = await Promise.all(
				result.slice(0, 8).map(async (item) => {
					const cachedProduct = products.find((product) => product.id === item.productId)
					if (cachedProduct) return Promise.resolve(cachedProduct)
					return await getProductById(item.productId)
				}),
			)
			setProducts(_products.filter((product) => !!product))
			setIsLoading(false)
		} catch (error) {
			setIsLoading(false)
		}
	}
	if (!products || products.length === 0) return null
	return (
		<ShelfOfProducts
			mode={data?.mode || 'carousel'}
			title={data?.title}
			products={products}
			isLoading={isLoading}
		/>
	)
}

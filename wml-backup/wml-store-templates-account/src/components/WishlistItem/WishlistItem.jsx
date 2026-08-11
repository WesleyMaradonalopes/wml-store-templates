import { getProductById } from '../../services/ProductService'
import ProductCard from '../ProductCard/ProductCard'

export default function WishlistItem(props) {
	const { productId, key } = props

	const [product, setProduct] = useState(null)

	useEffect(() => {
		init()
	}, [productId])

	const init = async () => {
		try {
			const product = await getProductById(productId)
			setProduct(product)
		} catch (e) {
			console.error('Erro ao buscar produto', e)
		}
	}
	if(!product) {
		return null
	}
	return <View key={key}><ProductCard product={product} /></View>
}

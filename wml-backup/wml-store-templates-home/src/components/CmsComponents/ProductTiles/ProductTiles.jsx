import { Text, View } from 'eitri-luminus'

import { getProductsService } from '../../../services/ProductService'
import ShelfOfProducts from '../../ShelfOfProducts/ShelfOfProducts'

export default function ProductTiles(props) {
	const { data } = props
	const [shelves, setShelves] = useState([])
	const [currentShelf, setCurrentShelf] = useState({})
	const [currentProducts, setCurrentProducts] = useState([])
	const [isLoadingProducts, setIsLoadingProducts] = useState(false)
	const [cachedProducts, setCachedProducts] = useState({})

	useEffect(() => {
		if (data?.shelves) {
			setShelves(data.shelves)
			setCurrentShelf(data.shelves[0])
		}
	}, [data])

	useEffect(() => {
		executeProductSearch(currentShelf)
	}, [currentShelf])

	const executeProductSearch = async (shelf) => {
		try {
			if (cachedProducts[shelf.title]) {
				setCurrentProducts(cachedProducts[shelf.title])
				return
			}

			setIsLoadingProducts(true)

			const params = {
				facets: shelf.facets || [],
				query: shelf.term ?? '',
				sort: shelf.sort ?? '',
				to: shelf.numberOfItems || 8,
			}

			const result = await getProductsService(params)

			setCurrentProducts(result.products)
			setIsLoadingProducts(false)
			setCachedProducts({
				...cachedProducts,
				[shelf.title]: result.products,
			})
		} catch (e) {
			console.error('executeProductSearch.error', e)
		}
	}

	const onChooseShelf = (shelf) => {
		setCurrentShelf(structuredClone(shelf))
	}

	return (
		<View>
			{data?.title && (
				<View className='px-4 py-2'>
					<Text className='font-bold'>{data?.title}</Text>
				</View>
			)}
			<View className='mb-1 flex gap-2 overflow-x-auto px-4'>
				{shelves?.map((shelf) => (
					<View
						key={shelf.title}
						onClick={() => onChooseShelf(shelf)}
						className={`min-w-fit rounded border px-3 py-1 ${
							shelf.title === currentShelf.title ? 'border-primary' : 'border-neutral-400'
						}`}>
						<Text className={`${shelf.title === currentShelf.title ? 'text-primary' : 'text-neutral-400'}`}>
							{shelf.title}
						</Text>
					</View>
				))}
			</View>
			<ShelfOfProducts
				mode={data.mode || 'scroll'}
				isLoading={isLoadingProducts}
				products={currentProducts}
			/>
		</View>
	)
}

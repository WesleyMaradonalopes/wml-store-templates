import ProductCatalogContent from '../../ProductCatalogContent/ProductCatalogContent'

export default function ProductInfiniteScroll(props) {
	const { data } = props

	const [params, setParams] = useState(null)

	useEffect(() => {
		const params = {
			facets: data.facets || [],
			query: data.term ?? '',
			sort: data.sort ?? '',
		}
		setParams(data)
	}, [])

	return (
		<View>
			{data?.title && (
				<View className='flex items-center justify-between px-4'>
					<Text className='text-xl font-bold'>{data?.title}</Text>
				</View>
			)}
			<ProductCatalogContent
				params={params}
				hideFilters
			/>
		</View>
	)
}

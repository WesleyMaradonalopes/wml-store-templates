import { getTopSearches } from '../../services/CatalogService'

export default function TopSearches(props) {
	const { onSubmit, ...rest } = props

	const [searches, setSearches] = useState([])

	useEffect(() => {
		getTopSearches()
			.then((res) => {
				const searches = res?.searches
				setSearches(searches)
			})
			.catch((err) => {})
	}, [])

	return (
		<View
			backgroundColor='accent-100'
			padding='large'
			{...rest}>
			<Text
				fontWeight='bold'
				fontSize='small'>
				Mais buscados
			</Text>
			<View
				display='flex'
				flexWrap='wrap'
				gap={8}
				marginTop='small'>
				{searches?.map((search) => (
					<View
						key={search?.term}
						borderRadius='pill'
						borderWidth='hairline'
						width='fit-content'
						padding='nano'
						paddingHorizontal='small'
						onClick={() => onSubmit(search?.term)}>
						<Text fontWeight='bold'>{search?.term}</Text>
					</View>
				))}
			</View>
		</View>
	)
}

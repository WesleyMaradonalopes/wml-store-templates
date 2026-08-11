import { getSearchHistory } from '../../services/CatalogService'
import iconClock from '../../assets/icons/clock.svg'
import iconLinkGrey from '../../assets/icons/link_grey.svg'

export default function SearchHistory(props) {
	const { onSubmit, ...rest } = props

	const [history, setHistory] = useState([])

	useEffect(() => {
		getSearchHistory()
			.then((res) => setHistory(res))
			.catch((err) => {})
	}, [])

	if (!history?.length) return null

	return (
		<View
			backgroundColor='accent-100'
			padding='large'
			{...rest}>
			<Text
				fontWeight='bold'
				fontSize='small'>
				Buscas recentes
			</Text>
			<View
				marginTop='large'
				direction='column'
				gap={8}>
				{history.map((term) => (
					<View
						key={term}
						display='flex'
						justifyContent='between'
						alignItems='center'
						onClick={() => onSubmit(term)}>
						<View
							display='flex'
							alignItems='center'
							height='24px'
							gap={8}>
							<Image
								src={iconClock}
								width={20}
							/>
							<Text fontSize='extra-small'>{term}</Text>
						</View>
						<Image
							src={iconLinkGrey}
							width={12}
						/>
					</View>
				))}
			</View>
		</View>
	)
}

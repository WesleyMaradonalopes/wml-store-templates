import { Text, View } from 'eitri-luminus'

import { Vtex } from 'eitri-shopping-vtex-shared'

import { autocompleteSuggestions } from '../../services/ProductService'

let timeoutId
let skipSuggestion = false

export default function SearchInput(props) {
	const { onSubmit, incomingValue } = props

	const [searchTerm, setSearchTerm] = useState(incomingValue || '')
	const [searchSuggestion, setSearchSuggestion] = useState([])

	const legacySearch = Vtex?.configs?.searchOptions?.legacySearch

	useEffect(() => {
		if (incomingValue) {
			setSearchTerm(incomingValue)
		}
	}, [incomingValue])

	const debounce = (func, delay) => {
		return function (...args) {
			clearTimeout(timeoutId)
			timeoutId = setTimeout(() => func.apply(this, args), delay)
		}
	}

	const fetchSuggestions = async (value) => {
		try {
			if (!value) {
				setSearchSuggestion([])
				return
			}
			const result = await autocompleteSuggestions(value)
			if (skipSuggestion) {
				setSearchSuggestion([])
				return
			}
			setSearchSuggestion(result?.searches)
		} catch (error) {
			console.log('Entrada de pesquisa', 'Erro ao buscar sugestão', error)
		}
	}

	const handleAutocomplete = async (value) => {
		setSearchTerm(value)

		if (legacySearch) {
			return
		}

		const debouncedFetchSuggestions = debounce(fetchSuggestions, 400)
		debouncedFetchSuggestions(value)
	}

	const handleSearch = (suggestion) => {
		console.log('suggestion===>', suggestion)
		if (timeoutId) {
			clearTimeout(timeoutId)
		}
		setSearchSuggestion([])
		if (typeof onSubmit === 'function') onSubmit(suggestion)
		skipSuggestion = true
	}

	const onBlurHandler = () => {
		setTimeout(() => {
			if (timeoutId) {
				clearTimeout(timeoutId)
			}
			setSearchSuggestion([])
			skipSuggestion = true
		}, 200)
	}

	const handleInputChange = (e) => {
		const value = e.target.value
		skipSuggestion = false
		handleAutocomplete(value)
	}

	const handleOnKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleSearch(searchTerm)
		}
	}

	return (
		<View>
			<View className='flex h-10 items-center rounded-full bg-neutral-100 px-4'>
				<View>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						width='24'
						height='24'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'
						className='text-header-content'>
						<circle
							cx='11'
							cy='11'
							r='8'></circle>
						<line
							x1='21'
							y1='21'
							x2='16.65'
							y2='16.65'></line>
					</svg>
				</View>
				<View>
					<TextInput
						autoFocus={true}
						type={'text'}
						value={searchTerm}
						onChange={handleInputChange}
						onKeyPress={handleOnKeyPress}
						onBlur={onBlurHandler}
						placeholder={'Pesquisar...'}
						className='w-full border-none !bg-transparent px-2 shadow-none focus:outline-none'
					/>
				</View>
				{searchTerm && (
					<View
						onClick={() => setSearchTerm('')}
						className=''>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							width='24'
							height='24'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='text-header-content'>
							<line
								x1='18'
								y1='6'
								x2='6'
								y2='18'></line>
							<line
								x1='6'
								y1='6'
								x2='18'
								y2='18'></line>
						</svg>
					</View>
				)}
			</View>
			{searchSuggestion && searchSuggestion.length > 0 && (
				<View className='absolute left-0 w-full p-4'>
					<View className='flex w-full flex-col gap-4 rounded bg-white p-4 shadow'>
						{searchSuggestion.map((suggestion, key) => (
							<View
								onClick={() => handleSearch(suggestion.term)}
								key={suggestion.term}>
								<Text className='font-bold text-primary'>{suggestion.term}</Text>
							</View>
						))}
					</View>
				</View>
			)}
		</View>
	)
}

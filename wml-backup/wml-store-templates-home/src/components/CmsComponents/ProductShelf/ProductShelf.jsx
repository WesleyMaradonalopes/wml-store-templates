import { Text, View } from 'eitri-luminus'
import { useMemo } from 'react'
import Eitri from 'eitri-bifrost'

import { getProductsService } from '../../../services/ProductService'
import ShelfOfProducts from '../../ShelfOfProducts/ShelfOfProducts'

export default function ProductShelf(props) {
	const { data } = props

	const tabs = useMemo(() => data?.tabs || [], [data])

	const hasTabs = tabs.length > 1

	const [selectedTab, setSelectedTab] = useState(data?.defaultTabIndex || 0)
	const [currentProducts, setCurrentProducts] = useState([])
	const [isLoadingProducts, setIsLoadingProducts] = useState(false)
	const [searchParams, setSearchParams] = useState()

	useEffect(() => {
		executeProductSearch(selectedTab)
	}, [selectedTab])

	const getActiveConfig = (tabIndex) => {
		if (!hasTabs) {
			return { facets: data.facets, term: data.term, sort: data.sort }
		}
		const tab = tabs[tabIndex] || tabs[0]
		return { facets: tab.facets, term: tab.term, sort: tab.sort }
	}

	const executeProductSearch = async (tabIndex = 0) => {
		setIsLoadingProducts(true)

		const config = getActiveConfig(tabIndex)
		const params = {
			facets: config.facets || [],
			query: config.term ?? '',
			sort: config.sort ?? '',
			to: data.numberOfItems || 8,
		}

		const result = await getProductsService(params)

		if (result) {
			setCurrentProducts(result.products)
			setSearchParams({ facets: config?.facets, ...params })
		}
		setIsLoadingProducts(false)
	}

	const seeMore = () => {
		const config = getActiveConfig(hasTabs ? selectedTab : null)
		Eitri.navigation.navigate({
			path: 'ProductCatalog',
			state: {
				params: {
					facets: config.facets || [],
					query: config.term ?? '',
					sort: config.sort ?? '',
				},
				title: hasTabs ? tabs[selectedTab]?.label : data?.title,
			},
		})
	}

	return (
		<View className='flex flex-col'>
			{/* Title + "Ver tudo" visível */}
			{data?.title && (
				<View className='flex items-center justify-between px-4'>
					<Text className='font-serif text-[22px]'>
						{isLoadingProducts ? 'Carregando...' : data?.title}
					</Text>
					<View onClick={seeMore}>
						<Text className='text-sm font-medium underline'>Ver tudo</Text>
					</View>
				</View>
			)}

			{/* Pills */}
			{hasTabs && (
				<View className='flex overflow-x-auto px-4 pt-2 pb-1'>
					<View className='flex gap-2'>
						{tabs.map((tab, index) => (
							<View
								key={tab.label || index}
								onClick={() => setSelectedTab(index)}
								className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors ${index === selectedTab
									? 'bg-primary text-white'
									: 'bg-transparent text-primary border border-black'
									}`}>
								<Text>{tab.label}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			<ShelfOfProducts
				mode={data.mode || 'scroll'}
				title={data?.title}
				isLoading={isLoadingProducts}
				products={currentProducts}
				searchParams={searchParams}
			/>
		</View>
	)
}

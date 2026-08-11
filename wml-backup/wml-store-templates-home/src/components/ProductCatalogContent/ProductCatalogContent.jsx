import { View } from 'eitri-luminus'

import React, { useEffect, useState, useCallback } from 'react'

import { getProductsService } from '../../services/ProductService'
import { getCorrectionSearch } from '../../services/CatalogService'
import SearchResults from '../../components/PageSearchComponents/SearchResults'
import CatalogSort from './Components/CatalogSort'
import CatalogFilterSort from './Components/CatalogFilterSort'
import { getDefaultSortParam } from '../../services/helpers/resolveSortParam'
import CatalogFilter from './Components/CatalogFilter'
import InfiniteScroll from '../InfiniteScroll/InfiniteScroll'
import useDebounced from '../../hooks/utils/useDebounced'
import { trackViewItemList } from '../../services/TrackingService'

const ProductCatalogContent = React.memo(function ProductCatalogContent(props) {
	const { params, hideFilters, isSearch, banner, ...rest } = props

	const [productLoading, setProductLoading] = useState(false)
	const [products, setProducts] = useState([])
	const [totalProducts, setTotalProducts] = useState(0)
	const [appliedFacets, setAppliedFacets] = useState([]) // Filtros efetivamente usados na busca
	const [currentPage, setCurrentPage] = useState(1)
	const [pagesHasEnded, setPageHasEnded] = useState(false)

	const [minPriceRange, setMinPriceRange] = useState(null)
	const [maxPriceRange, setMaxPriceRange] = useState(null)
	const [correction, setCorrection] = useState(null)

	useEffect(() => {
		if (params) {
			// Criar uma cópia limpa dos parâmetros para evitar mutação
			const initialParams = getInitialParams()

			setAppliedFacets(initialParams)
			setProducts([])
			setPageHasEnded(false)
			setCurrentPage(1)

			loadProducts(initialParams, 1)

			// Busca correção ortográfica para o termo
			if (params?.query && isSearch) {
				getCorrectionSearch(params.query)
					.then((corrected) => {
						if (corrected && corrected.toLowerCase() !== params.query.toLowerCase()) {
							setCorrection(corrected)
							console.log(`Correção ortográfica sugerida: ${corrected}`)
						} else {
							console.log(`Correção ortográfica sugerida é igual ao termo original ou não existe: ${corrected}`)
							setCorrection(null)
						}
					})
					.catch(() => setCorrection(null))
			} else {
				setCorrection(null)
			}
		}
	}, [params])

	// Normaliza os parâmetros iniciais
	const getInitialParams = useCallback(() => {
		if (!params) return null

		const sort = params.sort

		return {
			...params,
			...(sort ? { sort } : {}),
			facets: Array.isArray(params.facets) ? params.facets : [],
		}
	}, [params])

	const getProducts = async (selectedFacets, page, force = false) => {
		try {
			if (!force && pagesHasEnded) return

			// Validar parâmetros antes de fazer a requisição
			if (!selectedFacets || typeof selectedFacets !== 'object') {
				console.error('Invalid selectedFacets provided to getProducts')
				setProductLoading(false)
				return
			}

			setProductLoading(true)

			const result = await getProductsService(selectedFacets, page)

			if (result?.products?.length === 0) {
				setProductLoading(false)
				setPageHasEnded(true)
				return
			}

			const loadedProducts = page === 1 ? result.products.length : products.length + result.products.length

			setPageHasEnded(loadedProducts > result.recordsFiltered)
			setProducts((prev) => (page === 1 ? result.products : [...prev, ...result.products]))

			const listName = selectedFacets.query ? `Busca ${selectedFacets.query}` : getTitleByFacets(selectedFacets.facets) || 'Catalogo'
			trackViewItemList(listName, result.products)
			setTotalProducts(result?.recordsFiltered)
			setCurrentPage(page)
			setProductLoading(false)
		} catch (error) {
			console.error('Error loading products', error)
			setProductLoading(false)
		}
	}

	const getTitleByFacets = (facets) => {
		if (!facets || facets.length === 0) return ''
		const values = facets.map(facet => facet.value)
		return values.join(' ')
	}

	const debouncedGetProducts = useDebounced(getProducts, isSearch ? 300 : 0)

	const loadProducts = (selectedFacets, page, force = false) => {
		setProductLoading(true)
		debouncedGetProducts(selectedFacets, page, force)
	}

	const onScrollEnd = async () => {
		if (!productLoading && !pagesHasEnded) {
			const newPage = currentPage + 1
			loadProducts(appliedFacets, newPage)
		}
	}

	const handleSortChange = (newSort) => {
		const newParams = {
			...appliedFacets,
			sort: newSort,
		}
		setAppliedFacets(newParams)
		setProducts([])
		setCurrentPage(1)
		setPageHasEnded(false)
		loadProducts(newParams, 1, true)
	}

	const handleFilterChange = (filters) => {
		setAppliedFacets(filters)
		setProducts([])
		setCurrentPage(1)
		setPageHasEnded(false)
		loadProducts(filters, 1, true)
	}

	const handleCorrectionClick = () => {
		if (!correction) return
		const correctedParams = {
			...appliedFacets,
			query: correction,
		}
		setCorrection(null)
		handleFilterChange(correctedParams)
	}

	const onFilterClear = (sortToApply = appliedFacets?.sort || getDefaultSortParam()) => {
		const initialFilters = getInitialParams()
		handleFilterChange({
			...initialFilters,
			sort: sortToApply,
		})
	}

	return (
		<View {...rest}>
			{banner && (
				<Image
					src={banner}
					className='w-full object-cover'
				/>
			)}

			{products.length > 0 && !hideFilters && (
				<>
					{correction && (
						<View className='mt-4 px-4 py-4 mx-4 bg-white rounded-2xl border border-[#EFEDEA] cursor-pointer flex items-center mb-8'>
							<Text className='text-[18px] text-[#1E120D] font-serif'>
								Você quis dizer <Text className='italic'>{correction}</Text>?
							</Text>
						</View>
					)}
					<View className='grid w-full grid-cols-2 gap-4'>
						<View className='flex flex-col gap-1 px-4 pt-4 min-w-0'>
							<Text className='text-xl font-regular text-primary capitalize font-serif'>
								{correction || appliedFacets?.query || getTitleByFacets(appliedFacets?.facets) || 'Catálogo'}
							</Text>
							<Text className='text-sm text-[#1E120D]'>
								{totalProducts > 0
									? `${totalProducts} ${totalProducts === 1 ? 'peça' : 'peças'}`
									: ''}
							</Text>
						</View>

						<View className='flex w-full items-center p-2 min-w-[157px]'>
							<CatalogFilterSort
								minPriceRange={minPriceRange}
								setMinPriceRange={setMinPriceRange}
								maxPriceRange={maxPriceRange}
								setMaxPriceRange={setMaxPriceRange}
								currentFilters={appliedFacets}
								currentSort={appliedFacets?.sort}
								onFilterChange={handleFilterChange}
								onFilterClear={onFilterClear}
								onSortChange={handleSortChange}
								totalProducts={totalProducts}
							/>
						</View>
					</View>
				</>
			)}

			<InfiniteScroll onScrollEnd={onScrollEnd}>
				<SearchResults
					isLoading={productLoading}
					searchResults={products}
					searchTerm={appliedFacets?.query}
					onTermClick={(term) => {
						handleFilterChange({
							...appliedFacets,
							query: term,
						})
					}}
				/>
			</InfiniteScroll>
		</View>
	)
})

export default ProductCatalogContent

import { Vtex } from 'eitri-shopping-vtex-shared'

import { CMS_PRODUCT_SORT } from '../utils/Constants'
import { resolveSortParam } from './helpers/resolveSortParam'

export const autocompleteSuggestions = async (value) => {
	return await Vtex.catalog.autoCompleteSuggestions(value)
}

/*
 * {
 *  facets: Array<{ key: string, value: string }>
 *  query: string
 *  sort: string
 * }
 *
 * */

export const getProductsService = async (params, page) => {

	const PAGE_SIZE = 12

	// Validar se params está presente e é um objeto válido
	if (!params || typeof params !== 'object') {
		return null
	}

	// Validar se facets é um array válido quando presente
	if (params.facets && !Array.isArray(params.facets)) {
		return null
	}

	let from = params?.from || 1
	let to = page?.to || PAGE_SIZE

	if (page) {
		from = (page - 1) * PAGE_SIZE + 1
		to = page * PAGE_SIZE
	}

	// Garantir que selectedFacets seja um array válido ou null
	const selectedFacets = Array.isArray(params?.facets) ? params.facets : null

	const orderBy = params?.sort ? resolveSortParam(params.sort, true) : null

	const options = {
		fullText: params?.query || params?.q || '',
		selectedFacets: selectedFacets,
		...(orderBy ? { orderBy } : {}),
		from: from,
		to: to,
		hideUnavailableItems: true,
		options: {
			allowRedirect: false,
		},
	}

	// Remover propriedades undefined/null que podem causar problemas no GraphQL
	Object.keys(options).forEach((key) => {
		if (options[key] === undefined || options[key] === null) {
			delete options[key]
		}
	})
	const result = await Vtex.searchGraphql.productSearch(options)

	if (result?.products?.length === 0) {
		return getProductsServiceRest(params, page)
	}

	return result
}

export const getProductsServiceRest = async (params, page) => {
	const facetsPath = params?.facets?.map((facet) => `${facet.key}/${facet.value}`).join('/')
	const options = {
		query: params?.query || params?.q || '',
		page: page ?? 1,
		sort: resolveSortParam(params.sort),
	}
	if (params?.count) {
		options.count = params.count
	}

	return await Vtex.catalog.getProductsByFacets(facetsPath, options)

}

export const getProductsFacetsService = async (params) => {
	// Validar se params está presente e é um objeto válido

	if (!params || typeof params !== 'object') {
		throw new Error('Invalid parameters provided to getProductsFacetsService')
	}

	// Garantir que selectedFacets seja um array válido ou null
	const selectedFacets = Array.isArray(params?.facets) ? params.facets : null

	const options = {
		fullText: params?.query || params?.q || '',
		selectedFacets: selectedFacets,
		hideUnavailableItems: true,
	}

	// Remover propriedades undefined que podem causar problemas no GraphQL
	Object.keys(options).forEach((key) => {
		if (options[key] === undefined) {
			delete options[key]
		}
	})

	const result = await Vtex.searchGraphql.facets(options)

	if (result?.facets?.length === 0) {
		return getProductsFacetsServiceRest(params)
	}

	// Validar e garantir estrutura do resultado
	if (!result || typeof result !== 'object') {
		return { facets: [] }
	}

	// Garantir que facets seja sempre um array
	if (!Array.isArray(result.facets)) {
		return { facets: [] }
	}

	return result
}

export const getProductsFacetsServiceRest = async (params) => {
	const facetsPath = params?.facets?.map((facet) => `${facet.key}/${facet.value}`).join('/')
	const options = {
		query: params?.query || params?.q || '',
	}

	return await Vtex.catalog.getPossibleFacets(facetsPath, options)
}

const formatPriceRangeFacet = (facetQueryResult) => {
	return facetQueryResult.facets.map((facet) => {
		if (facet.type === 'PRICERANGE') {
			return {
				...facet,
				values: facet.values.map((value) => {
					return {
						...value,
						name: `De ${value?.range?.from?.toLocaleString('pt-br', {
							style: 'currency',
							currency: 'BRL',
						})} à ${value.range.to.toLocaleString('pt-br', {
							style: 'currency',
							currency: 'BRL',
						})}`,
						value: `${value.range.from}:${value.range.to}`,
					}
				}),
			}
		} else {
			return facet
		}
	})
}

export const getProductById = async (productId) => {
	return await Vtex.searchGraphql.product({
		identifier: { field: 'id', value: productId },
	})
}

export const getProductReleaseDateById = async (productId) => {
	if (!productId) return null

	try {
		const response = await Vtex.http.get(
			`/api/catalog_system/pub/products/search/?fq=productId:${encodeURIComponent(productId)}`,
			{},
			Vtex.configs.api,
		)

		const products = Array.isArray(response) ? response : response?.data
		const product = Array.isArray(products) ? products[0] : null

		return product?.ReleaseDate || product?.releaseDate || null
	} catch (error) {
		console.error('Error fetching product releaseDate from catalog:', error)
		return null
	}
}

export const getSameColorProducts = async (product) => {
	if (!product) throw new Error('Product is required')

	const { items = [] } = product
	const { complementName } = items.find((item) => item.complementName) ?? {}

	if (!complementName) return []

	const response = await Vtex.searchGraphql.productSearch({
		fullText: complementName,
		hideUnavailableItems: true,
	})

	const { products = [] } = response ?? {}

	const { productId } = product ?? {}
	const filteredProducts = products.reduce((acc, currentProduct) => {
		if (acc.some((p) => p.productId === currentProduct.productId)) return acc
		if (currentProduct.productId === productId) return acc

		const { items = [] } = currentProduct ?? {}

		// Para redundância de segurança
		const hasAllItems = items.every((item) => item.complementName === complementName)
		if (!hasAllItems) return acc

		return [...acc, currentProduct]
	}, [])

	return filteredProducts
}

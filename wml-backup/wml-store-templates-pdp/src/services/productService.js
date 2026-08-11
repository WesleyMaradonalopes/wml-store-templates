import Eitri from 'eitri-bifrost'

import { Vtex } from 'eitri-shopping-vtex-shared'

export const getProductById = async (productId) => {
	return Vtex.searchGraphql.product({
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

export const getProductBySlug = async (slug) => {
	return Vtex.searchGraphql.product({
		identifier: { field: 'slug', value: slug },
	})
}

export const getWhoSawAlsoSaw = async (productId) => {
	return Vtex.searchGraphql.productRecommendations({
		identifier: { field: 'id', value: productId },
		type: 'view',
	})
}

export const getProductsByIds = async (productIds) => {
	const promises = productIds.map((productId) => {
		return getProductById(productId)
	})

	return Promise.all(promises)
}

export const getSimilarProductsIds = async (productId) => {
	if (!productId) return []

	const similars = await Vtex.catalog.getSimilarProducts(productId)

	if (!similars) return []

	const ids = similars.reduce((acc, similar) => {
		if (acc.includes(similar.productId)) return acc
		if (similar.productId === productId) return acc

		return [...acc, similar.productId]
	}, [])

	return ids
}

export const getSimilarProducts = async (productId) => {
	if (!productId) return []

	const ids = await getSimilarProductsIds(productId)

	const similarProducts = await getProductsByIds(ids)

	return similarProducts
}

export const markLastViewedProduct = async (product) => {
	const key = `last-seen-products`

	const productHistory = await Eitri.sharedStorage.getItemJson(key)

	if (productHistory) {
		const prevContentIndex = productHistory.findIndex((content) => content.productId === product.productId)
		if (prevContentIndex === 0) {
			return
		}
		if (prevContentIndex !== -1) {
			productHistory.splice(prevContentIndex, 1)
			productHistory.unshift({ productId: product.productId, date: new Date().toISOString() })
		} else {
			productHistory.unshift({ productId: product.productId, date: new Date().toISOString() })
		}
		await Eitri.sharedStorage.setItemJson(key, productHistory.slice(0, 14))
	} else {
		await Eitri.sharedStorage.setItemJson(key, [{ productId: product.productId, date: new Date().toISOString() }])
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

export const searchProductsByFq = async (fqFilters, { from = 0, to = 9, orderBy } = {}) => {
	if (!fqFilters?.length) return []
	const fqPart = fqFilters.map((f) => `fq=${encodeURIComponent(f)}`).join('&')
	const rangePart = `&_from=${from}&_to=${to}`
	const orderPart = orderBy ? `&orderBy=${encodeURIComponent(orderBy)}` : ''
	try {
		console.log('searchProductsByFq-pdp', `${fqPart}${rangePart}${orderPart}`)
		return (await Vtex.catalog.legacyParamsSearch(`${fqPart}${rangePart}${orderPart}`)) || []
	} catch {
		return []
	}
}

export const openLink = (link, inApp = true) => {
	Eitri.openBrowser({
		url: link,
		inApp,
	})
}

export const getProductKit = async (id) => {
	try {
		const product = await Vtex.searchGraphql.product(
			{
				identifier: { field: 'id', value: id }
			},
			`{
				items {
				itemId
				kitItems {
					itemId
					amount
					product {
						productId
						productName
					}
					sku {
						name
						nameComplete
						complementName
						variations {
							originalName
							name
							values
						}
						images {
							imageUrl
						}
						sellers {
							sellerId
							sellerName
							sellerDefault
							commertialOffer {
								Price
								ListPrice
								PriceWithoutDiscount
								spotPrice
								RewardValue
								PriceValidUntil
								AvailableQuantity
								discountHighlights {
									name
								}
							}
						}
					}
				}
			}
		}`
		)
		return product
	} catch (e) {
		console.error("Erro ao buscar kit", e)
	}

}

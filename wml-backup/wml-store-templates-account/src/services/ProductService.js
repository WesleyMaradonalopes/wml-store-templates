import { Vtex } from 'eitri-shopping-vtex-shared'

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

export const searchProductsByFq = async (fqFilters, { from = 0, to = 9, orderBy } = {}) => {
	if (!fqFilters?.length) return []

	const fqPart = fqFilters.map((filter) => `fq=${encodeURIComponent(filter)}`).join('&')
	const rangePart = `&_from=${from}&_to=${to}`
	const orderPart = orderBy ? `&orderBy=${encodeURIComponent(orderBy)}` : ''

	try {
		return (await Vtex.catalog.legacyParamsSearch(`${fqPart}${rangePart}${orderPart}`)) || []
	} catch {
		return []
	}
}

import { useState, useEffect } from 'react'

import { getSimilarProducts } from '../../services/productService'

export function useSimilarsProducts(product, sortBy = 'Cor', includeCurrentProduct = true) {
	const [products, setProducts] = useState([])

	const loadProducts = async () => {
		if (!product) return []

		const similarProducts = await getSimilarProducts(product.productId)
		const allProducts = includeCurrentProduct ? [...similarProducts, product] : similarProducts
		const sortedSimilarProducts = allProducts.sort((a, b) => {
			const aValue = a.properties.find((property) => property.name === sortBy)?.values?.[0] ?? ''
			const bValue = b.properties.find((property) => property.name === sortBy)?.values?.[0] ?? ''
			return aValue?.localeCompare(bValue) ?? 0
		})

		setProducts(sortedSimilarProducts)
	}

	useEffect(() => {
		loadProducts(product)
	}, [product])

	return products
}

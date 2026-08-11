import { useState, useEffect } from 'react'

import { getSameColorProducts } from '../../services/ProductService'

export const useSameColorProducts = (product, sortBy = 'Cor', includeCurrentProduct = true) => {
	const [products, setProducts] = useState([])

	const loadProducts = async () => {
		const sameColorProducts = await getSameColorProducts(product)
		const products = includeCurrentProduct ? [...sameColorProducts, product] : sameColorProducts

		const sortedProducts = products.sort((a, b) => {
			const aValue = a?.properties?.find((property) => property.name === sortBy)?.values?.[0] ?? ''
			const bValue = b?.properties?.find((property) => property.name === sortBy)?.values?.[0] ?? ''
			return aValue?.localeCompare(bValue) ?? 0
		})

		setProducts(sortedProducts)
	}

	useEffect(() => {
		loadProducts()
	}, [product])

	return products
}

import { useState, useEffect } from 'react'

import { getProductById, getProductKit, searchProductsByFq } from '../../services/productService'

const MAX_CANDIDATES = 10
const MAX_KIT_CANDIDATES = 30
const CONJUNTO_CATEGORY_FQ = 'C:163'

// Produtos nessas categorias sugerem apenas outros produtos da mesma categoria.
const CATEGORY_MAP = {
	'/Conjuntos/': '163',
	'/Meias/': '46/186/190',
	'/Sutiãs/': '2',
	'/Calcinhas/': '1',
}

// IDs das 3 categorias de acessórios — buscados em sequência quando o produto for um acessório.
const ACCESSORY_CATEGORY_IDS = new Set(['230', '186', '227'])

function isAccessoryProduct(product) {
	return ACCESSORY_CATEGORY_IDS.has(String(product?.categoryId))
}

async function hasKitItems(productId) {
	try {
		const data = await getProductKit(productId)
		return data?.items?.some((item) => item.kitItems?.length > 0) ?? false
	} catch {
		return false
	}
}

function getProductFilters(product) {
	const { properties = [], categories = [] } = product
	const color = properties.find((p) => p.name === 'Cor em Atributo de Produto')?.values?.[0]
	const collection = properties.find((p) => p.name === 'Coleção')?.values?.[0]
	const gender = properties.find((p) => p.name === 'Gênero')?.values?.[0]
	// O VTEX retorna caminhos completos (ex: /Roupas/Conjuntos/), então usamos endsWith
	// para cobrir tanto caminhos parciais (/Conjuntos/) quanto completos.
	const matchedCategoryKey = Object.keys(CATEGORY_MAP).find((key) =>
		categories.some((cat) => cat === key || cat.endsWith(key)),
	)
	const categoryFq = matchedCategoryKey ? `C:${CATEGORY_MAP[matchedCategoryKey]}` : null
	return { color, collection, gender, categoryFq }
}

function dedupeAgainst(candidates, currentProductId, accumulated) {
	return (candidates || [])
		.filter((p) => p?.productId && p.productId !== currentProductId)
		.filter((p) => !accumulated.some((a) => a.productId === p.productId))
}

// Para produtos kit, busca diretamente na categoria Conjuntos com pool maior,
// porque os filtros de atributo retornam peças avulsas que nunca passam pelo hasKitItems.
async function collectKitCandidates(product) {
	const { gender } = getProductFilters(product)
	const currentProductId = product.productId
	let accumulated = []

	const strategies = [
		...(gender ? [[`specificationFilter_99:${gender}`, CONJUNTO_CATEGORY_FQ]] : []),
		[CONJUNTO_CATEGORY_FQ],
	]

	for (const fqFilters of strategies) {
		if (accumulated.length >= MAX_KIT_CANDIDATES) break
		const results = await searchProductsByFq(fqFilters, { from: 0, to: 29 })
		accumulated = [...accumulated, ...dedupeAgainst(results, currentProductId, accumulated)]
	}

	return accumulated
}

async function collectCandidates(product) {
	const { color, collection, gender, categoryFq } = getProductFilters(product)
	const currentProductId = product.productId

	// Para acessórios, busca em cada categoria separadamente (VTEX não suporta OR em fq=C:).
	// Para os demais, usa uma única categoria (ou nenhuma).
	const categoryFqList = isAccessoryProduct(product)
		? [...ACCESSORY_CATEGORY_IDS].map((id) => `C:${id}`)
		: [categoryFq]

	let accumulated = []

	for (const fq of categoryFqList) {
		if (accumulated.length >= MAX_CANDIDATES) break

		const withCategory = (filters) => [...filters.filter(Boolean), ...(fq ? [fq] : [])]

		const strategies = [
			withCategory([
				gender && `specificationFilter_99:${gender}`,
				collection && `specificationFilter_46:${collection}`,
				color && `specificationFilter_45:${color}`,
			]),
			withCategory([
				gender && `specificationFilter_99:${gender}`,
				collection && `specificationFilter_46:${collection}`,
			]),
			withCategory([
				gender && `specificationFilter_99:${gender}`,
				color && `specificationFilter_45:${color}`,
			]),
			withCategory([collection && `specificationFilter_46:${collection}`]),
			withCategory([color && `specificationFilter_45:${color}`]),
		]

		for (const fqFilters of strategies) {
			if (accumulated.length >= MAX_CANDIDATES || !fqFilters.length) continue
			const results = await searchProductsByFq(fqFilters)
			accumulated = [...accumulated, ...dedupeAgainst(results, currentProductId, accumulated)]
		}
	}

	if (accumulated.length < MAX_CANDIDATES && gender) {
		for (const fq of categoryFqList) {
			if (accumulated.length >= MAX_CANDIDATES) break
			const fqFilters = [`specificationFilter_99:${gender}`, ...(fq ? [fq] : [])]
			const results = await searchProductsByFq(fqFilters, { from: 0, to: 10, orderBy: 'OrderByTopSaleDESC' })
			accumulated = [...accumulated, ...dedupeAgainst(results, currentProductId, accumulated)]
		}
	}

	return accumulated
}

export function useBuyTogetherProducts(product) {
	const [products, setProducts] = useState([])

	useEffect(() => {
		if (!product?.productId) return

		const load = async () => {
			const isCurrentKit = await hasKitItems(product.productId)
			const isCurrentAccessory = isAccessoryProduct(product)

			const candidates = isCurrentKit
				? await collectKitCandidates(product)
				: await collectCandidates(product)

			const valid = []

			for (const p of candidates) {
				if (valid.length >= 2) break
				try {
					const full = await getProductById(p.productId)
					if (!full) continue

					// Quando o produto atual é um kit/conjunto, sugerir apenas outros kits
					if (isCurrentKit && !(await hasKitItems(p.productId))) continue

					// Quando o produto atual é um acessório, sugerir apenas outros acessórios
					if (isCurrentAccessory && !isAccessoryProduct(full)) continue

					const hasAvailable = full.items?.some(
						(item) => item.sellers?.[0]?.commertialOffer?.AvailableQuantity > 0,
					)
					if (hasAvailable) valid.push(full)
				} catch {
					// skip unavailable or failed candidates
				}
			}

			setProducts(valid)
		}

		load()
	}, [product?.productId])

	return products
}

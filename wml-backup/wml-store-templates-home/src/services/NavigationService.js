import Eitri from 'eitri-bifrost'

export const openCart = async () => {
	try {
		Eitri.nativeNavigation.open({
			slug: 'cart',
		})
	} catch (e) {
		console.error('Erro ao navegar para o carrinho', e)
	}
}

export const openAccount = async (action) => {
	Eitri.nativeNavigation.open({
		slug: 'account',
		initParams: { action },
	})
}

export const openProduct = async (product) => {
	try {
		Eitri.nativeNavigation.open({
			slug: 'pdp',
			initParams: { product },
		})
	} catch (e) {
		console.error('navigate to PDP: Error trying to open PDP', e)
	}
}

export const openProductById = async (productId) => {
	try {
		Eitri.nativeNavigation.open({
			slug: 'pdp',
			initParams: { productId },
		})
	} catch (e) {
		console.error('navigate to PDP: Error trying to open PDP', e)
	}
}

export const openProductBySlug = async (slug) => {
	try {
		Eitri.nativeNavigation.open({
			slug: 'pdp',
			initParams: { slug },
		})
	} catch (e) {
		console.error('navigate to PDP: Error trying to open PDP', e)
	}
}

const getPathAndSearch = (path) => {
	const decodedPath = decodeURIComponent(path || '')

	try {
		const url = new URL(decodedPath)
		return `${url.pathname}${url.search}`
	} catch (_) {
		return decodedPath
	}
}

export const normalizePath = (path) => {
	let pathComponents = getPathAndSearch(path).split('?')
	let pathData = pathComponents[0].split('/').filter(Boolean)
	let queryParams = new URLSearchParams(pathComponents[1])
	let normalizedData = { facets: [] }

	if (queryParams.has('map')) {
		let mapKeys = queryParams.get('map').split(',')
		pathData.forEach((value, index) => {
			if (mapKeys[index] === 'ft') {
				normalizedData.query = value
			} else {
				normalizedData.facets.push({
					key: mapKeys[index],
					value: value,
				})
			}
		})
	} else {
		// Handle paths without 'map' query param
		pathData.forEach((value, index) => {
			normalizedData.facets.push({
				key: `category-${index + 1}`,
				value: value,
			})
		})
	}

	for (let [key, value] of queryParams.entries()) {
		if (key !== 'map') {
			normalizedData[key] = value
		}
	}

	return normalizedData
}

export const resolveNavigation = (path, title) => {
	const normalizedPath = normalizePath(path)
	Eitri.navigation.navigate({ path: 'ProductCatalog', state: { params: normalizedPath, title: title || '' } })
}

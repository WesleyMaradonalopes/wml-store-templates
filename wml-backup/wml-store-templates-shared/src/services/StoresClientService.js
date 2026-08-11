import Eitri from 'eitri-bifrost'

const CACHE = new Map()

const BASELINE_TTL_MS = 24 * 60 * 60 * 1000
const SEARCH_TTL_MS = 10 * 60 * 1000

const DEFAULT_VTEX_BASE_URL = 'https://lojabl.myvtex.com'
const STORES_PATH = '/api/dataentities/OS/search?_fields=phone,city,name,address,state,country,is_franchise,whatsapp_link'

const isPrimitiveStore = (store) => !!store && typeof store === 'object'

const normalizeStore = (store, index) => ({
	id: store?.id || store?.storeId || store?.pickupPointId || `store-${index + 1}`,
	name: store?.name || store?.friendlyName || store?.title || '',
	address: store?.address || store?.street || store?.formattedAddress || '',
	city: store?.city || store?.address?.city || '',
	state: store?.state || store?.address?.state || '',
	country: store?.country || store?.address?.country || '',
	isFranchise: Boolean(store?.is_franchise),
	phone: store?.phone || store?.telephone || '',
	whatsappLink: store?.whatsapp_link || '',
	hours: store?.hours || store?.businessHours || store?.openingHours || '',
	mapUrl: store?.mapUrl || store?.url || store?.mapsUrl || '',
})

const resolveVtexBaseUrl = () => {
	const normalizedBase = DEFAULT_VTEX_BASE_URL.endsWith('/')
		? DEFAULT_VTEX_BASE_URL.slice(0, -1)
		: DEFAULT_VTEX_BASE_URL

	if (!normalizedBase.startsWith('http')) {
		return `https://${normalizedBase}`
	}

	return normalizedBase
}

const extractPayloadArray = (payload) => {
	if (Array.isArray(payload)) {
		return payload
	}

	if (!payload || typeof payload !== 'object') {
		return []
	}

	const candidates = [
		payload?.stores,
		payload?.items,
		payload?.results,
		payload?.pickupPoints,
		payload?.pickup_points,
		payload?.data,
	]

	for (const item of candidates) {
		if (Array.isArray(item)) {
			return item
		}
	}

	return []
}

const getStoresEndpoint = (remoteConfig) => {
	const vtexBaseUrl = resolveVtexBaseUrl()
	return `${vtexBaseUrl}${STORES_PATH}`
}

const getCacheKey = ({ zipcode, latitude, longitude }) => {
	const zipKey = zipcode || ''
	const latKey = latitude ?? ''
	const lngKey = longitude ?? ''
	return `stores:${zipKey}:${latKey}:${lngKey}`
}

const buildUrlWithQuery = (baseUrl, { zipcode, latitude, longitude }) => {
	const url = new URL(baseUrl)

	if (zipcode) {
		url.searchParams.set('zipCode', zipcode)
		url.searchParams.set('postalCode', zipcode)
	}

	if (latitude !== undefined && longitude !== undefined) {
		url.searchParams.set('geoCoordinates', `${longitude},${latitude}`)
	}

	return url.toString()
}

const fetchStoresFromEndpoint = async (endpoint, params) => {
	const url = buildUrlWithQuery(endpoint, params)
	const response = await Eitri.http.get(url)
	const payload = response?.data
	const stores = extractPayloadArray(payload)

	if (!Array.isArray(stores)) {
		return []
	}

	return stores.filter(isPrimitiveStore)
}

const getTtl = ({ zipcode, latitude, longitude }) => {
	if (zipcode || (latitude !== undefined && longitude !== undefined)) {
		return SEARCH_TTL_MS
	}

	return BASELINE_TTL_MS
}

const getCachedStores = (key) => {
	const cached = CACHE.get(key)
	if (!cached) {
		return null
	}

	if (Date.now() > cached.expiresAt) {
		CACHE.delete(key)
		return null
	}

	return cached.value
}

const saveCachedStores = (key, value, ttlMs) => {
	CACHE.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export const invalidateStoresCache = () => {
	CACHE.clear()
}

export const getStoresFromVtexApi = async (params = {}) => {
	const requestParams = {
		zipcode: params?.zipcode || '',
		latitude: params?.latitude,
		longitude: params?.longitude,
	}

	try {
		if (typeof Eitri.isOnline === 'function') {
			const online = await Eitri.isOnline()
			if (online === false) {
				return {
					ok: false,
					data: [],
					source: 'api',
					errorCode: 'STORES_OFFLINE',
				}
			}
		}

		const cacheKey = getCacheKey(requestParams)
		const cached = getCachedStores(cacheKey)
		if (cached) {
			return cached
		}

		const remoteConfig = await Eitri.environment.getRemoteConfigs()
		const endpoint = getStoresEndpoint(remoteConfig)
		const stores = await fetchStoresFromEndpoint(endpoint, requestParams)
		const normalizedStores = stores.map(normalizeStore).filter((store) => store.name || store.address)
		const responsePayload = {
			ok: true,
			data: normalizedStores,
			source: 'api',
			errorCode: normalizedStores.length === 0 ? 'STORES_EMPTY' : null,
			endpoint,
		}

		saveCachedStores(cacheKey, responsePayload, getTtl(requestParams))
		return responsePayload
	} catch (error) {
		console.error('Error loading stores from VTEX API', error)
		return {
			ok: false,
			data: [],
			source: 'api',
			errorCode: 'STORES_FETCH_FAILED',
		}
	}
}

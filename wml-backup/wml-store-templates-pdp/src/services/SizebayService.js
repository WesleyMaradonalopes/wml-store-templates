import Eitri from 'eitri-bifrost'

const SIZEBAY_SESSION_ID = 'sizebay_session_id'
const STORE_ID = 865

const delay = async (ms) => {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

const setStorageItem = async (key, item) => {
	const remoteConfig = await Eitri.environment.getRemoteConfigs()
	const account = remoteConfig.providerInfo.account
	const _key = `${account}_${key}`
	return Eitri.sharedStorage.setItem(_key, item)
}

const getStorageItem = async (key) => {
	const remoteConfig = await Eitri.environment.getRemoteConfigs()
	const account = remoteConfig.providerInfo.account
	const _key = `${account}_${key}`
	return Eitri.sharedStorage.getItem(_key)
}

export const getSession = async () => {
	let sessionId = await getStorageItem(SIZEBAY_SESSION_ID)
	if (sessionId) {
		return sessionId
	}

	return getNewSession()
}

export const getNewSession = async (attempt = 0) => {
	if (attempt > 3) {
		return null
	}

	try {
		const url = 'https://vfr-v3-production.sizebay.technology/api/me/session-id'
		const response = await Eitri.http.get(url)

		if (response?.data) {
			setStorageItem(SIZEBAY_SESSION_ID, response.data)
			return response.data
		}
		return null
	} catch (e) {
		console.error('Error getting session', e)
		await delay(1000)
		return getNewSession(attempt + 1)
	}
}

export const getProductInformation = async (permalink, sizesInStock) => {
	const remoteConfig = await Eitri.environment.getRemoteConfigs()
	const rawStoreId = remoteConfig?.providerInfo?.sizebayStoreId ?? STORE_ID
	const storeId = rawStoreId != null ? String(rawStoreId) : ''

	if (!storeId) {
		return null
	}

	const sessionId = await getSession()
	if (!sessionId) {
		return null
	}

	const host = remoteConfig.providerInfo.domain.startsWith('http')
		? remoteConfig.providerInfo.domain
		: `https://${remoteConfig.providerInfo.domain}`
	permalink = host + (permalink.startsWith('/') ? permalink : '/' + permalink)

	const url = `https://vfr-v3-production.sizebay.technology/plugin/my-product-id?sid=${sessionId}&permalink=${permalink}`
	const headers = {
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'x-szb-country': 'BR',
			'x-szb-device': 'mobile',
			'x-szb-tenant-id': storeId,
		},
	}

	const response = await Eitri.http.get(url, headers)

	if (response?.data) {
		const info = response.data

		if (info.id) {
			sizesInStock = sizesInStock || []

			const linkChart = `https://vfr-v3-production.sizebay.technology/V4/?mode=chart&id=${info.id}&sid=${sessionId}&tenantId=${storeId}&watchOpeningEvents=true&lang=br&countryValue=BR&disableCloseApp=true&sizesInStock=${sizesInStock.join(',')}`

			let linkVFR = ''
			if (!info?.accessory && !info?.shoe) {
				linkVFR = `https://vfr-v3-production.sizebay.technology/V4/?mode=vfr&id=${info.id}&sid=${sessionId}&tenantId=${storeId}&watchOpeningEvents=true&lang=br&countryValue=BR&disableCloseApp=true&sizesInStock=${sizesInStock.join(',')}`
			}

			const completeResponse = { ...response.data, linkChart, linkVFR }
			return completeResponse
		}
	}

	return null
}

/**
 * Recomendação de tamanho após o fluxo do VFR (PDP).
 */
export const getRecommendationAnalysis = async (sizebayProductId) => {
	if (!sizebayProductId) return null

	const remoteConfig = await Eitri.environment.getRemoteConfigs()
	const rawStoreId = remoteConfig?.providerInfo?.sizebayStoreId ?? STORE_ID
	const storeId = rawStoreId != null ? String(rawStoreId) : ''

	if (!storeId) return null

	const sessionId = await getSession()
	if (!sessionId) return null

	const query = new URLSearchParams({
		sid: sessionId,
		tenant: String(storeId),
		'page-recommendation': 'false',
		sizeHint: 'false',
	})

	const url = `https://vfr-v3-production.sizebay.technology/api/me/analysis/${encodeURIComponent(
		sizebayProductId,
	)}?${query.toString()}`

	const headers = {
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'x-szb-country': 'BR',
			'x-szb-device': 'mobile',
			'x-szb-tenant-id': storeId,
		},
	}

	const response = await Eitri.http.get(url, headers)
	return response?.data ?? null
}

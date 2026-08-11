import Eitri from 'eitri-bifrost'
import { Vtex } from 'eitri-shopping-vtex-shared'

export const getCustomerData = async () => {
	try {
		const isLogged = await Vtex.customer.isLoggedIn()
		if (!isLogged) return null
		const result = await Vtex.customer.getCustomerProfile()
		return result?.data?.profile
	} catch (e) {
		return null
	}
}

export const requestLogin = () => {
	return new Promise(async (resolve, reject) => {
		if (await isLoggedIn()) {
			resolve()
			return
		}

		Eitri.nativeNavigation.open({
			slug: 'account',
			initParams: { action: 'RequestLogin', closeAppAfterLogin: true },
		})

		Eitri.navigation.addOnResumeListener(async () => {
			if (await isLoggedIn()) {
				resolve()
			} else {
				reject('User not logged in')
			}
		})
	})
}

export const isLoggedIn = async () => {
	try {
		return await Vtex.customer.isLoggedIn()
	} catch (e) {
		console.error('Erro ao buscar dados do cliente', e)
		return false
	}
}

export async function sendAccessKeyByEmail(email) {
	return await Vtex.customer.sendAccessKeyByEmail(email)
}

export async function loginWithEmailAndKey(email, verificationCode) {
	return await Vtex.customer.loginWithEmailAndAccessKey(email, verificationCode)
}

const PENDING_GENDER_KEY = 'checkout_pending_gender'

export const saveGenderLocally = async (email, gender) => {
	try {
		const payload = JSON.stringify({ email, gender })
		await Eitri.storage.setItem(PENDING_GENDER_KEY, payload)
		const verify = await Eitri.storage.getItem(PENDING_GENDER_KEY)
	} catch (e) {
		console.error('[saveGenderLocally] erro:', e)
	}
}

export const syncPendingGender = async () => {
	try {
		const stored = await Eitri.storage.getItem(PENDING_GENDER_KEY)

		if (!stored) {
			return
		}

		const { email, gender } = JSON.parse(stored)

		const user = await getUserFromMasterdata(email)

		if (!user?.id) {
			return
		}

		await updateCustomerGender(user.id, gender)
		await Eitri.storage.removeItem(PENDING_GENDER_KEY)
	} catch (e) {
		console.error('[syncPendingGender] erro:', e)
	}
}

export const updateCustomerGender = async (id, gender) => {
	try {
		const remoteConfig = await Eitri.environment.getRemoteConfigs()
		const host = remoteConfig.providerInfo.host.startsWith('http')
			? remoteConfig.providerInfo.host
			: `https://${remoteConfig.providerInfo.host}`
		const url = `${host}/_v/api/masterdata/user/${id}/${gender}`
		await Eitri.http.patch(url)
	} catch (e) {
		console.error('[updateCustomerGender] erro ao salvar gender:', e)
	}
}

export const getUserFromMasterdata = async (email) => {
	try {
		const remoteConfig = await Eitri.environment.getRemoteConfigs()
		const host = remoteConfig.providerInfo.host.startsWith('http') ? remoteConfig.providerInfo.host : `https://${remoteConfig.providerInfo.host}`
		const url = `${host}/_v/api/masterdata/user/email=${encodeURIComponent(email)}`
		const response = await Eitri.http.get(url)
		const data = response?.data
		return Array.isArray(data) ? data[0] : data
	} catch (e) {
		console.error('getUserFromMasterdata error', e)
		return null
	}
}
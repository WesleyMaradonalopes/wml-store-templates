import Eitri from 'eitri-bifrost'

import { Vtex } from 'eitri-shopping-vtex-shared'

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

export const productOnWishlist = async (productId) => {
	if (!(await isLoggedIn())) {
		return { inList: false }
	}
	const result = await Vtex.wishlist.checkItem(productId)
	const inList = result?.data?.checkList?.inList
	if (inList) {
		const listId = result?.data?.checkList?.listIds?.[0]
		return { inList, listId }
	} else {
		return { inList }
	}
}

export const removeItemFromWishlist = async (id) => {
	return await Vtex.wishlist.removeItem(id)
}

export const addToWishlist = async (productId, title, sku) => {
	await requestLogin()
	return await Vtex.wishlist.addItem(productId, title, sku)
}

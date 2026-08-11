import Eitri from 'eitri-bifrost'

import { Vtex } from 'eitri-shopping-vtex-shared'

export const isLoggedIn = async () => {
	return Vtex.customer.isLoggedIn()
}

export const requestLogin = () => {
	return new Promise((resolve, reject) => {
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

export const closeEitriApp = () => {
	Eitri.navigation.close()
}

export const goHome = () => {
	Eitri.exposedApis.appState.goHome()
}

export const openAccount = async () => {
	try {
		Eitri.nativeNavigation.open({
			slug: 'account',
			initParams: { route: 'OrderList' },
		})
	} catch (e) {
		console.error('navigate to cart: Error trying to open cart', e)
	}
}

export const openCart = async () => {
	try {
		Eitri.nativeNavigation.open({
			slug: 'cart',
			replace: true,
		})
	} catch (e) {
		console.error('navigate to cart: Error trying to open cart', e)
	}
}

export const navigate = (path, state = {}, replace = false) => {
	Eitri.navigation.navigate({ path, state, replace })
}

export const navigateBack = () => {
	Eitri.navigation.back()
}

export const navigateToProduct = (productId) => {
	Eitri.nativeNavigation.open({
		slug: 'pdp',
		initParams: { productId },
	})
}

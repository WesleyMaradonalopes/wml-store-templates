import Eitri from 'eitri-bifrost'

export const PAGES = {
	HOME: '/Home',
	SIGNIN: '/SignIn',
	SIGNUP: '/SignUp',
	PASSWORD_RESET: '/PasswordReset',
	PASSWORD_RESET_CODE: '/PasswordResetCode',
	PASSWORD_RESET_NEW_PASS: '/PasswordResetNewPass',
	LOGIN: '/Login/Login',
	EDIT_PROFILE: '/EditProfile',
	ORDER_LIST: '/OrderList',
	ORDER_DETAILS: '/OrderDetails',
	WISH_LIST: '/WishList',
	RETURNS_EXCHANGES: '/ReturnsExchanges',
	STORES: '/Stores',
	COUPONS: '/Coupons',
	PRIVACY_POLICY: '/PrivacyPolicy',
	POINTS: '/Points',
}

export const openProduct = async (product) => {
	try {
		Eitri.nativeNavigation.open({
			slug: 'pdp',
			initParams: { product },
		})
	} catch (e) {
		console.error('navigate to cart: Error trying to open product', e)
	}
}

export const navigate = (page, state = {}, replace = false) => {
	return Eitri.navigation.navigate({ path: page, state, replace })
}


export const openCart = async () => {
	try {
		Eitri.nativeNavigation.open({
			slug: 'cart',
		})
	} catch (e) {
		console.error('Erro ao navegar para o carrinho', e)
	}
}

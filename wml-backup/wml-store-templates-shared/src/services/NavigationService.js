import Eitri from 'eitri-bifrost'

export const openAccount = async (action) => {
	Eitri.nativeNavigation.open({
		slug: 'account',
		initParams: { action },
	})
}

export const navigateToHome = () => {
	Eitri.navigation.navigate({ path: 'Home' })
}

export const openCart = async () => {
	Eitri.nativeNavigation.open({
		slug: 'cart',
	})
}

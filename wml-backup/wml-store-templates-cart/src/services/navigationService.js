import Eitri from 'eitri-bifrost'

export const navigateToCheckout = (orderFormId) => {
	Eitri.nativeNavigation.open({
		slug: 'checkout',
		initParams: { orderFormId },
	})
}

export const navigateToProduct = (productId) => {
	Eitri.nativeNavigation.open({
		slug: 'pdp',
		initParams: { productId },
	})
}

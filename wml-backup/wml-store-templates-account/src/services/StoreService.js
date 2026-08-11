import Eitri from 'eitri-bifrost'

import { Vtex } from 'eitri-shopping-vtex-shared'
import { getStoresFromVtexApi } from 'wml-store-templates-shared'

let STORE_PREFERENCES

export const getStorePreferences = (page, state = {}, replace = false) => {
	if (STORE_PREFERENCES) {
		return STORE_PREFERENCES
	}
	return new Promise((resolve, reject) => {
		Eitri.environment
			.getRemoteConfigs()
			.then((conf) => {
				resolve(conf?.storePreferences || {})
			})
			.catch((e) => {
				reject(e)
			})
	})
}

export const getLoginProviders = async () => {
	return await Vtex.store.getLoginProviders()
}

const COUPONS_MOCK = [
	{
		id: 'coupon-1',
		title: 'frete grátis',
		expiresAt: '02/01/2027',
		description:
			'Válido para compras acima de R$ 199,00 no site e app. Não cumulativo com outras promoções e sujeito à disponibilidade de estoque.',
		code: 'hopefrete',
	},
	{
		id: 'coupon-2',
		title: '20% off lingerie',
		expiresAt: '02/01/2027',
		description:
			'Desconto aplicado na seleção de lingeries da campanha. Aproveite para renovar seus favoritos com conforto e estilo.',
		code: 'lingerie20',
	},
	{
		id: 'coupon-3',
		title: 'compre 2 leve 3',
		expiresAt: '02/01/2027',
		description:
			'Na compra de 3 peças selecionadas, a de menor valor sai grátis. Benefício aplicado automaticamente no carrinho.',
		code: 'leve3',
	},
]

const normalizeCoupon = (coupon, index) => ({
	id: coupon?.id || `coupon-${index + 1}`,
	title: coupon?.title || coupon?.name || '',
	expiresAt: coupon?.expiresAt || coupon?.validUntil || coupon?.validity || '',
	description: coupon?.description || coupon?.details || '',
	code: coupon?.code || coupon?.coupon || coupon?.couponCode || '',
})

export const getStoresList = async (params = {}) => {
	return await getStoresFromVtexApi(params)
}

export const getCouponsList = async () => {
	try {
		const remoteConfig = await Eitri.environment.getRemoteConfigs()
		const couponsFromConfig =
			remoteConfig?.appConfigs?.coupons ||
			remoteConfig?.appConfigs?.discountCoupons ||
			remoteConfig?.storePreferences?.coupons

		if (Array.isArray(couponsFromConfig) && couponsFromConfig.length > 0) {
			return couponsFromConfig.map(normalizeCoupon)
		}

		return COUPONS_MOCK
	} catch (error) {
		console.error('Error loading coupons list', error)
		return COUPONS_MOCK
	}
}

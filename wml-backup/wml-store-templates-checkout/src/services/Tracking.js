import Eitri from 'eitri-bifrost'

import { TrackingService } from 'wml-store-templates-shared'

import { extractUniqueCategoryNames } from '../utils/utils'
import { autoTriggerGAEvents } from './AppService'

export const trackScreenView = (friendlyScreenName, screenFileName) => {
	try {
		TrackingService.screenView(friendlyScreenName, screenFileName)
	} catch (e) {
		console.log('Error on trackScreenView', e)
	}
}

export const trackBeginCheckout = (cart) => {
	try {
		const totalizer = cart?.totalizers?.find((i) => i.id === 'Items')
		const value = totalizer?.value ? totalizer.value / 100 : cart.value ? cart.value / 100 : ''

		TrackingService.event('begin_checkout', {
			currency: 'BRL',
			value: value,
			coupon: cart.marketingData?.coupon || '',
			items: cart.items.map((item) => ({
				item_id: item.productId,
				item_name: item.name || item.productName || item.nameComplete,
				price: item.price ? item.price / 100 : '',
				quantity: item.quantity,
			})),
		})

		TrackingService.inngageEvent('begin_checkout', {
			currency: 'BRL',
			value: value,
			coupon: cart.marketingData?.coupon || '',
			items: cart.items
				.map((item) => `${item.productId}-${item.name || item.productName || item.nameComplete}`)
				.join(','),
		})

		TrackingService.appsFlyerEvent('af_initiated_checkout', {
			af_currency: 'BRL',
			af_price: value,
			af_content_id: cart.items.map((item) => `${item.productId}`),
			af_content_type: extractUniqueCategoryNames(cart),
			af_quantity: cart.items.map((item) => item.quantity),
		})
	} catch (e) {
		console.log('Error on trackBeginCheckout', e)
	}
}

export const trackAddPaymentInfo = (cart, paymentType) => {
	try {
		if (!paymentType) {
			const paymentId = cart.paymentData?.payments?.[0]?.paymentSystem
			paymentType = cart.paymentData?.paymentSystems?.find((p) => p.stringId === paymentId)?.name
		}

		// evento enviado automaticamente pelo Vtex service se autoTriggerGAEvents() for true
		if (!autoTriggerGAEvents()) {
			const totalizer = cart?.totalizers?.find((i) => i.id === 'Items')
			const value = totalizer?.value ? totalizer.value / 100 : cart.value ? cart.value / 100 : ''

			TrackingService.event('add_payment_info', {
				currency: 'BRL',
				payment_type: paymentType || '',
				value: value,
				items: cart.items.map((item) => ({
					item_id: item.productId,
					item_name: item.name || item.productName || item.nameComplete,
					price: item.price ? item.price / 100 : '',
				})),
			})
		}

		TrackingService.inngageEvent('add_payment_info', {
			currency: 'BRL',
			payment_type: paymentType || '',
		})
	} catch (e) {
		console.log('Error on trackAddPaymentInfo', e)
	}
}

export const trackShippingInfo = async (cart) => {
	try {
		const totalizer = cart?.totalizers?.find((i) => i.id === 'Items')
		const value = totalizer?.value ? totalizer.value / 100 : cart.value ? cart.value / 100 : ''
		const shippingTier = cart?.shippingData?.logisticsInfo.find((i) => i.selectedSla)

		// evento enviado automaticamente pelo Vtex service se autoTriggerGAEvents() for true
		if (!autoTriggerGAEvents()) {
			const items = cart.items.map((item) => {
				return {
					item_id: `${item.productId}_${item.id}`,
					item_name: item.name,
					item_brand: item.additionalInfo?.brandName,
					price: item.sellingPrice / 100,
					quantity: item.quantity,
				}
			})
			TrackingService.event('add_shipping_info', {
				currency: 'BRL',
				shipping_tier: shippingTier?.selectedSla ? shippingTier.selectedSla : '',
				value: value,
				coupon: cart.marketingData?.coupon || '',
				items: items,
			})
		}

		TrackingService.inngageEvent('add_shipping_info', {
			currency: 'BRL',
			shipping_tier: shippingTier?.selectedSla ? shippingTier.selectedSla : '',
			value: value,
			coupon: cart.marketingData?.coupon || '',
			items: cart.items
				.map((item) => `${item.productId}-${item.name || item.productName || item.nameComplete}`)
				.join(';'),
		})
	} catch (e) {
		console.log('Error on trackShippingInfo', e)
	}
}

export const sendLogError = async (error, method, data = {}, _cart) => {
	try {
		const device = await Eitri.device.getInfos()

		const cart = _cart

		const payload = {
			origin: 'APP-SHOPPING-ERROR',
			eventName: `${window.__eitriAppConf?.slug}`,
			data: {
				application: window.__eitriAppConf?.application || '',
				slug: window.__eitriAppConf?.slug,
				applicationId: window.__eitriAppConf?.applicationId,
				version: window.__eitriAppConf?.version,
				device,
				method: method || '',
				email: cart?.clientProfileData?.email,
				cartId: cart?.orderFormId,
				error: {
					message: error?.message,
					stack: error?.stack,
					name: error?.name,
					...error,
				},
				...data,
			},
		}

		const environment = await Eitri.environment.getName()
		if (environment === 'dev') {
			console.log('===sendLogError===', payload)
			return
		}

		Eitri.http.post('https://api.eitri.tech/analytics/event', payload, {
			'Content-Type': 'application/json',
			'application-id': window.__eitriAppConf?.applicationId,
		})
	} catch (e) {
		console.error('Erro sendLogError', e)
	}
}

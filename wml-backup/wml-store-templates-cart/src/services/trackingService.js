import { TrackingService } from 'wml-store-templates-shared'

export const logScreenView = async (friendlyName, className) => {
	try {
		TrackingService.screenView(friendlyName, className)
		// console.info('[Analytics] screenView', friendlyName, className)
	} catch (e) {
		console.error('Error tracking screen view', e)
	}
}

export const sendPageView = async (friendlyName, className = friendlyName) => {
	return logScreenView(friendlyName, className)
}

export const logEvent = async (event, data) => {
	try {
		TrackingService.event(event, data)
		// console.info('[Analytics] event', event, JSON.stringify(data))
	} catch (e) {
		console.error('Error tracking screen view', e)
	}
}

export const logAppsFlyerEvent = async (event, data) => {
	try {
		TrackingService.appsFlyerEvent(event, data)
		// console.info('[AppsFlyer]', event, JSON.stringify(data))
	} catch (e) {
		console.error('Error tracking screen view', e)
	}
}

export const logViewCart = async cart => {
	try {
		TrackingService.viewCart(cart)
		// console.info('[Analytics] viewCart', JSON.stringify(cart))
	} catch (e) {
		console.error('Error tracking screen view', e)
	}
}

import Eitri from 'eitri-bifrost'
import { Tracking } from 'eitri-shopping-vtex-shared'
import { getCart } from './CartService'
import { TrackingService } from 'wml-store-templates-shared'

let globalEnv
const getEnv = async () => {
	if (globalEnv) {
		return globalEnv
	}
	try {
		globalEnv = await Eitri.environment.getName()
		return globalEnv
	} catch (error) {
		console.error('Erro ao obter env', error)
	}
}

let platform
const getPlatform = async () => {
	if (platform) {
		return platform
	}
	try {
		const { applicationData } = await Eitri.getConfigs()
		platform = applicationData?.platform
		return platform
	} catch (error) {
		console.error('Erro ao obter env', error)
	}
}

const logGaScreenView = async (friendlyName, className, logEvent = false) => {
	Tracking.ga.logScreenView(friendlyName, className)

	if (logEvent) {
		console.info('[GA] ', JSON.stringify({ event: 'screen_view', screen_name: friendlyName, screen_class: className }))
	}
}

const logGaEvent = async (eventName, data, logEvent = false) => {
	Tracking.ga.logEvent(eventName, data)

	if (logEvent) {
		console.info('[GA] ', JSON.stringify({ eventName, data }))
	}
}

const logFacebookEvent = async (eventName, data, logEvent = false) => {
	try {
		const modules = await Eitri.modules()
		const facebookEvent = modules.facebook?.logEvent || (() => {})

		await facebookEvent({ eventName, data })

		if (logEvent) {
			console.info('[Facebook] ', JSON.stringify({ eventName, data }))
		}
	} catch (e) {
		console.error('facebookEvent', e)
	}
}

const logDitoEvent = async (eventName, data, logEvent = false) => {
	try {
		const modules = await Eitri.modules()
		const ditoEvent = modules.dito?.logEvent || (() => {})

		const os = await getPlatform()

		const utmParams = {} // await TrackingService.getUtmParams() || {}

		const params = {
			browser: 'app',
			dispositivo: 'app',
			sistema_operacional: os,
			...utmParams,
			...data
		}
		await ditoEvent({ eventName, data: params })

		if (logEvent) {
			console.info('[Dito] ', JSON.stringify({ eventName, data: params }))
		}
	} catch (e) {
		console.error('ditoEvent', e)
	}
}

// -- Eventos de Telas -----------------------------------
export const trackScreenHome = async () => {
	try {
		const env = await getEnv()
		const showLog = env === 'dev'
		
		logGaScreenView('Home', 'Home', showLog)
	} catch (e) {
		console.error('trackScreenHome', e)
	}
}

export const trackScreenCategories = async () => {
	try {
		const env = await getEnv()
		const showLog = env === 'dev'
		
		logGaScreenView('Categorias', 'Categories', showLog)
	} catch (e) {
		console.error('trackScreenCategories', e)
	}
}

export const trackScreenSearch = async () => {
	try {
		const env = await getEnv()
		const showLog = env === 'dev'
		
		logGaScreenView('Busca', 'Search', showLog)
	} catch (e) {
		console.error('trackScreenSearch', e)
	}
}

export const trackScreenLandingPage = async (name) => {
	try {
		const env = await getEnv()
		const showLog = env === 'dev'
		
		logGaScreenView(`${name || 'Landing Page'}`, 'LandingPage', showLog)
	} catch (e) {
		console.error('trackScreenLandingPage', e)
	}
}

export const trackScreenError = async () => {
	try {
		const env = await getEnv()
		const showLog = env === 'dev'
		
		logGaScreenView('Erro', 'Error', showLog)
	} catch (e) {
		console.error('trackScreenError', e)
	}
}

export const trackScreenCatalog = async (name, parentCategory) => {
	try {
		const env = await getEnv()
		const showLog = env === 'dev'
		
		logGaScreenView(name || 'Catalogo', 'ProductCatalog', showLog)

	} catch (e) {
		console.error('trackScreenHotsite', e)
	}
}

// -- Eventos de Produtos e usuário -----------------------------------
export const trackViewItemList = async (listName, products) => {
	if (!products || products.length === 0) return
	
	const env = await getEnv()
	const showLog = env === 'dev'

	try {
		logGaEvent('view_item_list', {
			currency: 'BRL',
			item_list_id: listName,
			item_list_name: listName,
			items: products?.map(item => ({
				item_id: item.productId,
				item_name: item.productName
			})) || []
		}, showLog)
	} catch (e) {
		console.error('Error tracking add to cart', e)
	}
}

export const trackViewPromotion = async (mktTag) => {
	if (!mktTag) return

	const env = await getEnv()
	const showLog = env === 'dev'
	
	logGaEvent('view_promotion', {
		promotion_id: mktTag,
		promotion_name: mktTag,
		creative_name: mktTag
	}, showLog)
}

export const trackSelectPromotion = async (bannerName) => {
	if (!bannerName) return

	const env = await getEnv()
	const showLog = env === 'dev'
	
	logGaEvent('select_promotion', {
		promotion_id: bannerName,
		promotion_name: bannerName,
		creative_name: bannerName
	}, showLog)
}

export const trackSearch = async (term, page, products) => {
	
	try {
		const env = await getEnv()
		const showLog = env === 'dev'

		logGaEvent('search', { search_term: term, page_location: 'Busca' }, showLog)

		// logFacebookEvent('Search', {
		// 	currency: 'BRL',
		// 	content_type: 'product',
		// 	search_string: term
		// }, showLog)

	} catch (e) {
		console.error('Error tracking search', e)
	}
}

export const trackAddToCart = async (skuItem, quantity = 1) => {
	const env = await getEnv()
	const showLog = env === 'dev'

	
	try {
		const seller = skuItem.sellers.find((seller) => seller.sellerDefault) || skuItem.sellers[0]
		
		logGaEvent('add_to_cart', {
			currency: 'BRL',
			value: (seller?.commertialOffer?.Price || 0) * quantity,
			items: [{
				item_id: `${skuItem.itemId || ''}`,
				item_name: skuItem.nameComplete || '',
				item_variant: `${skuItem?.name || ''}`,
				price: seller?.commertialOffer?.Price || 0,
				quantity: quantity
			}]
		}, showLog)
	
		// logFacebookEvent('AddToCart', {
		// 	currency: 'BRL',
		// 	content_type: 'product',
		// 	content_ids: [skuItem.itemId],
		// 	content_name: skuItem.nameComplete || '',
		// 	value: seller?.commertialOffer?.Price || 0,
		// 	quantity: quantity
		// }, showLog)
			
	} catch (e) {
		console.error('Error tracking add to cart', e)
	}
}

export const trackAddToWishlist = async (product) => {
	const env = await getEnv()
	const showLog = env === 'dev'
	
	try {
		logGaEvent('add_to_wishlist', {
			currency: 'BRL',
			value: product?.prices?.price || 0,
			items: [{ 
				item_id: `${product?.productId || ''}`, 
				item_name: product?.name || product?.productName || '', 
				item_variant: `${product?.productVariantId || ''}`
			}]
		}, showLog)
	
		// logFacebookEvent('AddToWishlist', {
		// 	currency: 'BRL',
		// 	content_type: 'product',
		// 	content_ids: [product?.productVariantId],
		// 	value: product?.prices?.price || 0
		// }, showLog)

	} catch (e) {
		console.error('Error tracking add to wishlist', e)
	}
}

// -- Eventos de Erro -----------------------------------
export const logError = async (event, error) => {
	Tracking.ga.logError(event, error)
}

import Eitri from 'eitri-bifrost'

export default class TrackingService {
	static EVENTS = {
		app_error: 'app_resolve', // personalizado
		add_shipping_info: 'add_shipping_info',
		add_to_cart: 'add_to_cart',
		add_to_wishlist: 'add_to_wishlist',
		begin_checkout: 'begin_checkout',
		purchase: 'purchase',
		remove_from_cart: 'remove_from_cart',
		screen_view: 'screen_view',
		search: 'search',
		view_cart: 'view_cart',
		view_item: 'view_item',
		view_category: 'view_category', // personalizado para audiência
		view_item_list: 'view_item_list',
		view_search_results: 'view_search_results',
	}

	static PARAMS = {
		app_action: 'app_action', // personalizado
		category: 'category', // personalizado
		coupon: 'coupon',
		currency: 'currency',
		items: 'items',
		item_brand: 'item_brand',
		item_category: 'item_category',
		item_name: 'item_name',
		item_variant: 'item_variant',
		msg_error: 'msg', // personalizado
		payment_type: 'payment_type',
		promotion_id: 'promotion_id',
		promotion_name: 'promotion_name',
		quantity: 'quantity',
		remove_from_cart: 'remove_from_cart',
		results_count: 'results_count',
		screen_name: 'screen_name',
		screen_class: 'screen_class',
		search_term: 'search_term',
		status: 'status',
		value: 'value',
		warning: 'warning',
	}

	/**
	 * Envia um evento de tracking utilizando o Eitri.
	 *
	 * @async
	 * @function sendEitriTracking
	 * @param {string} event - Nome do evento a ser enviado.
	 * @param {Object} data - Dados adicionais a serem enviados junto ao evento.
	 * @param {boolean} [logEvent=false] - Se verdadeiro, exibe o evento no console para debug.
	 * @returns {Promise<void>} Promessa resolvida após o envio do evento.
	 *
	 * @example
	 * await TrackingService.sendEitriTracking('add_to_cart', { item_name: 'Camiseta', quantity: 2 });
	 */
	static sendEitriTracking = async (event, data, logEvent = false) => {
		let params = {
			screen: document.title,
			...data,
		}

		// TODO: remover quando a 100% dos usuários estiverem na versão >= 12.0.7 do app nativo
		if (Eitri.exposedApis.appsFlyer && Eitri.exposedApis.appsFlyer.logEvent) {
			await Eitri.exposedApis.fb.logEvent({ eventName: event, data: params })
		} else {
			await Eitri.exposedApis.tracking.logEvent({ eventName: event, data: params })
		}

		if (logEvent) {
			console.log('[Analytics.]', JSON.stringify({ eventName: event, data: params }))
		}
	}

	/**
	 * Envia um log de erro/crash para o sistema de tracking (ex: Firebase Analytics).
	 *
	 * @async
	 * @function sendEitriCrashLog
	 * @param {string} event - Nome do evento ou ação onde ocorreu o erro.
	 * @param {Object} error - Objeto contendo informações do erro ocorrido.
	 * @returns {Promise<void>} Promessa resolvida após o envio do log de erro.
	 *
	 * @example
	 * await TrackingService.sendEitriCrashLog('login', { message: 'Erro ao autenticar usuário', stack: '...' });
	 */
	static sendEitriCrashLog = async (event, error) => {
		let params = {
			currentPage: document.title,
			event,
			...error,
		}

		if (Eitri.exposedApis.fb && Eitri.exposedApis.fb.logError) {
			await Eitri.exposedApis.fb.logError({ message: params })
		} else {
			console.error('[Analytics] Eitri.exposedApis.fb.logError not available')
		}
	}

	/**
	 * Registra um evento de visualização de tela no sistema de tracking (ex: Firebase Analytics, GA).
	 *
	 * @async
	 * @function screenView
	 * @param {string} friendlyScreenName - Nome amigável da tela (ex: 'Home', 'Carrinho').
	 * @param {string} [screenFilename] - Nome do arquivo da tela ou identificador técnico (opcional).
	 * @param {boolean} [logEvent=false] - Se verdadeiro, exibe o evento no console para debug.
	 * @returns {Promise<void>} Promessa resolvida após o envio do evento de visualização de tela.
	 *
	 * @example
	 * await TrackingService.screenView('Home', 'Home');
	 * await TrackingService.screenView('Carrinho', 'CartScreen', true);
	 */
	static screenView = async (friendlyScreenName, screenFilename, logEvent = false) => {
		try {
			const _friendlyScreenName = friendlyScreenName.replace(/ /g, '_').toLowerCase()
			this.sendEitriTracking(
				this.EVENTS.screen_view,
				{
					[this.PARAMS.screen_name]: _friendlyScreenName,
					[this.PARAMS.screen_class]: screenFilename || _friendlyScreenName,
				},
				logEvent,
			)
		} catch (error) {
			console.error('Erro ao setar tela atual', error)
		}
	}

	/**
	 * Registra um evento de busca de produtos ou conteúdos no sistema de tracking (ex: Firebase Analytics).
	 *
	 * @async
	 * @function trackingSearch
	 * @param {string} term - O termo buscado pelo usuário.
	 * @param {string} [category=''] - A categoria na qual a busca foi realizada (opcional).
	 * @param {number|string} [totalResults=''] - O total de resultados retornados pela busca (pode ser número ou string, opcional).
	 * @returns {Promise<void>} Promessa resolvida após o envio do evento de busca.
	 */
	static search = async (term, category = '', totalResults = '') => {
		try {
			this.sendEitriTracking(this.EVENTS.search, {
				[this.PARAMS.search_term]: term,
				[this.PARAMS.category]: category,
				[this.PARAMS.results_count]: totalResults,
			})
		} catch (error) {
			console.error('Erro ao setar tela atual', error)
		}
	}

	/**
	 * Registra um erro no sistema de tracking (ex: Firebase Analytics e GA).
	 *
	 * @async
	 * @function trackingError
	 * @param {Error|string} error - O erro ocorrido. Pode ser um objeto de erro ou uma mensagem string.
	 * @param {string} [action=''] - A ação que estava sendo executada quando o erro ocorreu. Ex: 'login', 'fetch_data'.
	 * @param {object} [payload={}] - Parametros enviados na ação que gerou o erro, atenção para não enviar dados sensíveis
	 * @returns {Promise<void>} - Promessa resolvida após o envio do erro ao sistema de tracking.
	 */
	static error = async (error, action = '', payload = {}, logEvent = false) => {
		try {
			console.error('Error: ', action, error)
			this.sendEitriCrashLog(action, error)
		} catch (error) {
			console.error('EitriCrashLog error ao enviar log de erro', error)
		}
	}

	/**
	 * Registra um evento (ex: Firebase Analytics e GA).
	 *
	 * @async
	 * @function event
	 * @param {string} [eventName=''] - Nome do evento, eventos oficial em Tracking.EVENTS.
	 * @param {object} [data={}] - Parametros enviados na ação que gerou o evento, parametro oficial em Tracking.PARAMS.
	 * @returns {Promise<void>} - Promessa resolvida após o envio do erro ao sistema de tracking.
	 */
	static event = async (eventName, data, logEvent = false) => {
		try {
			this.sendEitriTracking(eventName, data, logEvent)
		} catch (error) {
			console.error('Erro ao enviar log de evento', error)
		}
	}

	/**
	 * Registra um evento de visualização de produto no sistema de tracking (ex: Firebase Analytics, GA).
	 *
	 * @async
	 * @function product
	 * @param {Object} product - Objeto do produto a ser registrado no evento.
	 * @param {string} [currency='BRL'] - Código da moeda utilizada (padrão: 'BRL').
	 * @returns {Promise<void>} Promessa resolvida após o envio do evento de visualização de produto.
	 *
	 * @example
	 * await TrackingService.product(produto);
	 * await TrackingService.product(produto, 'USD');
	 */
	static product = async (product, currency = 'BRL') => {
		try {
			const items = this.mountProductItem(product)

			try {
				this.sendEitriTracking(this.EVENTS.view_item, {
					[this.PARAMS.currency]: currency,
					[this.PARAMS.value]: items[0]?.price,
					[this.PARAMS.items]: items,
				})
			} catch (error) {
				console.error('Erro ao enviar log de produto', error)
			}
		} catch (error) {
			console.error('Erro ao montar log de produto', error)
		}
	}

	/**
	 * Monta um array de itens de produto no formato esperado para tracking de eventos (ex: add_to_cart, view_item).
	 *
	 * @param {Object} product - Objeto do produto principal ou item do produto.
	 * @param {number} [quantity] - Quantidade do produto (opcional).
	 * @param {string} [itemListId] - ID da lista de itens (opcional, ex: categoria, shelf, etc).
	 * @param {string} [itemListName] - Nome da lista de itens (opcional, ex: categoria, shelf, etc).
	 * @returns {Array<Object>} Array contendo um objeto com os dados do item formatados para tracking.
	 *
	 * @example
	 * const items = TrackingService.mountProductItem(produto, 2, 'shelf-1', 'Mais Vendidos');
	 */
	static mountProductItem = (product, quantity, itemListId, itemListName) => {
		const _item = Array.isArray(product?.items) ? product?.items[0] : product

		const _categories = product?.categories?.length > 0 ? product.categories[0] : ''
		const categories = _categories
			?.split('/')
			?.filter(Boolean)
			?.reduce((acc, curr, index) => {
				if (index === 0) {
					acc[`item_category`] = curr
				} else {
					acc[`item_category${index + 1}`] = curr
				}
				return acc
			}, {})

		let price = _item?.price || 0
		if (Array.isArray(_item?.sellers) && _item?.sellers[0]?.Price) {
			price = _item.sellers[0].Price
		} else if (Array.isArray(_item?.sellers) && _item?.sellers[0]?.commertialOffer?.Price) {
			price = _item.sellers[0].commertialOffer.Price
		}

		const variant = _item?.variations?.map((i) => i.values?.join(','))?.join('-')

		const items = [
			{
				item_id: _item?.itemId || product.productId || '',
				item_name: _item?.nameComplete || _item?.name || product.productName || '',
				item_brand: product.brand || '',
				item_variant: variant || '',
				...categories,
				price: quantity ? price * quantity : price,
				...(quantity && { quantity }),
				...(itemListId && { item_list_id: itemListId }),
				...(itemListName && { item_list_name: itemListName }),
			},
		]

		return items
	}

	/**
	 * Registra um evento de adição de produto ao carrinho no sistema de tracking (ex: Firebase Analytics, GA).
	 *
	 * @function addItemToCart
	 * @param {Object} product - Objeto do produto a ser adicionado ao carrinho.
	 * @param {number} [quantity=1] - Quantidade do produto adicionada ao carrinho (padrão: 1).
	 * @param {string} [currency='BRL'] - Código da moeda utilizada (padrão: 'BRL').
	 * @returns {void}
	 *
	 * @example
	 * TrackingService.addItemToCart(produto, 2);
	 * TrackingService.addItemToCart(produto, 1, 'USD');
	 */
	static addItemToCart = (product, quantity = 1, currency = 'BRL') => {
		try {
			const items = this.mountProductItem(product, quantity)

			try {
				this.sendEitriTracking(this.EVENTS.add_to_cart, {
					[this.PARAMS.currency]: currency,
					[this.PARAMS.value]: items[0]?.price,
					[this.PARAMS.items]: items,
				})
			} catch (error) {
				console.error('Erro ao enviar log de adicionar produto', error)
			}
		} catch (error) {
			console.error('Erro ao montar log de adicionar produto', error)
		}
	}

	/**
	 * Registra um evento de remoção de produto do carrinho no sistema de tracking (ex: Firebase Analytics, GA).
	 *
	 * @function removeItemFromCart
	 * @param {Object} product - Objeto do produto a ser removido do carrinho.
	 * @param {number} [quantity=1] - Quantidade do produto removida do carrinho (padrão: 1).
	 * @param {string} [currency='BRL'] - Código da moeda utilizada (padrão: 'BRL').
	 * @returns {void}
	 *
	 * @example
	 * TrackingService.removeItemFromCart(produto, 1);
	 * TrackingService.removeItemFromCart(produto, 2, 'USD');
	 */
	static removeItemFromCart = (product, quantity = 1, currency = 'BRL') => {
		try {
			const items = this.mountProductItem(product, quantity)

			try {
				this.sendEitriTracking(this.EVENTS.remove_from_cart, {
					[this.PARAMS.currency]: currency,
					[this.PARAMS.value]: items[0]?.price,
					[this.PARAMS.items]: items,
				})
			} catch (error) {
				console.error('Erro ao enviar log de remover produto', error)
			}
		} catch (error) {
			console.error('Erro ao montar log de remover produto', error)
		}
	}

	/**
	 * Registra um evento de visualização do carrinho no sistema de tracking (ex: Firebase Analytics, GA).
	 *
	 * @function viewCart
	 * @param {Object} cart - Objeto do carrinho contendo os itens e valores.
	 * @param {string} [currency='BRL'] - Código da moeda utilizada (padrão: 'BRL').
	 * @returns {void}
	 *
	 * @example
	 * TrackingService.viewCart(carrinho);
	 * TrackingService.viewCart(carrinho, 'USD');
	 */
	static viewCart = (cart, currency = 'BRL') => {
		try {
			const items = cart?.items.map((item) => {
				item.price = (item.price / 100).toFixed(2)
				const _item = this.mountProductItem(item, item?.quantity || 1)
				return _item
			})

			const price = cart?.value ? (cart.value / 100).toFixed(2) : null
			try {
				this.sendEitriTracking(this.EVENTS.view_cart, {
					[this.PARAMS.currency]: currency,
					[this.PARAMS.value]: price,
					[this.PARAMS.items]: items,
				})
			} catch (error) {
				console.error('Erro ao enviar log de visualizar carrinho', error)
			}
		} catch (error) {
			console.error('Erro ao montar log de visualizar carrinho', error)
		}
	}

	/**
	 * Registra um evento customizado no sistema Inngage, caso disponível e fora do ambiente de desenvolvimento.
	 *
	 * @async
	 * @function inngageEvent
	 * @param {string} eventName - Nome do evento a ser registrado.
	 * @param {Object} data - Dados adicionais a serem enviados junto ao evento.
	 * @param {boolean} [logEvent=false] - Se verdadeiro, exibe o evento no console para debug.
	 * @returns {Promise<void>} Promessa resolvida após o envio do evento ao Inngage.
	 *
	 * @example
	 * await TrackingService.inngageEvent('compra_realizada', { valor: 100 });
	 * await TrackingService.inngageEvent('login', { userId: 123 }, true);
	 */
	static inngageEvent = async (eventName, data, logEvent = false) => {
		try {
			if (Eitri.exposedApis.inngage && Eitri.exposedApis.inngage.logEvent) {
				const env = await Eitri.environment.getName()
				if (env !== 'dev') {
					await Eitri.exposedApis.inngage.logEvent({ eventName, data })
				}

				if (logEvent) {
					console.log('[Inngage]', JSON.stringify({ eventName, data }))
				}
			} else {
				console.error('[Inngage] Eitri.exposedApis.inngage.logEvent not available')
			}
		} catch (error) {
			console.error('[Inngage] Erro ao enviar evento', error)
		}
	}

	/**
	 * Registra um evento customizado no sistema AppsFlyer, caso disponível e fora do ambiente de desenvolvimento.
	 *
	 * @async
	 * @function appsFlyerEvent
	 * @param {string} eventName - Nome do evento a ser registrado.
	 * @param {Object} data - Dados adicionais a serem enviados junto ao evento.
	 * @param {boolean} [logEvent=false] - Se verdadeiro, exibe o evento no console para debug.
	 * @returns {Promise<void>} Promessa resolvida após o envio do evento ao AppsFlyer.
	 *
	 * @example
	 * await TrackingService.appsFlyerEvent('compra_realizada', { valor: 100 });
	 * await TrackingService.appsFlyerEvent('login', { userId: 123 }, true);
	 */
	static appsFlyerEvent = async (eventName, data, logEvent = false) => {
		try {
			if (Eitri.exposedApis.appsFlyer && Eitri.exposedApis.appsFlyer.logEvent) {
				const env = await Eitri.environment.getName()
				if (env !== 'dev') {
					await Eitri.exposedApis.appsFlyer.logEvent({ eventName, data })
				}

				if (logEvent) {
					console.log('[AppsFlyer]', JSON.stringify({ eventName, data }))
				}
			} else {
				console.error('[AppsFlyer] Eitri.exposedApis.appsFlyer.logEvent not available')
			}
		} catch (error) {
			console.error('[AppsFlyer] Erro ao enviar evento', error)
		}
	}
}

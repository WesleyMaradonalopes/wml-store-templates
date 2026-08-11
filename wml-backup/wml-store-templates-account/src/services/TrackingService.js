import Eitri from 'eitri-bifrost'
import { Tracking } from 'eitri-shopping-vtex-shared'

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

		const utmParams = {} // await Tracking.getUtmParams() || {}

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
export const sendScreenView = async (friendlyScreenName, screenFilename) => {
	try {
		const env = await getEnv()
		const showLog = env === 'dev'
		
		logGaScreenView(friendlyScreenName, screenFilename, showLog)
	} catch (e) {
		console.error('sendScreenView', friendlyScreenName, screenFilename, e)
	}
}

// -- Eventos de Produtos e usuário -----------------------------------
export const trackLogin = async () => {
	const env = await getEnv()
	const showLog = env === 'dev'

	try {
		logGaEvent('login', { method: 'app' }, showLog)
	} catch (e) {
		console.error('trackLogin', e)
	}
}

export const trackSignup = async () => {
	const env = await getEnv()
	const showLog = env === 'dev'

	try {
		logGaEvent('sign_up', { method: 'app' }, showLog)
	} catch (e) {
		console.error('trackSignup', e)
	}
}

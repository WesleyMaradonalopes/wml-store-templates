import Eitri from 'eitri-bifrost'

export const getFbRemoteConfig = async (key) => {
	try {
		const result = await Eitri.exposedApis.remoteConfig.getString({ key })

		if (result === 'false') return false
		if (result === 'true') return true

		return result
	} catch (e) {
		console.error('Erro ao buscar remote config:', e)
		return null
	}
}

import Eitri from 'eitri-bifrost'

export const getRemoteAppConfigProperty = async (property) => {
	const remoteConfig = await Eitri.environment.getRemoteConfigs()

	const { appConfigs = {} } = remoteConfig ?? {}

	return appConfigs[property]
}

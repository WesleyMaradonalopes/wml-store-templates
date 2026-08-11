import Eitri from 'eitri-bifrost'

export const addonUserTappedActiveTabListener = () => {
	Eitri.eventBus.subscribe({
		channel: 'onUserTappedActiveTab',
		callback: (_) => {
			Eitri.navigation.backToTop()
		},
	})
}

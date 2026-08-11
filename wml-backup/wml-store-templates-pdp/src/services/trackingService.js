import Eitri from 'eitri-bifrost'

import { Tracking, TrackingService } from 'wml-store-templates-shared'

export const sendScreenView = async (friendlyScreenName, screenFilename) => {
	try {
		TrackingService.screenView(friendlyScreenName, screenFilename)
	} catch (e) {
		console.log('Error on TrackingService.screenView', e)
	}
}

export const sendViewItem = async (product) => {
	TrackingService.product(product)
}

export const logEvent = async (eventName, data) => {
	TrackingService.event(eventName, data)
}

export const crashLog = async (error) => {
	TrackingService.error(error)
}

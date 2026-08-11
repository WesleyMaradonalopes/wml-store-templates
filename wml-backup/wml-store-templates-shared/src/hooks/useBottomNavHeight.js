import Eitri from 'eitri-bifrost'

import { useState, useEffect } from 'react'

import { getRemoteAppConfigProperty } from '../utils/getRemoteConfigStyleProperty'
import useSafeAreaInsets from './useSafeAreaInsets'

const DEFAULT_NAV_HEIGHT = 77

export default function useBottomNavHeight() {
	const { bottom: safeAreaBottom } = useSafeAreaInsets()
	const [navHeight, setNavHeight] = useState(0)
	const [hasTabBar, setHasTabBar] = useState(false)

	useEffect(() => {
		checkTabBar()
	}, [])

	const checkTabBar = async () => {
		try {
			const startParams = await Eitri.getInitializationInfos()
			if (startParams?.tabIndex !== undefined) {
				setHasTabBar(true)
				loadNavHeight()
			}
		} catch (e) {
			console.error('useBottomNavHeight: failed to check tabIndex', e)
		}
	}

	const loadNavHeight = async () => {
		try {
			const remoteHeight = await getRemoteAppConfigProperty('bottomNavBarHeight')
			if (remoteHeight) {
				setNavHeight(Number(remoteHeight))
				return
			}
		} catch (e) {
			console.error('useBottomNavHeight: failed to load remote config', e)
		}
		setNavHeight(DEFAULT_NAV_HEIGHT)
	}

	return {
		navHeight,
		safeAreaBottom,
		totalBottom: navHeight + safeAreaBottom,
		hasTabBar,
	}
}

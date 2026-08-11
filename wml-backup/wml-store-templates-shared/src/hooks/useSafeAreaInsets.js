import { useState, useEffect } from 'react'

export default function useSafeAreaInsets() {
	const [insets, setInsets] = useState({ top: 0, bottom: 0 })

	useEffect(() => {
		loadInsets()
	}, [])

	const loadInsets = async () => {
		const { EITRI } = window
		if (!EITRI) return

		try {
			const { superAppData } = await EITRI.miniAppConfigs
			const { safeAreaInsets } = superAppData
			setInsets({
				top: safeAreaInsets?.top || 0,
				bottom: safeAreaInsets?.bottom || 0,
			})
		} catch (e) {
			console.error('useSafeAreaInsets: failed to load insets', e)
		}
	}

	return insets
}

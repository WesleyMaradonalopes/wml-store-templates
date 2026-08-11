import Eitri from 'eitri-bifrost'
import { useCallback, useEffect, useState, useRef } from 'react'
import { EventBus } from 'eitri-shopping-vtex-shared'

import { BottomInset, Toast } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { getCmsContent } from '../services/CmsService'
import { startConfigure } from '../services/AppService'
import HomeSkeleton from '../components/HomeSkeleton/HomeSkeleton'
import CmsContentRender from '../components/CmsContentRender/CmsContentRender'
import MainHeader from '../components/Header/MainHeader'
import { trackScreenHome } from '../services/TrackingService'

const SCROLL_THRESHOLD_DEFAULT = 300

export default function Home() {
	const { startCart, setCart } = useLocalShoppingCart()
	const [cmsContent, setCmsContent] = useState(null)
	const [toastData, setToastData] = useState(null)
	const [scrollThreshold, setScrollThreshold] = useState(SCROLL_THRESHOLD_DEFAULT)

	const bannerMeasuredRef = useRef(false)

	useEffect(() => {
		startHome()
		requestNotificationPermission()
		EventBus.subscribe({
			channel: 'addToWishlist',
			broadcast: true,
			callback: () => {
				showToast('Produto adicionado aos favoritos')
			},
		})
		Eitri.navigation.addOnResumeListener(() => {
			trackScreenHome()
			startCart()
		})
	}, [])

	useEffect(() => {
		if (cmsContent && !bannerMeasuredRef.current) {
			measureBannerHeight()
		}
	}, [cmsContent])

	const measureBannerHeight = () => {
		const headerEl = document.getElementById('header')
		const headerHeight = headerEl?.offsetHeight || 60

		requestAnimationFrame(() => {
			const bannerEl = document.querySelector('[data-banner-hero]')
			if (bannerEl) {
				const bannerBottom = bannerEl.getBoundingClientRect().bottom + window.scrollY
				setScrollThreshold(Math.max(bannerBottom - headerHeight, 50))
				bannerMeasuredRef.current = true
			}
		})
	}

	const showToast = (message, type = 'success') => {
		setToastData({
			id: Date.now(),
			message,
			type,
		})
	}

	const handleToastClose = useCallback(() => {
		setToastData(null)
	}, [])

	const requestNotificationPermission = async () => {
		try {
			let notificationPermissionStatus = await Eitri.notification.checkPermission()
			if (notificationPermissionStatus.status === 'DENIED') {
				await Eitri.notification.requestPermission()
			}
		} catch (e) {
			console.error('Erro ao solicitar permissão para notificação', e)
		}
	}

	const startHome = async () => {
		startConfigure()
			.then(startCart)
			.then(resolveRedirectAndCartAndCms)
			.catch((e) => {
				console.error('Erro startConfigure: ', e)
			})
	}

	const resolveRedirectAndCartAndCms = async () => {
		const startParams = await Eitri.getInitializationInfos()
		if (startParams) {
			const openRoute = processDeepLink(startParams)
			if (openRoute) {
				Eitri.navigation.navigate(openRoute)
				return
			}
		}

		if (`${startParams?.tabIndex}` === '0') {
			trackScreenHome()
		}

		loadCms()
	}

	const processDeepLink = (startParams) => {
		if (startParams?.route) {
			let { route, ...rest } = startParams
			const normalizedRoute = `${route}`.replace(/^\//, '').toLowerCase()

			if (normalizedRoute === 'home') {
				return null
			}

			return { path: route, state: rest, replace: true }
		}
	}

	const loadCms = async () => {
		const { sections } = await getCmsContent('home', 'home')
		setCmsContent(sections)
	}

	return (
		<Page title='Home'>
			<MainHeader
				transparentOnScroll={true}
				scrollThreshold={scrollThreshold}
			/>
			<View>
				<HomeSkeleton show={!cmsContent} />
				<CmsContentRender cmsContent={cmsContent} />
				<Toast
					toastData={{
						triggerId: toastData?.id,
						id: toastData?.id,
						message: toastData?.message,
						type: toastData?.type,
					}}
					bottomClassName='bottom-[40px]'
					widthClassName='w-[80%]'
					showBottomInset
					onClose={handleToastClose}
				/>
				<BottomInset />
			</View>
		</Page>
	)
}

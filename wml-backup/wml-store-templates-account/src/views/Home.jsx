import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import {
	AppActionButton,
	BottomInset,
	SharedLogo,
} from 'wml-store-templates-shared'

import { Image } from 'eitri-luminus'
import { isVersionLower } from 'wml-store-templates-shared'
import { useEffect, useState } from 'react'
import homeNotificationsIcon from '../assets/icons/home-notifications.svg'
import homeUtilityDiscountIcon from '../assets/icons/home-utility-discount.svg'
import homeUtilityPrivacyIcon from '../assets/icons/home-utility-privacy.svg'
import homeUtilityReturnsIcon from '../assets/icons/home-utility-returns.svg'
import homeUtilityStoresIcon from '../assets/icons/home-utility-stores.svg'
import lockIcon from '../assets/icons/lock.svg'
import bookmarkIcon from '../assets/images/bookmark-01.svg'
import boxIcon from '../assets/images/box-01.svg'
import userIcon from '../assets/images/user.svg'
import PoweredBy from '../components/PoweredBy/PoweredBy'
import { useCustomer } from '../providers/Customer'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { startConfigure } from '../services/AppService'
import {
	doLogout,
	loadNotificationsPreferenceFromStorage,
	saveNotificationsPreferenceOnStorage,
} from '../services/CustomerService'
import { navigate, PAGES } from '../services/NavigationService'
import { sendScreenView } from '../services/TrackingService'

export default function Home() {
	const PAGE = 'Minha Conta'

	const { t } = useTranslation()
	const { cart, startCart } = useLocalShoppingCart()
	const { customerData, isLogged, isLoading, loadCustomer } = useCustomer()
	const [deleteAccountUrl, setDeleteAccountUrl] = useState('')
	const [notificationsEnabled, setNotificationsEnabled] = useState(false)
	const [notificationsMessageKey, setNotificationsMessageKey] = useState('')
	const [isNotificationToggleLoading, setIsNotificationToggleLoading] = useState(false)
	const [notificationsPreferenceLoaded, setNotificationsPreferenceLoaded] = useState(false)
	const [isLogoutLoading, setIsLogoutLoading] = useState(false)

	useEffect(() => {
		init()

		Eitri.navigation.addOnResumeListener(() => {
			sendScreenView(PAGE, 'account.home')
			init()
		})
	}, [])

	const init = async () => {
		const startParams = await Eitri.getInitializationInfos()
		const { applicationData } = await Eitri.getConfigs()
		const appVersion = applicationData?.version?.split('-')[0]

		if (startParams?.tabIndex !== undefined && isVersionLower(appVersion, '1.0.5') && !startParams?.compatRedirect) {
			Eitri.navigation.open({ slug: 'wml-store-templates-cart', initParams: { tabIndex: startParams.tabIndex, compatRedirect: true }, replace: true })
			return
		}

		await startConfigure()
		startCart()

		if (startParams?.action === 'RequestLogin') {
			navigate(PAGES.SIGNIN, { closeAppAfterLogin: true }, true)
			return
		}

		if (startParams) {
			const openRoute = processDeepLink(startParams)
			if (openRoute) {
				Eitri.navigation.navigate(openRoute)
				return
			}
		}

		const remoteConfigs = await Eitri.environment.getRemoteConfigs()
		if (remoteConfigs?.appConfigs?.deleteAccountUrl) {
			setDeleteAccountUrl(remoteConfigs.appConfigs.deleteAccountUrl)
		}

		if (!startParams?.tabIndex) {
			sendScreenView(PAGE, 'account.home')
		}

		await syncNotificationsState({
			requestPermissionIfNeeded: true,
			preferStoredOptOut: true,
		})

		await loadCustomer()
	}

	const getNotificationPermissionStatus = async () => {
		const permissionResult = await Eitri.notification.checkPermission()
		return permissionResult?.status
	}

	const syncNotificationsState = async ({ requestPermissionIfNeeded = false, preferStoredOptOut = false } = {}) => {
		try {
			let permissionStatus = await getNotificationPermissionStatus()

			if (requestPermissionIfNeeded && permissionStatus !== 'GRANTED') {
				const requestPermissionResult = await Eitri.notification.requestPermission()
				permissionStatus = requestPermissionResult?.status || await getNotificationPermissionStatus()
			}

			const hasPermissionGranted = permissionStatus === 'GRANTED'

			if (hasPermissionGranted) {
				const storedPreference = await loadNotificationsPreferenceFromStorage()

				if (preferStoredOptOut && storedPreference === false) {
					setNotificationsEnabled(false)
				} else {
					setNotificationsEnabled(true)
				}
			} else {
				setNotificationsEnabled(false)
				if (notificationsPreferenceLoaded) {
					setNotificationsMessageKey('home.notificationsPermissionDenied')
				}
			}

			setNotificationsPreferenceLoaded(true)
		} catch (e) {
			setNotificationsEnabled(false)
			setNotificationsMessageKey('home.notificationsPermissionError')
			setNotificationsPreferenceLoaded(true)
			console.error('Error while syncing notification permission state', e)
		}
	}

	const handleNotificationToggle = async () => {
		if (isNotificationToggleLoading) {
			return
		}

		setNotificationsMessageKey('')
		setIsNotificationToggleLoading(true)

		try {
			if (notificationsEnabled) {
				setNotificationsEnabled(false)
				await saveNotificationsPreferenceOnStorage(false)
				return
			}

			const requestPermissionResult = await Eitri.notification.requestPermission()
			const permissionStatus = requestPermissionResult?.status || await getNotificationPermissionStatus()

			if (permissionStatus === 'GRANTED') {
				setNotificationsEnabled(true)
				await saveNotificationsPreferenceOnStorage(true)
				return
			}

			setNotificationsEnabled(false)
			setNotificationsMessageKey('home.notificationsPermissionDenied')
			await saveNotificationsPreferenceOnStorage(false)
		} catch (e) {
			setNotificationsEnabled(false)
			setNotificationsMessageKey('home.notificationsPermissionError')
			await saveNotificationsPreferenceOnStorage(false)
			console.error('Error while handling notification toggle', e)
		} finally {
			setIsNotificationToggleLoading(false)
		}
	}

	const handleLogout = async () => {
		if (isLogoutLoading) {
			return
		}

		setIsLogoutLoading(true)
		try {
			await doLogout()
			await loadCustomer()
		} catch (e) {
			console.error('Error while logging out', e)
		} finally {
			setIsLogoutLoading(false)
		}
	}

	const processDeepLink = (startParams) => {
		if (startParams?.route) {
			let { route, ...rest } = startParams
			return {
				path: route,
				state: rest,
				replace: true,
			}
		}
	}

	const utilityCards = [
		{ key: 'discount', label: t('home.utilityDiscount'), route: PAGES.COUPONS },
		{ key: 'returns', label: t('home.utilityReturns'), route: PAGES.RETURNS_EXCHANGES },
		{ key: 'privacy', label: t('home.utilityPrivacy'), route: PAGES.PRIVACY_POLICY },
		{ key: 'stores', label: t('home.utilityStores'), route: PAGES.STORES },
	]

	const loggedCards = [
		{ key: 'orders', label: t('home.labelMyOrders'), route: PAGES.ORDER_LIST },
		{ key: 'personalData', label: t('home.utilityPersonalData'), route: PAGES.EDIT_PROFILE },
		{ key: 'favorites', label: t('home.utilityFavorites'), route: PAGES.WISH_LIST },
		{ key: 'returns', label: t('home.utilityReturns'), route: PAGES.RETURNS_EXCHANGES },
		{ key: 'passwordReset', label: t('home.utilityPasswordReset'), route: PAGES.PASSWORD_RESET },
		{ key: 'discount', label: t('home.utilityDiscount'), route: PAGES.COUPONS },
		{ key: 'stores', label: t('home.utilityStores'), route: PAGES.STORES },
		{ key: 'privacy', label: t('home.utilityPrivacy'), route: PAGES.PRIVACY_POLICY },
	]

	const visibleCards = isLogged ? loggedCards : utilityCards
	const greetingEmail = customerData?.email || 'email@email.com.br'

	const renderUtilityIcon = (key) => {
		switch (key) {
			case 'discount':
				return (
					<Image src={homeUtilityDiscountIcon} width='16px' height='16px' />
				)
			case 'orders':
				return (
					<Image src={boxIcon} width='16px' height='16px' />
				)
			case 'personalData':
				return (
					<Image src={userIcon} width='16px' height='16px' />
				)
			case 'favorites':
				return (
					<Image src={bookmarkIcon} width='16px' height='16px' />
				)
			case 'passwordReset':
				return (
					<Image src={lockIcon} width='16px' height='16px' />
				)
			case 'returns':
				return (
					<Image src={homeUtilityReturnsIcon} width='16px' height='16px' />
				)
			case 'privacy':
				return (
					<Image src={homeUtilityPrivacyIcon} width='16px' height='16px' />
				)
			default:
				return (
					<Image src={homeUtilityStoresIcon} width='16px' height='16px' />
				)
		}
	}

	return (
		<Page
			title={PAGE}
			className='font-sans text-base text-primary'>
			<View className='min-h-full bg-[#f7f7f7] px-4 pb-4 pt-[100px]'>
				<View className='mx-auto w-full max-w-[360px]'>
					<View className='mb-6 mt-4 flex w-full justify-center'>
						<Image src={SharedLogo} width='109px' height='27px' />
					</View>

					{isLogged ? (
						<View className='px-2 text-left'>
							<View>
								<Text className='font-sans text-base font-medium leading-6 text-primary'>
									{`${t('home.labelHello')},`}
								</Text>
							</View>
							<View>
								<Text className='font-sans text-base font-medium leading-6 text-primary'>
									{greetingEmail}
								</Text>
							</View>
							<View className='mt-4'>
								<AppActionButton
									variant='outlined'
									label={t('home.labelLeave')}
									onPress={handleLogout}
									isLoading={isLogoutLoading}
									disabled={isLogoutLoading}
								/>
							</View>
						</View>
					) : (
						<>
							<View className='px-2 text-center'>
								<Text className='text-base leading-6 text-[#575756]'>
									{t('home.nonLoginBanner')}
								</Text>
							</View>

							<View className='mt-6'>
								<AppActionButton
									label={t('loginCard.lbOpen')}
									onPress={() => navigate(PAGES.SIGNIN, { redirectTo: 'Home' })}
								/>
							</View>
						</>
					)}

					<View className='mt-6 h-px w-full bg-[#0f0805]/20' />

					<View className='mt-6 flex w-full flex-row flex-wrap justify-between gap-y-2'>
						{visibleCards.map((item) => (
							<View
								key={item.key}
								onClick={item.route ? () => navigate(item.route) : undefined}
								className='h-[97px] w-[calc(50%-4px)] overflow-hidden rounded-2xl bg-[#b0a69b]/20 p-4'>
								<View className='flex h-full flex-col justify-between'>
									<View className='flex w-full flex-row items-center justify-between'>
										<View className='flex h-6 w-6 items-center justify-center'>
											{renderUtilityIcon(item.key)}
										</View>
										<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='text-[#0f0805]/80'>
											<path d='M8 5l8 7-8 7' />
										</svg>
									</View>
									<Text className='w-full text-xs leading-[14px] text-[#0f0805]'>{item.label}</Text>
								</View>
							</View>
						))}
					</View>

					<View className='mt-6 flex h-9 flex-row items-center justify-between'>
						<View className='flex flex-row items-center gap-2'>
							<Image src={homeNotificationsIcon} width='16px' height='16px' />
							<Text className='text-sm leading-5 text-[#0f0805]'>{t('home.notifications')}</Text>
						</View>
						<View
							onClick={handleNotificationToggle}
							className={`flex w-8 rounded-full p-[2px] ${notificationsEnabled ? 'bg-[#0f0805]' : 'bg-[#cec5ba]'} ${isNotificationToggleLoading ? 'opacity-70' : ''}`}>
							<View className={`h-4 w-4 rounded-full bg-white ${notificationsEnabled ? 'ml-3' : ''}`} />
						</View>
					</View>

					{notificationsMessageKey ? (
						<View className='mt-2'>
							<Text className='text-xs leading-4 text-[#9f1111]'>
								{t(notificationsMessageKey)}
							</Text>
						</View>
					) : null}

					<View className='mt-4 h-px w-full bg-[#0f0805]/20' />

					<View className='mt-6 text-center'>
						<Text className='text-lg font-medium text-[#0f0805]'>
							{t('home.helpTitle')}
						</Text>
						<AppActionButton
							label={t('home.helpButton')}
							variant='outlined'
							className='mt-6'
							onPress={() => Eitri.openBrowser({ url: 'https://api.whatsapp.com/send?phone=5511993680367', inApp: true })}
						/>
					</View>

					<View className='mb-4 mt-8 flex w-full items-center justify-center'>
						<PoweredBy />
					</View>
				</View>
			</View>

			<BottomInset />
		</Page>
	)
}



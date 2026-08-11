import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'
import { HeaderContentWrapper, HeaderReturn, HeaderText, BottomInset, AppActionButton, AppCard, AppText, AppDropdown, AppHero, AppToast } from 'wml-store-templates-shared'

import { useEffect, useMemo, useState } from 'react'

import { sendScreenView } from '../services/TrackingService'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { getStoresList } from '../services/StoreService'
import InfiniteScroll from '../components/InfiniteScroll/InfiniteScroll'

const STORE_TYPE_ALL = 'all'
const STORE_TYPE_FRANCHISE = 'franchise'
const STORE_TYPE_RESELLER = 'reseller'
const STORES_BATCH_SIZE = 10

const getPhoneDigits = (rawPhone) => {
	if (!rawPhone) return ''
	return String(rawPhone).replace(/[^0-9]/g, '')
}

const formatPhone = (rawPhone) => {
	const digits = getPhoneDigits(rawPhone)
	if (!digits) return ''

	if (digits.length === 10) {
		return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
	}

	if (digits.length === 11) {
		return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
	}

	return rawPhone
}

const getUniqueOptions = (stores, key) => {
	const values = []
	const registry = new Set()

	stores.forEach((store) => {
		const rawValue = typeof store?.[key] === 'string' ? store[key].trim() : ''
		if (!rawValue) return
		const normalizedValue = rawValue.toLowerCase()
		if (registry.has(normalizedValue)) return
		registry.add(normalizedValue)
		values.push(rawValue)
	})

	return values.map((value) => ({ value, label: value }))
}

export default function Stores() {
	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()
	const PAGE = t('stores.title')

	const [allStores, setAllStores] = useState([])
	const [countryFilter, setCountryFilter] = useState('')
	const [stateFilter, setStateFilter] = useState('')
	const [cityFilter, setCityFilter] = useState('')
	const [storeTypeFilter, setStoreTypeFilter] = useState(STORE_TYPE_ALL)
	const [visibleCount, setVisibleCount] = useState(STORES_BATCH_SIZE)
	const [toastData, setToastData] = useState(null)
	const [storesErrorKey, setStoresErrorKey] = useState('')
	const [isLoadingStores, setIsLoadingStores] = useState(false)

	useEffect(() => {
		sendScreenView(PAGE, 'account.stores')
		addonUserTappedActiveTabListener()
		loadStores()
	}, [])

	const loadStores = async () => {
		setIsLoadingStores(true)
		setStoresErrorKey('')

		const storesResult = await getStoresList()
		const storesData = Array.isArray(storesResult?.data) ? storesResult.data : []

		setAllStores(storesData)

		if (!storesResult?.ok && storesResult?.errorCode) {
			setStoresErrorKey(storesResult.errorCode)
		}

		setIsLoadingStores(false)
	}

	const storeTypeOptions = useMemo(() => ([
		{ value: STORE_TYPE_ALL, label: t('stores.storeTypeAll') },
		{ value: STORE_TYPE_FRANCHISE, label: t('stores.storeTypeFranchise') },
		{ value: STORE_TYPE_RESELLER, label: t('stores.storeTypeReseller') },
	]), [t])

	const countryOptions = useMemo(() => getUniqueOptions(allStores, 'country'), [allStores])

	const storesMatchingCountry = useMemo(() => {
		if (!countryFilter) return allStores
		return allStores.filter((store) => store?.country === countryFilter)
	}, [allStores, countryFilter])

	const stateOptions = useMemo(() => getUniqueOptions(storesMatchingCountry, 'state'), [storesMatchingCountry])

	const storesMatchingState = useMemo(() => {
		if (!stateFilter) return storesMatchingCountry
		return storesMatchingCountry.filter((store) => store?.state === stateFilter)
	}, [storesMatchingCountry, stateFilter])

	const cityOptions = useMemo(() => getUniqueOptions(storesMatchingState, 'city'), [storesMatchingState])

	const filteredStores = useMemo(() => {
		let stores = allStores

		if (countryFilter) {
			stores = stores.filter((store) => store?.country === countryFilter)
		}

		if (stateFilter) {
			stores = stores.filter((store) => store?.state === stateFilter)
		}

		if (cityFilter) {
			stores = stores.filter((store) => store?.city === cityFilter)
		}

		if (storeTypeFilter === STORE_TYPE_FRANCHISE) {
			stores = stores.filter((store) => store?.isFranchise === true)
		}

		if (storeTypeFilter === STORE_TYPE_RESELLER) {
			stores = stores.filter((store) => store?.isFranchise === false)
		}

		return stores
	}, [allStores, countryFilter, stateFilter, cityFilter, storeTypeFilter])

	const visibleStores = useMemo(() => filteredStores.slice(0, visibleCount), [filteredStores, visibleCount])

	const hasMoreVisibleStores = visibleStores.length < filteredStores.length

	useEffect(() => {
		setVisibleCount(STORES_BATCH_SIZE)
	}, [countryFilter, stateFilter, cityFilter, storeTypeFilter])

	const handleCountryChange = (value) => {
		setCountryFilter(value)
		setStateFilter('')
		setCityFilter('')
	}

	const handleStateChange = (value) => {
		setStateFilter(value)
		setCityFilter('')
	}

	const handleCityChange = (value) => {
		setCityFilter(value)
	}

	const loadMoreStores = () => {
		if (!hasMoreVisibleStores || isLoadingStores) return
		setVisibleCount((current) => current + STORES_BATCH_SIZE)
	}

	const getStoresLoadErrorMessage = () => {
		if (storesErrorKey === 'STORES_OFFLINE') {
			return t('stores.fetchErrorOffline')
		}

		if (storesErrorKey === 'STORES_ENDPOINT_NOT_CONFIGURED') {
			return t('stores.fetchErrorConfig')
		}

		return t('stores.fetchError')
	}

	const openStoreWhatsApp = (store) => {
		if (store?.whatsappLink) {
			Eitri.openBrowser({ url: store.whatsappLink, inApp: true })
			return
		}

		if (!store?.phone) return
		const phoneDigits = store.phone.replace(/[^0-9]/g, '')
		if (!phoneDigits) return
		Eitri.openBrowser({ url: `https://wa.me/55${phoneDigits}`, inApp: true })
	}

	const openStorePhone = (store) => {
		const phoneDigits = getPhoneDigits(store?.phone)
		if (!phoneDigits) return
		Eitri.openBrowser({ url: `tel:+55${phoneDigits}`, inApp: false })
	}

	const copyStoreAddress = async (store) => {
		const fullAddress = [store?.address, store?.city].filter(Boolean).join(' - ')
		if (!fullAddress) {
			setToastData({ message: t('stores.copyAddressError'), type: 'error', id: Date.now() })
			return
		}

		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(fullAddress)
				setToastData({ message: t('stores.copyAddressSuccess'), type: 'success', id: Date.now() })
				return
			}

			if (Eitri?.clipboard?.writeText) {
				await Eitri.clipboard.writeText(fullAddress)
				setToastData({ message: t('stores.copyAddressSuccess'), type: 'success', id: Date.now() })
				return
			}

			setToastData({ message: t('stores.copyAddressError'), type: 'error', id: Date.now() })
		} catch (error) {
			console.error('Error copying store address', error)
			setToastData({ message: t('stores.copyAddressError'), type: 'error', id: Date.now() })
		}
	}

	return (
		<Page title={PAGE} className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={PAGE} />
			</HeaderContentWrapper>

			<View className='bg-[#F7F7F7] px-4 pb-6 pt-4'>
				<AppHero
					title={t('stores.title')}
					subtitle={t('stores.heroSubtitle')}
				/>

				<AppCard className='mt-4'>
					<AppText variant='title' className='mb-3'>
						{t('stores.filterBy')}
					</AppText>
					<View className='flex flex-col gap-3'>
						<AppDropdown
							label={t('stores.countryLabel')}
							placeholder={t('stores.countryPlaceholder')}
							value={countryFilter}
							onChange={handleCountryChange}
							options={countryOptions}
						/>

						<AppDropdown
							label={t('stores.stateLabel')}
							placeholder={t('stores.statePlaceholder')}
							value={stateFilter}
							onChange={handleStateChange}
							options={stateOptions}
							disabled={!countryFilter}
						/>

						<AppDropdown
							label={t('stores.cityLabel')}
							placeholder={t('stores.cityPlaceholder')}
							value={cityFilter}
							onChange={handleCityChange}
							options={cityOptions}
							disabled={!countryFilter || !stateFilter}
						/>

						<AppDropdown
							label={t('stores.storeTypeLabel')}
							placeholder={t('stores.storeTypePlaceholder')}
							value={storeTypeFilter}
							onChange={setStoreTypeFilter}
							options={storeTypeOptions}
						/>
					</View>
				</AppCard>

				<View className='mx-auto mt-3 w-full max-w-[360px]'>

					{!isLoadingStores && storesErrorKey && (
						<AppCard>
							<AppText variant='subtitle'>
								{getStoresLoadErrorMessage()}
							</AppText>
							<View className='mt-4'>
								<AppActionButton
									label={t('stores.retryLoad')}
									onPress={loadStores}
								/>
							</View>
						</AppCard>
					)}

					{!isLoadingStores && !storesErrorKey && filteredStores.length === 0 && (
						<AppCard>
							<AppText variant='subtitle'>
								{t('stores.noResults')}
							</AppText>
						</AppCard>
					)}

					<InfiniteScroll onScrollEnd={loadMoreStores} className='flex flex-col gap-3'>
						{visibleStores.map((store) => (
							<AppCard key={store.id} padding='py-4 px-8' className='min-h-[250px] flex flex-col justify-center'>
                <View>
                  <AppText variant='title' className='font-serif'>
                    {store.name}
                  </AppText>
                </View>
                <View>              
                  <AppText variant='subtitle' className='mt-4'>
                    {[store.address, store.city].filter(Boolean).join(' - ')}
                  </AppText>
                </View>

								<View className='mt-2 flex flex-row items-start'>
									<AppText variant='subtitle' className='mr-1 !font-bold'>
										{t('stores.phoneLabel') + ':'}
									</AppText>
									{store?.phone ? (
										<View onClick={() => openStorePhone(store)}>
											<AppText variant='subtitle' className='underline'>
												{formatPhone(store.phone)}
											</AppText>
										</View>
									) : (
										<AppText variant='subtitle'>-</AppText>
									)}
								</View>

								<View className='mt-4'>
									{store?.whatsappLink && (
										<AppActionButton
											onPress={() => openStoreWhatsApp(store)}
											variant='outlined'
											label={t('stores.whatsapp')}
											beforeIcon={(
												<svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor' className='text-primary'>
													<path d='M20.52 3.48A11.84 11.84 0 0012.07 0C5.53 0 .2 5.32.2 11.86c0 2.09.55 4.13 1.6 5.93L0 24l6.38-1.67a11.8 11.8 0 005.7 1.45h.01c6.54 0 11.87-5.32 11.87-11.86 0-3.17-1.23-6.15-3.44-8.44zm-8.45 18.3h-.01a9.8 9.8 0 01-5.01-1.38l-.36-.22-3.79.99 1.01-3.7-.24-.38a9.85 9.85 0 01-1.51-5.23c0-5.44 4.43-9.86 9.87-9.86 2.64 0 5.12 1.03 6.98 2.89a9.8 9.8 0 012.89 6.97c0 5.44-4.43 9.86-9.87 9.86zm5.41-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.68-2.1-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.71.23 1.35.2 1.86.12.57-.09 1.77-.72 2.02-1.41.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z' />
												</svg>
											)}
											textClassName='text-primary'
										/>
									)}

									<AppActionButton
										onPress={() => copyStoreAddress(store)}
										variant='outlined'
										className='border-none'
										label={t('stores.copyAddress')}
										beforeIcon={(
											<svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='text-[#1E120D]'>
												<rect x='9' y='9' width='13' height='13' rx='2' />
												<path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' />
											</svg>
										)}
										textClassName='text-[#1E120D]'
									/>
								</View>
							</AppCard>
						))}
					</InfiniteScroll>

					<View className='mt-8 flex w-full items-center justify-center'>
						<AppActionButton
							label={t('stores.backToTop')}
							onPress={() => Eitri.navigation.backToTop()}
							variant='pill'
							className='border border-[#E6E1DC] bg-white'
							textClassName='text-[#1E120D] font-medium'
						/>
					</View>
				</View>
			</View>

			<BottomInset />
			<AppToast toastData={toastData} onClose={() => setToastData(null)} />
		</Page>
	)
}

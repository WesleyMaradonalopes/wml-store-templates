import Eitri from 'eitri-bifrost'
import { View } from 'eitri-luminus'
import { Vtex } from 'eitri-shopping-vtex-shared'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BottomInset, Loading, Toast } from 'wml-store-templates-shared'

import ImageCarousel from '../components/ImageCarousel/ImageCarousel'
import MainDescription from '../components/MainDescription/MainDescription'
import RelatedProducts from '../components/RelatedProducts/RelatedProducts'
import SkuSelector from '../components/SkuSelector/SkuSelector'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { crashLog, sendScreenView, sendViewItem } from '../services/trackingService'
// import Freight from '../components/Freight/Freight'
// import RichContent from '../components/RichContent/RichContent'
import { useTranslation } from 'eitri-i18n'
import { Image } from 'eitri-luminus'
import { CustomButton, CustomInput } from 'wml-store-templates-shared'
import descubraSuaTacaImage from '../assets/images/descubra-sua-taca.png'
import ActionButton from '../components/ActionButton/ActionButton'
import BuySection from '../components/BuySection/BuySection'
import CustomModal from '../components/CustomModal/CustomModal'
import DescriptionComponent from '../components/Description/DescriptionComponent'
import Freight from '../components/Freight/Freight'
import Header from '../components/Header/Header'
import KitSelector from "../components/KitSelector/KitSelector"
import Similars from '../components/Similars/Similars'
import SizebayCard from '../components/Sizebay/SizebayCard'
import SizebayModal from '../components/Sizebay/SizebayModal'
import SizebayVFRFeedback from '../components/Sizebay/SizebayVFRFeedback'
import WiddeVideo from '../components/Widde/WiddeVideo'
import { startConfigure } from '../services/AppService'
import { saveCartIdOnStorage } from '../services/cartService'
import { getProductById, getProductBySlug, markLastViewedProduct } from '../services/productService'
import { getProductInformation, getRecommendationAnalysis } from '../services/SizebayService'
// import Breadcrumb from '../components/Breadcrumb/Breadcrumb'

export default function Home() {
	const { startCart, setCart } = useLocalShoppingCart()

	const [product, setProduct] = useState(null)
	const [isLoading, setIsLoading] = useState(null)
	const [configLoaded, setConfigLoaded] = useState(false)
	const [defaultSku, setDefaultSku] = useState(null)
	const [currentSku, setCurrentSku] = useState(null)
	const [selectedVariations, setSelectedVariations] = useState([])
	const [sizebayInfo, setSizebayInfo] = useState(null)
	const [showVFRModal, setShowVFRModal] = useState(false)
	const [showChartModal, setShowChartModal] = useState(false)
	const [showTacaInfoModal, setShowTacaInfoModal] = useState(false)
	const [vfrSuggestedSize, setVfrSuggestedSize] = useState(null)
	const [kitState, setKitState] = useState(null)
	const [kitSelectionState, setKitSelectionState] = useState({
		checkedProducts: {},
		selectedSizes: {},
	})
	const [headerHeight, setHeaderHeight] = useState(0)
	const [isMainAddToCartFullyVisible, setIsMainAddToCartFullyVisible] = useState(false)
	const [toastData, setToastData] = useState(null)
	const [showQuickAddModal, setShowQuickAddModal] = useState(false)
	const [showZoomModal, setShowZoomModal] = useState(false)
	const [showUnavailableSkuModal, setShowUnavailableSkuModal] = useState(false)
	const [unavailableSkuInfo, setUnavailableSkuInfo] = useState(null)
	const [notifyForm, setNotifyForm] = useState({
		name: '',
		email: '',
	})
	const [notifyErrors, setNotifyErrors] = useState({
		name: '',
		email: '',
	})
	const [notifySuccess, setNotifySuccess] = useState(false)
	const { t } = useTranslation()
	const isUnavailableSkuModalEnabled = false

	const sizebayInfoRef = useRef(null)

	// Temporary mitigation: some runtime flows override DaisyUI tokens and turn text-primary gray.
	// We re-apply the brand primary tokens on PDP mount/resume until the upstream source is fixed.
	const ensurePrimaryThemeToken = useCallback(() => {
		if (typeof document === 'undefined') return
		const root = document.documentElement
		root.style.setProperty('--p', '20 40% 8%')
		root.style.setProperty('--pc', '0 0% 100%')
		root.style.setProperty('--fallback-p', '#1e120d')
		root.style.setProperty('--fallback-pc', '#ffffff')
	}, [])

	useEffect(() => {
		sizebayInfoRef.current = sizebayInfo
	}, [sizebayInfo])

	useEffect(() => {
		window.scroll(0, 0)
		ensurePrimaryThemeToken()

		startHome()

		Eitri.navigation.addOnResumeListener(() => {
			ensurePrimaryThemeToken()
			startHome()
		})
	}, [ensurePrimaryThemeToken])

	useEffect(() => {
		const handleSizebayMessage = async (event) => {
			if (event?.origin && !String(event.origin).includes('sizebay.technology')) return

			if (event?.data === 'szb-recommendation-done-in-app') {
				const info = sizebayInfoRef.current
				if (!info?.id) return
				try {
					const analysis = await getRecommendationAnalysis(info.id)
					const size = analysis?.recommendedSize
					if (size) setVfrSuggestedSize(size)
				} catch (e) {
					crashLog('pdp.home.sizebayRecommendationAnalysis', e)
				}
			}
		}

		window.addEventListener('message', handleSizebayMessage)
		return () => {
			window.removeEventListener('message', handleSizebayMessage)
		}
	}, [])

	useEffect(() => {
		let resizeObserver = null
		let mutationObserver = null

		const observeHeader = () => {
			const element = document.getElementById('header')
			if (!element) return false

			setHeaderHeight(element.offsetHeight || 0)

			resizeObserver?.disconnect()
			resizeObserver = new ResizeObserver(([entry]) => {
				setHeaderHeight(entry.target?.offsetHeight || 0)
			})
			resizeObserver.observe(element)

			return true
		}

		if (!observeHeader()) {
			mutationObserver = new MutationObserver(() => {
				if (observeHeader()) {
					mutationObserver.disconnect()
				}
			})

			mutationObserver.observe(document.body, {
				childList: true,
				subtree: true,
			})
		}

		return () => {
			resizeObserver?.disconnect()
			mutationObserver?.disconnect()
		}
	}, [])

	useEffect(() => {
		setIsMainAddToCartFullyVisible(false)

		let intersectionObserver = null
		let mutationObserver = null

		const observeMainAddToCart = () => {
			const element = document.getElementById('pdp-main-add-to-cart')
			if (!element) return false

			intersectionObserver?.disconnect()
			intersectionObserver = new IntersectionObserver(
				([entry]) => {
					const intersectionRatio = entry?.intersectionRatio ?? 0
					setIsMainAddToCartFullyVisible(intersectionRatio >= 0.99)
				},
				{
					threshold: [0, 1],
					rootMargin: `-${headerHeight}px 0px 0px 0px`,
				},
			)

			intersectionObserver.observe(element)
			return true
		}

		if (!observeMainAddToCart()) {
			mutationObserver = new MutationObserver(() => {
				if (observeMainAddToCart()) {
					mutationObserver.disconnect()
				}
			})

			mutationObserver.observe(document.body, {
				childList: true,
				subtree: true,
			})
		}

		return () => {
			intersectionObserver?.disconnect()
			mutationObserver?.disconnect()
		}
	}, [product, headerHeight])

	const startHome = async () => {
		setIsLoading(true)

		const startParams = await Eitri.getInitializationInfos()

		let product = await startParams.product

		if (product) {
			initializeProductState(product)
			setIsLoading(false)
			startSizebay(product)
		}

		await loadConfigs()

		if (!product) {
			product = await loadProduct(startParams)
		}

		if (product) {
			initializeProductState(product)
			setIsLoading(false)
			startSizebay(product)
		}

		await loadCart(startParams)

		sendScreenView('PDP', 'home')
		sendViewItem(product)
		markLastViewedProduct(product)
	}

	const findAvailableSKU = (product) => {
		const availableSku = product.items.find((item) =>
			item.sellers.some((seller) => seller.commertialOffer?.AvailableQuantity > 0),
		)
		return availableSku || product.items[0]
	}

	const normalizeVariation = (item, variation) => {
		return typeof variation === 'string' ? { name: variation, values: item?.[variation] } : variation
	}

	const findMatchingSKU = (product, desiredVariations = []) => {
		if (!product?.items?.length || desiredVariations.length === 0) return null

		const matchingSkus = product.items.filter((item) =>
			desiredVariations.every((desiredVariation) =>
				item.variations?.some((variation) => {
					const normalizedVariation = normalizeVariation(item, variation)
					return (
						normalizedVariation?.name === desiredVariation.variation &&
						normalizedVariation?.values?.[0] === desiredVariation.value
					)
				}),
			),
		)

		return (
			matchingSkus.find((item) =>
				item.sellers.some((seller) => seller.commertialOffer?.AvailableQuantity > 0),
			) || matchingSkus[0] || null
		)
	}

	const isSkuAvailable = (item) => {
		return item?.sellers?.some((seller) => seller.commertialOffer?.AvailableQuantity > 0)
	}

	const getRequiredVariationNames = (product) => {
		if (!product?.items?.length) return []

		const variationsMap = product.items.reduce((acc, item) => {
			item.variations?.forEach((variation) => {
				const normalizedVariation = normalizeVariation(item, variation)
				const name = normalizedVariation?.name
				const value = normalizedVariation?.values?.[0]

				if (!name || !value) return

				if (!acc.has(name)) {
					acc.set(name, new Set())
				}

				acc.get(name).add(value)
			})

			return acc
		}, new Map())

		return Array.from(variationsMap.entries())
			.filter(([, values]) => values.size > 1)
			.map(([name]) => name)
	}

	const hasVariationValue = (targetProduct, desiredVariation) => {
		return targetProduct?.items?.some((item) =>
			item.variations?.some((variation) => {
				const normalizedVariation = normalizeVariation(item, variation)
				return (
					normalizedVariation?.name === desiredVariation.variation &&
					normalizedVariation?.values?.[0] === desiredVariation.value
				)
			}),
		)
	}

	const initializeProductState = (nextProduct, desiredVariations = []) => {
		const initialSku = findAvailableSKU(nextProduct)
		const nextRequiredVariationNames = getRequiredVariationNames(nextProduct)
		const preservedVariations = desiredVariations.filter(
			(desiredVariation) =>
				nextRequiredVariationNames.includes(desiredVariation.variation) &&
				hasVariationValue(nextProduct, desiredVariation),
		)
		const matchedSku = findMatchingSKU(nextProduct, preservedVariations)

		setProduct(nextProduct)
		setDefaultSku(initialSku)
		setCurrentSku(matchedSku || initialSku)
		setSelectedVariations(preservedVariations)
	}

	const requiredVariationNames = useMemo(() => getRequiredVariationNames(product), [product])
	const isSkuSelectionComplete =
		requiredVariationNames.length === 0 ||
		requiredVariationNames.every((variationName) =>
			selectedVariations.some((variation) => variation.variation === variationName),
		)

	const getSizesInStock = (product) => {
		if (!product?.items?.length) return []
		const first = product.items[0].variations?.[0]
		if (!first) return []
		const name = first.name
		const values = new Set()
		product.items.forEach((item) => {
			const v = item.variations?.find((x) => x.name === name)
			if (v?.values?.[0]) values.add(v.values[0])
		})

		return Array.from(values)
	}

	const startSizebay = async (product) => {
		if (!product?.linkText) return
		setVfrSuggestedSize(null)
		const sizesInStock = getSizesInStock(product)
		try {
			const permalink = `${product.linkText}/p`
			const _sizebayInfo = await getProductInformation(permalink, sizesInStock)

			if (_sizebayInfo) setSizebayInfo(_sizebayInfo)
		} catch (e) {
			crashLog('pdp.home.startSizebay', e)
		}
	}

	const openVirtualFittingRoom = () => setShowVFRModal(true)
	const openChart = () => setShowChartModal(true)
	const openTacaInfoModal = () => setShowTacaInfoModal(true)

	const showFloatingActionButton = !isMainAddToCartFullyVisible
	const handleCloseVFRModal = () => setShowVFRModal(false)
	const handleCloseChartModal = () => setShowChartModal(false)
	const handleCloseTacaInfoModal = () => setShowTacaInfoModal(false)
	const handleCloseUnavailableSkuModal = () => {
		setShowUnavailableSkuModal(false)
		setUnavailableSkuInfo(null)
		setNotifySuccess(false)
		setNotifyForm({
			name: '',
			email: '',
		})
		setNotifyErrors({
			name: '',
			email: '',
		})
	}

	const handleNotifyInputChange = (field) => (event) => {
		const value = event?.target?.value ?? ''
		setNotifyForm((previousValue) => ({
			...previousValue,
			[field]: value,
		}))
		setNotifyErrors((previousValue) => ({
			...previousValue,
			[field]: '',
		}))
	}

	const isValidEmail = (email = '') => {
		return /^\S+@\S+\.\S+$/.test(String(email).trim())
	}

	const handleNotifyMeClick = async () => {
		const nextErrors = {
			name: '',
			email: '',
		}

		if (!String(notifyForm.name).trim()) {
			nextErrors.name = 'Por favor, digite seu nome.'
		}

		if (!isValidEmail(notifyForm.email)) {
			nextErrors.email = 'Por favor, insira um e-mail válido.'
		}

		setNotifyErrors(nextErrors)

		const hasErrors = Object.values(nextErrors).some(Boolean)
		if (hasErrors) return

		const skuId = String(unavailableSkuInfo?.skuId || currentSku?.itemId || '')
		const selectedSeller =
			currentSku?.itemId === unavailableSkuInfo?.skuId
				? currentSku?.sellers?.find((seller) => seller?.sellerId === unavailableSkuInfo?.sellerId) ||
				currentSku?.sellers?.[0]
				: currentSku?.sellers?.[0]
		const sellerId = String(unavailableSkuInfo?.sellerId || selectedSeller?.sellerId || '')
		const sellerName = String(unavailableSkuInfo?.sellerName || selectedSeller?.sellerName || '')
		const subscriberName = String(notifyForm.name).trim()
		const subscriberEmail = String(notifyForm.email).trim()

		if (!skuId || !sellerId || !sellerName) {
			setNotifyErrors((previousValue) => ({
				...previousValue,
				email: 'Não foi possível identificar o vendedor deste item. Tente novamente.',
			}))
			return
		}

		if (typeof Vtex?.stockAlert?.subscribeAvailability !== 'function') {
			setNotifyErrors((previousValue) => ({
				...previousValue,
				email: 'Serviço de aviso indisponível no momento.',
			}))
			crashLog('pdp.home.subscribeAvailabilityMissingMethod', {
				hasStockAlert: Boolean(Vtex?.stockAlert),
				typeofSubscribeAvailability: typeof Vtex?.stockAlert?.subscribeAvailability,
			})
			return
		}

		try {
			await Vtex.stockAlert.subscribeAvailability(
				skuId,
				subscriberName,
				subscriberEmail,
				sellerId,
				sellerName,
			)
		} catch (error) {
			const errorMessage = String(
				error?.message ||
				error?.response?.data?.message ||
				error?.response?.data?.error ||
				error?.networkError?.message ||
				'',
			)
			const ownErrorProps = {}
			Object.getOwnPropertyNames(error || {}).forEach((key) => {
				ownErrorProps[key] = error[key]
			})
			console.error('Erro ao cadastrar notificação de estoque', {
				message: errorMessage,
				errorName: error?.name,
				errorType: typeof error,
				errorKeys: Object.keys(error || {}),
				ownErrorProps,
				graphQLErrors: error?.graphQLErrors,
				networkError: error?.networkError,
				responseStatus: error?.response?.status,
				responseData: error?.response?.data,
				skuId,
				sellerId,
				sellerName,
			})

			crashLog('pdp.home.subscribeAvailability', {
				message: errorMessage || 'empty-error-message',
				errorName: error?.name,
				responseStatus: error?.response?.status,
				responseData: error?.response?.data,
				skuId,
				sellerId,
				sellerName,
			})
			setNotifyErrors((previousValue) => ({
				...previousValue,
				email: 'Não foi possível cadastrar o aviso. Tente novamente.',
			}))
			return
		}

		setNotifySuccess(true)
	}

	const showToast = (message, type = 'success') => {
		setToastData({
			id: Date.now(),
			message,
			type
		})
	}

	const handleToastClose = useCallback(() => {
		setToastData(null)
	}, [])

	const loadProduct = async (startParams) => {
		try {
			if (startParams.productId) {
				return await getProductById(startParams.productId)
			}
			if (startParams.slug) {
				return await getProductBySlug(startParams.slug)
			}
		} catch (e) {
			console.error('loadProduct: Error', e)
			return null
		}
	}

	const loadCart = async (startParams) => {
		if (startParams?.orderFormId) {
			await saveCartIdOnStorage(startParams?.orderFormId)
		}
		await startCart()
	}

	const loadConfigs = async () => {
		try {
			await startConfigure()
			setConfigLoaded(true)
		} catch (e) {
			crashLog('Erro ao buscar configurações', e)
			crashLog()
		}
	}

	const onProductChange = (newProduct) => {
		initializeProductState(newProduct, selectedVariations)
		setKitSelectionState({
			checkedProducts: {},
			selectedSizes: {},
		})
	}

	const onSkuChange = (newDesiredVariations) => {
		setSelectedVariations(newDesiredVariations)

		if (!newDesiredVariations.length) {
			setCurrentSku(defaultSku || findAvailableSKU(product))
			return
		}

		const productSku = findMatchingSKU(product, newDesiredVariations)

		if (productSku && !isSkuAvailable(productSku)) {
			if (!isUnavailableSkuModalEnabled) {
				setCurrentSku(productSku || defaultSku || findAvailableSKU(product))
				return
			}

			const selectedSeller = productSku?.sellers?.[0]
			const selectedSize = newDesiredVariations.find(
				(variation) => String(variation?.variation).toLowerCase() === 'tamanho',
			)
			const lastSelectedVariation = newDesiredVariations[newDesiredVariations.length - 1]

			setUnavailableSkuInfo({
				skuId: productSku?.itemId,
				sellerId: selectedSeller?.sellerId,
				sellerName: selectedSeller?.sellerName,
				variationName: selectedSize?.variation || lastSelectedVariation?.variation,
				valueName: selectedSize?.value || lastSelectedVariation?.value || '',
			})
			setShowUnavailableSkuModal(true)
			return
		}

		setCurrentSku(productSku || defaultSku || findAvailableSKU(product))
	}

	const handleKitSelectionStateChange = useCallback((nextState) => {
		setKitSelectionState((previousValue) => {
			const nextChecked = nextState?.checkedProducts ?? {}
			const nextSizes = nextState?.selectedSizes ?? {}
			const previousChecked = previousValue?.checkedProducts ?? {}
			const previousSizes = previousValue?.selectedSizes ?? {}

			const checkedUnchanged = JSON.stringify(previousChecked) === JSON.stringify(nextChecked)
			const sizesUnchanged = JSON.stringify(previousSizes) === JSON.stringify(nextSizes)

			if (checkedUnchanged && sizesUnchanged) return previousValue

			return {
				checkedProducts: nextChecked,
				selectedSizes: nextSizes,
			}
		})
	}, [])

	const onUnavailableSkuClick = (skuInfo) => {
		if (!isUnavailableSkuModalEnabled) return

		setUnavailableSkuInfo(skuInfo)
		setShowUnavailableSkuModal(true)
	}

	return (
		<Page
			title='Página de produto'
			className='font-sans text-base text-primary'>
			{!showZoomModal && <Header
				product={product}
				configLoaded={configLoaded}
				onWishlistFeedback={showToast}
			/>}

			<Loading
				isLoading={isLoading}
				fullScreen
			/>

			{product && (
				<>
					<View className='relative'>
						<View className='pb-4'>
							{/* <Breadcrumb product={product} /> */}

							<View className='relative'>
								<ImageCarousel currentSku={currentSku} isZoomModalOpen={showZoomModal} setIsZoomModalOpen={setShowZoomModal} />
								<WiddeVideo product={product} />
							</View>

							<View className='mt-4 px-4'>
								<MainDescription
									product={product}
									currentSku={currentSku}
								/>
							</View>

							{configLoaded &&
								<View className='mt-4 px-4'>
									<Similars
										product={product}
										onProductChange={onProductChange}
									/>
								</View>
							}

							<View className='mt-4 flex flex-col gap-4 px-4'>
								{!kitState?.isLoading && !kitState?.hasKit && (
									<SkuSelector
										currentSku={currentSku}
										product={product}
										selectedVariations={selectedVariations}
										onSkuChange={onSkuChange}
										onUnavailableSkuClick={onUnavailableSkuClick}
										onTacaInfoClick={openTacaInfoModal}
										showLabel={true}
									/>
								)}

								{vfrSuggestedSize && !showVFRModal && (
									<SizebayVFRFeedback suggestedSize={vfrSuggestedSize} />
								)}

								{configLoaded && (
									<KitSelector
										productId={product.productId}
										onSelectionChange={setKitState}
										selectionState={kitSelectionState}
										onSelectionStateChange={handleKitSelectionStateChange}
									/>
								)}

								{(sizebayInfo?.linkChart || sizebayInfo?.linkVFR) && (
									<SizebayCard
										openVFR={openVirtualFittingRoom}
										openChart={openChart}
										showVFR={sizebayInfo?.linkVFR}
										showChart={sizebayInfo?.linkChart}
									/>
								)}
							</View>

							<View className={`flex flex-col gap-4 ${(sizebayInfo?.linkChart || sizebayInfo?.linkVFR) ? 'mt-8' : 'mt-4'}`}>
								{configLoaded && <Freight currentSku={currentSku} />}
								<DescriptionComponent product={product} />
							</View>

							{configLoaded && (
								<>
									<RelatedProducts product={product} />
								</>
							)}

							{/* Offset para o botão flutuante não sobrepor o conteúdo final da PDP */}
							<View className='w-full'>
								<View className='h-[77px] w-full' />
								<BottomInset />
							</View>
						</View>

						{/* <ActionButton
							product={product}
							currentSku={currentSku}
							onSkuChange={onSkuChange}
							isVisible={showFloatingActionButton}
							onCartFeedback={showToast}
						/> */}

						<ActionButton
							isVisible={showFloatingActionButton}
							product={product}
							currentSku={currentSku}
							modalContent={
								<View className="max-h-[85vh] overflow-y-auto bg-white rounded-t-[16px] pb-4">
									<View className="mx-[34px] mt-[13px] mb-[22px]">
										<Text className="font-sans text-sm leading-[150%] text-[#0F0805]">
											<Text className="font-normal">Tamanho: </Text>
											<Text className="font-semibold">Escolha um tamanho</Text>
										</Text>
									</View>
									{!kitState?.isLoading && !kitState?.hasKit && (
										<View className='mt-4 px-[34px]'>
											<SkuSelector
												currentSku={currentSku}
												product={product}
												selectedVariations={selectedVariations}
												onSkuChange={onSkuChange}
												onUnavailableSkuClick={onUnavailableSkuClick}
												onTacaInfoClick={openTacaInfoModal}
												showLabel={true}
											/>
										</View>
									)}

									{configLoaded && (
										<View className='mt-8 px-[34px]'>
											<KitSelector
												showLabel={false}
												productId={product.productId}
												onSelectionChange={setKitState}
												selectionState={kitSelectionState}
												onSelectionStateChange={handleKitSelectionStateChange}
												suppressInitialNotify={true}
												isInsideActionButton={true}
											/>
										</View>
									)}

									<BuySection
										product={product}
										currentSku={currentSku}
										requiredVariationNames={requiredVariationNames}
										isSkuSelectionComplete={isSkuSelectionComplete}
										kitState={kitState}
										onCartFeedback={showToast}
									/>

									<BottomInset />
								</View>
							}
						/>

						<Toast
							toastData={{
								triggerId: toastData?.id,
								id: toastData?.id,
								message: toastData?.message,
								type: toastData?.type
							}}
							bottomClassName='bottom-[77px]'
							widthClassName='w-[80%]'
							showBottomInset
							onClose={handleToastClose}
						/>

						<BottomInset />
					</View>

					{sizebayInfo?.linkVFR && (
						<SizebayModal
							frameUrl={sizebayInfo.linkVFR}
							showModal={showVFRModal}
							onClose={handleCloseVFRModal}
						/>
					)}

					<CustomModal
						open={showTacaInfoModal}
						onClose={handleCloseTacaInfoModal}>
						<View
							onClick={(e) => e.stopPropagation()}
							className='relative mx-4 self-center flex w-full max-w-[420px] items-center justify-center rounded-[16px] bg-[#FFFFFF] p-3'>
							<View
								onClick={handleCloseTacaInfoModal}
								className='absolute right-[10px] top-[5px] z-10 flex h-8 w-8 items-center justify-center'>
								<svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
									<path
										d='M20.4233 3.50012C20.4333 3.50014 20.4434 3.50216 20.4526 3.50598C20.4618 3.50982 20.47 3.51558 20.4771 3.52258C20.484 3.52951 20.4898 3.53769 20.4937 3.547C20.4975 3.55625 20.4995 3.56635 20.4995 3.57629C20.4995 3.58626 20.4975 3.5963 20.4937 3.60559C20.4898 3.61494 20.484 3.62306 20.4771 3.63L12.4614 11.6447L12.1079 11.9982L12.4614 12.3527L20.4761 20.3702C20.4903 20.3845 20.4985 20.4037 20.4985 20.424C20.4985 20.4442 20.4903 20.4634 20.4761 20.4777C20.4618 20.4919 20.4425 20.5001 20.4224 20.5001C20.4022 20.5001 20.3829 20.4919 20.3687 20.4777L12.353 12.463L11.9995 12.1095L11.646 12.463L3.63037 20.4777C3.61605 20.492 3.59594 20.5001 3.57568 20.5001C3.55551 20.5001 3.53624 20.4919 3.52197 20.4777C3.50761 20.4633 3.49954 20.444 3.49951 20.424C3.49951 20.4039 3.50764 20.3846 3.52197 20.3702L11.5386 12.3527L11.8921 11.9982L11.5386 11.6447L3.52295 3.63C3.50855 3.61561 3.50049 3.59638 3.50049 3.57629C3.50051 3.55625 3.50858 3.53695 3.52295 3.52258C3.53725 3.50834 3.55646 3.50012 3.57666 3.50012C3.59687 3.50014 3.61607 3.50832 3.63037 3.52258L11.646 11.5372L11.9995 11.8907L12.353 11.5372L20.3696 3.52258C20.3767 3.51559 20.3848 3.5098 20.394 3.50598C20.4033 3.50215 20.4133 3.50012 20.4233 3.50012Z'
										fill='#0F0805'
										stroke='#0F0805'
									/>
								</svg>
							</View>
							<Image
								src={descubraSuaTacaImage}
								className='h-auto w-full rounded-md'
							/>
						</View>
					</CustomModal>

					{isUnavailableSkuModalEnabled && (
						<CustomModal
							open={showUnavailableSkuModal}
							onClose={handleCloseUnavailableSkuModal}>
							<View
								onClick={(event) => event.stopPropagation()}
								className='relative w-full max-w-[420px] rounded-t-[16px] bg-[#F7F7F7] px-8 pb-6 pt-6'>
								<View
									onClick={handleCloseUnavailableSkuModal}
									className='absolute right-5 top-5 z-10 flex h-6 w-6 items-center justify-center'>
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M20.4238 3.50012C20.4338 3.50014 20.4439 3.50216 20.4531 3.50598C20.4623 3.50982 20.4705 3.51558 20.4775 3.52258C20.4845 3.52951 20.4903 3.53769 20.4941 3.547C20.498 3.55625 20.5 3.56635 20.5 3.57629C20.5 3.58626 20.498 3.5963 20.4941 3.60559C20.4903 3.61494 20.4845 3.62306 20.4775 3.63L12.4619 11.6447L12.1084 11.9982L12.4619 12.3527L20.4766 20.3702C20.4908 20.3845 20.499 20.4037 20.499 20.424C20.499 20.4442 20.4908 20.4634 20.4766 20.4777C20.4623 20.4919 20.443 20.5001 20.4229 20.5001C20.4027 20.5001 20.3834 20.4919 20.3691 20.4777L12.3535 12.463L12 12.1095L11.6465 12.463L3.63086 20.4777C3.61654 20.492 3.59643 20.5001 3.57617 20.5001C3.556 20.5001 3.53673 20.4919 3.52246 20.4777C3.5081 20.4633 3.50003 20.444 3.5 20.424C3.5 20.4039 3.50813 20.3846 3.52246 20.3702L11.5391 12.3527L11.8926 11.9982L11.5391 11.6447L3.52344 3.63C3.50904 3.61561 3.50098 3.59638 3.50098 3.57629C3.501 3.55625 3.50906 3.53695 3.52344 3.52258C3.53774 3.50834 3.55695 3.50012 3.57715 3.50012C3.59736 3.50014 3.61656 3.50832 3.63086 3.52258L11.6465 11.5372L12 11.8907L12.3535 11.5372L20.3701 3.52258C20.3772 3.51559 20.3853 3.5098 20.3945 3.50598C20.4038 3.50215 20.4138 3.50012 20.4238 3.50012Z" fill="#0F0805" stroke="#0F0805" />
									</svg>

								</View>

								{notifySuccess ? (
									<View className='flex w-full flex-col gap-4'>
										<Text className='pr-8 font-sans text-[16px] font-semibold leading-[150%] text-[#0F0805]'>
											Cadastrado com sucesso!
										</Text>

										<Text className='text-[14px] font-normal leading-[20px] text-[#1E120D]' style={{ fontFamily: 'Montserrat' }}>
											Avisaremos por e-mail quando o tamanho estiver disponível.
										</Text>
									</View>
								) : (
									<>
										<View className='flex w-full flex-col gap-4'>
											<Text className='pr-8 font-sans text-[16px] font-semibold leading-[150%] text-[#0F0805]'>
												{`${t('skuUnavailableModal.titlePrefix')} ${unavailableSkuInfo?.valueName ?? ''} ${t('skuUnavailableModal.titleSuffix')}`}
											</Text>

											<Text className='text-[14px] font-normal leading-[20px] text-[#1E120D]' style={{ fontFamily: 'Montserrat' }}>
												{t('skuUnavailableModal.description')}
											</Text>
										</View>

										<View className='mt-4 flex flex-col gap-3'>
											<View className='flex flex-col gap-1'>
												<Text className='text-[12px] font-normal leading-[14px] text-[#1E120D]' style={{ fontFamily: 'Montserrat' }}>
													{t('skuUnavailableModal.nameLabel')}
												</Text>
												<CustomInput
													type='text'
													value={notifyForm.name}
													onChange={handleNotifyInputChange('name')}
													className={`h-[48px] rounded-[8px] !border !bg-transparent px-3 text-sm text-[#1E120D] ${notifyErrors.name ? '!border-[#C42C21]' : '!border-[#A49A8E]'
														}`}
												/>
												{notifyErrors.name && (
													<Text className='text-[12px] font-normal leading-[14px] text-[#C42C21]' style={{ fontFamily: 'Montserrat' }}>
														{notifyErrors.name}
													</Text>
												)}
											</View>

											<View className='flex flex-col gap-1'>
												<Text className='text-[12px] font-normal leading-[14px] text-[#1E120D]' style={{ fontFamily: 'Montserrat' }}>
													{t('skuUnavailableModal.emailLabel')}
												</Text>
												<CustomInput
													type='email'
													value={notifyForm.email}
													onChange={handleNotifyInputChange('email')}
													className={`h-[48px] rounded-[8px] !border !bg-transparent px-3 text-sm text-[#1E120D] ${notifyErrors.email ? '!border-[#C42C21]' : '!border-[#A49A8E]'
														}`}
												/>
												{notifyErrors.email && (
													<Text className='text-[12px] font-normal leading-[14px] text-[#C42C21]' style={{ fontFamily: 'Montserrat' }}>
														{notifyErrors.email}
													</Text>
												)}
											</View>
										</View>

										<View className='mt-4'>
											<CustomButton
												className='h-11 w-full rounded-[6px] !bg-[#1E120D] !text-white'
												onClick={handleNotifyMeClick}>
												<View className='flex flex-row items-center justify-center gap-2'>
													<Text className='text-center text-[14px] font-semibold leading-[20px] text-white' style={{ fontFamily: 'Montserrat' }}>
														Avise-me
													</Text>
													<svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
														<path
															d='M8.5834 17.4957C8.72289 17.7494 8.92794 17.9609 9.17714 18.1082C9.42635 18.2555 9.71057 18.3333 10.0001 18.3333C10.2896 18.3333 10.5738 18.2555 10.823 18.1082C11.0722 17.9609 11.2772 17.7494 11.4168 17.4957M5 6.66528C5 5.33955 5.52678 4.06813 6.46447 3.1307C7.40215 2.19327 8.67391 1.66663 10 1.66663C11.3261 1.66663 12.5978 2.19327 13.5355 3.1307C14.4732 4.06813 15 5.33955 15 6.66528C15 12.4971 17.5 14.1633 17.5 14.1633H2.5C2.5 14.1633 5 12.4971 5 6.66528Z'
															stroke='white'
															strokeLinecap='round'
															strokeLinejoin='round'
														/>
													</svg>
												</View>
											</CustomButton>
										</View>
									</>
								)}
							</View>
						</CustomModal>
					)}

					{sizebayInfo?.linkChart && (
						<SizebayModal
							frameUrl={sizebayInfo.linkChart}
							showModal={showChartModal}
							onClose={handleCloseChartModal}
						/>
					)}
				</>
			)}
		</Page>
	)
}

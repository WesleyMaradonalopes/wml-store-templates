import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'
import { HeaderContentWrapper, HeaderReturn, HeaderText, BottomInset, AppActionButton, AppCard, AppText, AppHero, AppToast, getCmsContent } from 'wml-store-templates-shared'
import { Vtex } from 'eitri-shopping-vtex-shared'

import { useEffect, useState } from 'react'

import { sendScreenView } from '../services/TrackingService'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'

const DEFAULT_COUPONS_HERO_IMAGE = 'https://placehold.co/720x262'
const MULTIPLE_IMAGE_BANNER_SECTION = 'MultipleImageBanner'
const COUPONS_CMS_CONTENT_TYPE = 'landingPage'
const COUPONS_CMS_PAGE_NAME = 'cupons'

const normalizeCouponItem = (coupon, index) => ({
	id: coupon?.id || coupon?.couponId || `coupon-${index + 1}`,
	title: coupon?.title || coupon?.name || '',
	expiresAt: coupon?.expiresAt || coupon?.validUntil || coupon?.validity || '',
	description: coupon?.description || coupon?.details || '',
	code: coupon?.code || coupon?.coupon || coupon?.couponCode || '',
})

const extractCouponsFromCms = (cmsContent) => {
	if (!cmsContent) return []

	const sectionItems = (cmsContent?.sections || []).flatMap((section) => {
		const data = section?.data || {}
		const candidates = [data?.coupons, data?.items, data?.list, data?.entries]

		for (const candidate of candidates) {
			if (Array.isArray(candidate)) {
				return candidate
			}
		}

		return []
	})

	const settingsCoupons = Array.isArray(cmsContent?.settings?.coupons) ? cmsContent.settings.coupons : []
	const allCoupons = [...sectionItems, ...settingsCoupons]

	if (!allCoupons.length) {
		return []
	}

	return allCoupons.map(normalizeCouponItem).filter((item) => item.title || item.code)
}

const extractCouponsHeroImage = (cmsContent) => {
	if (!cmsContent) return ''

	for (const section of cmsContent?.sections || []) {
		if (section?.name !== MULTIPLE_IMAGE_BANNER_SECTION) {
			continue
		}

		const data = section?.data || {}
		const imageFromArray = Array.isArray(data?.images)
			? data.images[0]?.imageUrl || data.images[0]?.desktopImage || data.images[0]?.mobileImage || data.images[0]?.image
			: ''

		const imageCandidate =
			data?.heroImage ||
			data?.backgroundImage ||
			data?.image ||
			imageFromArray ||
			''

		if (typeof imageCandidate === 'string' && imageCandidate) {
			return imageCandidate
		}
	}

	return ''
}

export default function Coupons() {
	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()
	const PAGE = t('coupons.title')

	const [coupons, setCoupons] = useState([])
	const [expandedCoupons, setExpandedCoupons] = useState({})
	const [toastData, setToastData] = useState(null)
	const [heroBackgroundImage, setHeroBackgroundImage] = useState(DEFAULT_COUPONS_HERO_IMAGE)

	useEffect(() => {
		sendScreenView(PAGE, 'account.coupons')
		addonUserTappedActiveTabListener()
		loadCoupons()
	}, [])

	const loadCoupons = async () => {
		const { faststore } = Vtex.configs
		const cmsContent = await getCmsContent('landingPage', 'cupons', faststore)

		const cmsHeroImage = extractCouponsHeroImage(cmsContent)
		if (cmsHeroImage) {
			setHeroBackgroundImage(cmsHeroImage)
		}

		const cmsCoupons = extractCouponsFromCms(cmsContent)
		setCoupons(cmsCoupons)
	}

	const toggleCoupon = (couponId) => {
		setExpandedCoupons((previous) => ({
			...previous,
			[couponId]: !previous[couponId],
		}))
	}

	const copyCouponCode = async (couponCode) => {
		if (!couponCode) {
			setToastData({ message: t('coupons.copyError'), id: Date.now() })
			return
		}

		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(couponCode)
				setToastData({ message: t('coupons.copySuccess'), id: Date.now() })
				return
			}

			if (Eitri?.clipboard?.writeText) {
				await Eitri.clipboard.writeText(couponCode)
				setToastData({ message: t('coupons.copySuccess'), id: Date.now() })
				return
			}

			setToastData({ message: t('coupons.copyError'), id: Date.now() })
		} catch (error) {
			console.error('Error copying coupon code', error)
			setToastData({ message: t('coupons.copyError'), id: Date.now() })
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
					title={t('coupons.title')}
					subtitle={`${t('coupons.heroSubtitleLine1')}\n${t('coupons.heroSubtitleLine2')}`}
					className='h-[262px] px-4'
					backgroundImage={heroBackgroundImage}
					backgroundOverlay='linear-gradient(0deg, rgba(15,8,5,0.45), rgba(15,8,5,0.45))'
				/>

				<View className='mx-auto mt-4 w-full max-w-[360px]'>
					<AppCard>
						{coupons.length === 0 && (
							<AppText variant='subtitle'>
								{t('coupons.noResults')}
							</AppText>
						)}

						{coupons.map((coupon, index) => {
							const isExpanded = Boolean(expandedCoupons[coupon.id])

							return (
								<View key={coupon.id}>
									{index > 0 && <View className='my-4 h-px w-full bg-[#E6E1DC]' />}
									<View>
									<AppText className='uppercase font-sans text-[15px] font-semibold leading-[22px] text-[#1E120D]'>
										{coupon.title}
									</AppText>
									</View>

									{coupon.expiresAt && (
										<AppText className='mt-1 font-sans text-[10px] leading-[14px] text-[#7F7670]'>
											{`${t('coupons.validUntil')} ${coupon.expiresAt}`}
										</AppText>
									)}

									<View className='mt-2 flex w-full flex-row items-start gap-2'>
										<View onClick={() => toggleCoupon(coupon.id)} className='relative flex-1' style={{ maxHeight: isExpanded ? 'none' : 45, overflow: isExpanded ? 'visible' : 'hidden' }}>
											<AppText variant='subtitle'>
												{coupon.description}
											</AppText>

											{!isExpanded && (
												<View
													className='pointer-events-none absolute bottom-0 left-0 right-0 h-5'
													style={{
														backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1))',
													}}
												/>
											)}
										</View>

										<View
											onClick={() => toggleCoupon(coupon.id)}
											className='flex h-5 w-5 items-center justify-center'>
											<svg
												width='16'
												height='16'
												viewBox='0 0 16 16'
												fill='none'
												stroke='currentColor'
												strokeWidth='1'
												strokeLinecap='round'
												strokeLinejoin='round'
												className='text-[#575756]'>
												<path d={isExpanded ? 'M12 10l-4-4-4 4' : 'M4 6l4 4 4-4'} />
											</svg>
										</View>
									</View>

									<AppActionButton
										onPress={() => copyCouponCode(coupon.code)}
										variant='dashed'
										label={toastData?.couponCode === coupon.code ? 'Cupom copiado' : coupon.code }
										afterIcon={(
											<svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' className='text-[#1E120D]'>
												<rect x='9' y='9' width='13' height='13' rx='2' />
												<path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' />
											</svg>
										)}
										textClassName='uppercase font-sans text-base font-semibold leading-6 !text-[#1E120D]'
										className='mt-3'
									/>
								</View>
							)
						})}
					</AppCard>

					{coupons.length > 2 && (<View className='mt-8 flex w-full items-center justify-center'>
						<AppActionButton
							label={t('coupons.backToTop')}
							onPress={() => Eitri.navigation.backToTop()}
							variant='pill'
						/>
					</View>
					)}
				</View>
			</View>

			<BottomInset />
			<AppToast toastData={toastData} onClose={() => setToastData(null)} />
		</Page>
	)
}

import Eitri from 'eitri-bifrost'
import { Vtex } from 'eitri-shopping-vtex-shared'
import { useTranslation } from 'eitri-i18n'
import { HeaderContentWrapper, HeaderReturn, HeaderText, BottomInset, AppActionButton, AppCard, RichText, getCmsContent } from 'wml-store-templates-shared'

import { useEffect, useState } from 'react'

import { sendScreenView } from '../services/TrackingService'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'

const RETURNS_EXCHANGES_CMS_CONTENT_TYPE = 'landingPage'
const RETURNS_EXCHANGES_CMS_PAGE_NAME = 'trocas-e-devolucoes'

const extractReturnsExchangesRichTextSections = (cmsContent) => {
	return (cmsContent?.sections || []).filter((section) => section?.name === 'RichText' && section?.data)
}

export default function ReturnsExchanges() {
	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()
	const [cmsContent, setCmsContent] = useState(null)

	const PAGE = t('returnsExchanges.title')

	useEffect(() => {
		sendScreenView(PAGE, 'account.returns.exchanges')
		addonUserTappedActiveTabListener()
		loadContent()
	}, [])

	const loadContent = async () => {
		try {
			const { faststore } = Vtex.configs
			const returnsExchangesContent = await getCmsContent(RETURNS_EXCHANGES_CMS_CONTENT_TYPE, RETURNS_EXCHANGES_CMS_PAGE_NAME, faststore)
			setCmsContent(returnsExchangesContent)
		} catch (error) {
			console.error('Error loading ReturnsExchanges content', error)
			setCmsContent(null)
		}
	}

	const richTextSections = extractReturnsExchangesRichTextSections(cmsContent)

	return (
		<Page title={PAGE} className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={PAGE} />
			</HeaderContentWrapper>

			<View className='bg-[#F7F7F7] px-4 pb-6 pt-4'>
				<View className='mx-auto w-full max-w-[360px]'>
					{richTextSections.map((section) => {
						const sectionId = section.id || section.name

						return (
							<AppCard
								key={sectionId}
								title={section.data?.title}
								className='mb-3'
								titleClassName='!text-[14px] leading-5'
								headerSpacingClassName='mb-0'
								expandable>
								<View className='pt-2'>
									<RichText data={{ ...section.data, title: undefined }} />
								</View>
							</AppCard>
						)
					})}

					<View className='mt-8 flex w-full items-center justify-center'>
						<AppActionButton
							label={t('returnsExchanges.backToTop')}
							onPress={() => Eitri.navigation.backToTop()}
							variant='pill'
						/>
					</View>
				</View>
			</View>

			<BottomInset />
		</Page>
	)
}

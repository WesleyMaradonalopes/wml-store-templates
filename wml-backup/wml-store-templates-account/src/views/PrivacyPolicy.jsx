import Eitri from 'eitri-bifrost'
import { HeaderContentWrapper, HeaderReturn, HeaderText, BottomInset, AppActionButton, AppCard, RichText, getCmsContent } from 'wml-store-templates-shared'

import { useEffect, useState } from 'react'
import { useTranslation } from 'eitri-i18n'

import { sendScreenView } from '../services/TrackingService'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { Vtex } from 'eitri-shopping-vtex-shared'

const PAGE = 'Política de Privacidade'
const PRIVACY_POLICY_CMS_CONTENT_TYPE = 'landingPage'
const PRIVACY_POLICY_CMS_PAGE_NAME = 'politica-privacidade'

const extractPrivacyRichTextData = (cmsContent) => {
	const richTextSection = (cmsContent?.sections || []).find((section) => section?.name === 'RichText')
	if (!richTextSection?.data) {
		return null
	}

	return richTextSection.data
}

export default function PrivacyPolicy() {
	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()
	const [cmsContent, setCmsContent] = useState(null)

	useEffect(() => {
		sendScreenView(PAGE, 'account.privacy.policy')
		addonUserTappedActiveTabListener()
		loadContent()
	}, [])

	const loadContent = async () => {
		try {
			const { faststore } = Vtex.configs
			const privacyContent = await getCmsContent(PRIVACY_POLICY_CMS_CONTENT_TYPE, PRIVACY_POLICY_CMS_PAGE_NAME, faststore)
			setCmsContent(privacyContent)
		} catch (error) {
			console.error('Error loading privacy policy content', error)
			setCmsContent(null)
		}
	}

	const richTextData = extractPrivacyRichTextData(cmsContent)

	return (
		<Page title={PAGE} className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={PAGE} />
			</HeaderContentWrapper>

			<View className='bg-[#F7F7F7] px-4 pb-6 pt-6'>
				<View className='mx-auto w-full max-w-[360px]'>
					<AppCard>
						{richTextData ? <RichText data={richTextData} /> : null}
					</AppCard>

					<View className='mt-8 flex w-full items-center justify-center'>
						<AppActionButton
							label={t('coupons.backToTop')}
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

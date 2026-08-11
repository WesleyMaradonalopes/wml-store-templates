import React, { useEffect, useState } from 'react'
import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'
import { trackScreenCatalog } from '../services/TrackingService'

import { HeaderContentWrapper } from 'wml-store-templates-shared'

import ProductCatalogContent from '../components/ProductCatalogContent/ProductCatalogContent'
import { useLocalShoppingCart } from '../providers/LocalCart'

function CartAwareSearchHeader({ searchProps }) {
	const { cart } = useLocalShoppingCart()

	return (
		<HeaderContentWrapper
			scrollEffect={false}
			className='relative w-full justify-between gap-3'
			searchProps={searchProps}
			cartProps={{
				cart,
			}}
		/>
	)
}

export default function ProductCatalog(props) {
	const { location } = props
	const { t } = useTranslation()

	const title = location.state.title
	const openInBottomBar = !!location.state.openInBottomBar

	const [appliedFacets, setAppliedFacets] = useState(null)

	useEffect(() => {
		const params = location.state.params
		setAppliedFacets(params)

		trackScreenCatalog(title)

		if (!openInBottomBar) {
			Eitri.eventBus.subscribe({
				channel: 'onUserTappedActiveTab',
				callback: (_) => {
					Eitri.navigation.back()
				},
			})
		}
	}, [])

	const handleCompactBack = async () => {
		await Eitri.navigation.back()
	}

	const handleGoToSearch = () => {
		Eitri.navigation.navigate({
			path: '/Search',
		})
	}

	return (
		<Page
			title={title || t('productCatalog.title')}
			className='font-sans text-base text-primary'>
			<>
				<CartAwareSearchHeader
					searchProps={{
						searchCollapsed: true,
						onCompactBack: handleCompactBack,
						onClick: handleGoToSearch,
					}}
				/>

				{appliedFacets && (
					<ProductCatalogContent
						banner={location?.state?.banner}
						params={appliedFacets}
					/>
				)}

				<View bottomInset={"auto"} className='w-full' />
			</>
		</Page>
	)
}

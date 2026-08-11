import React, { useEffect, useMemo, useState } from 'react'
import Eitri from 'eitri-bifrost'
import { View } from 'eitri-luminus'

import { HeaderContentWrapper, useDebounceCallback } from 'wml-store-templates-shared'

import ProductCatalogContent from '../components/ProductCatalogContent/ProductCatalogContent'
import CmsContentRender from '../components/CmsContentRender/CmsContentRender'
import SearchTermPills from '../components/CmsComponents/SearchTermPills/SearchTermPills'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { trackScreenSearch, trackSearch } from '../services/TrackingService'
import { getCmsContent } from '../services/CmsService'

import { FiSearch } from 'react-icons/fi'

function CartAwareSearchHeader({ searchProps }) {
	const { cart } = useLocalShoppingCart()

	return (
		<HeaderContentWrapper
			scrollEffect={false}
			className='relative w-full justify-between gap-3'
			searchProps={searchProps}
			cartProps={{
				cart,
				hideWhenSearchActive: true,
			}}
		/>
	)
}

export default function Search({ history, location }) {
	const { location: historyLocation } = history ?? {}
	const { state = {} } = historyLocation ?? location ?? {}
	const { searchTerm: incomingSearchTerm = '', autoFocus = true } = state ?? {}

	const [searchTerm, setSearchTerm] = useState(incomingSearchTerm)
	const [cmsContent, setCmsContent] = useState(null)
	const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(incomingSearchTerm.length >= 2)

	const debouncedTrack = useDebounceCallback(trackSearch, 2000)

	const params = useMemo(() => ({
		facets: [],
		query: searchTerm,
	}), [searchTerm])

	useEffect(() => {
		trackScreenSearch()
		loadCms()
	}, [])

	const loadCms = async () => {
		try {
			const result = await getCmsContent('landingPage', 'busca')
			if (result?.sections) {
				setCmsContent(result.sections)
			}
		} catch (e) {
			console.error('Erro ao carregar CMS da busca', e)
		}
	}

	// Não necessário por enquanto
	// const handleSearchSubmit = async () => {}
	const handleCompactBack = async () => {
		await Eitri.navigation.back()
	}

	const handleSearchSubmit = () => {
		if (searchTerm && searchTerm.length > 1) {
			setIsHeaderCollapsed(true)
			debouncedTrack(searchTerm)
		}
	}

	const handleSearchClear = () => {
		setSearchTerm('')
		setIsHeaderCollapsed(false)
	}

	const handleSearchChange = (value) => {
		setSearchTerm(value)
		if (value && value.length > 2) {
			debouncedTrack(value)
		}

		if (value.length < 2) {
			setIsHeaderCollapsed(false)
		}
	}

	const handleTermPillClick = (term) => {
		setSearchTerm(term)
		setIsHeaderCollapsed(true)
	}

	const handleBackToSearch = () => {
		setSearchTerm('')
		setIsHeaderCollapsed(false)
	}

	const isSearchActive = isHeaderCollapsed

	return (
		<Page
			title='Tela de busca'
			className='font-sans text-base text-primary p-2'>
			<CartAwareSearchHeader
				key={isSearchActive ? 'results' : 'search'}
				searchProps={isSearchActive ? {
					searchCollapsed: true,
					onCompactBack: handleCompactBack,
					onClick: handleBackToSearch,
				} : {
					searchTerm,
					setSearchTerm: handleSearchChange,
					autoFocus,
					onCompactBack: handleCompactBack,
					onSubmit: handleSearchSubmit,
					onClear: handleSearchClear,
				}}
			/>

			{searchTerm.length < 2 && (
				<View className='flex flex-col gap-6'>
					<View className='px-2 py-4 border border-[#EFEDEA] rounded-2xl bg-white mt-4 mx-4'>
						<SearchTermPills title='Em alta' onTermClick={handleTermPillClick} />
					</View>
					{!searchTerm && cmsContent && (
						<CmsContentRender cmsContent={cmsContent} />
					)}
				</View>
			)}

			{searchTerm.length >= 2 && (
				<ProductCatalogContent
					bottomInset={'auto'}
					params={params}
					isSearch={true}
				/>
			)}
		</Page>
	)
}

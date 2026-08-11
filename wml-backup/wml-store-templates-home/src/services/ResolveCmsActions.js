import Eitri from 'eitri-bifrost'

import { normalizePath, openProductById, openProductBySlug, resolveNavigation } from './NavigationService'
import { trackSelectPromotion } from './TrackingService'

const handleSearchAction = (value) => {
	Eitri.navigation.navigate({
		path: '/Search',
		state: {
			searchTerm: value,
		},
	})
}
const handleCollectionAction = (action) => {
	Eitri.navigation.navigate({
		path: '/ProductCatalog',
		state: {
			params: {
				facets: [{ key: 'productClusterIds', value: action?.value }],
				sort: action?.sort || '',
			},
			title: action?.title || '',
			banner: action?.banner || '',
		},
	})
}
const isCatalogAction = (action) => {
	if (!action?.type || action.type === 'page' || action.type === 'none') return false
	return Boolean(action.value)
}

const buildSeeAllActionFromPath = (action, pageTitle) => {
	if (!action?.value) return null

	const normalized = normalizePath(action.value)
	if (!normalized.facets?.length) return null

	if (normalized.facets.length === 1) return null

	const parentFacets = normalized.facets.slice(0, -1)
	const parentValues = parentFacets.map((facet) => facet.value)
	const mapKeys = parentFacets.map((facet) => (
		facet.key.startsWith('category-') ? 'c' : facet.key
	))

	return {
		...action,
		type: action.type === 'path' ? 'path' : 'category',
		value: `/${parentValues.join('/')}?map=${mapKeys.join(',')}`,
		title: pageTitle || action.title,
	}
}

export const getSeeAllActionFromLandingContent = (cmsContent, pageTitle) => {
	const section = cmsContent?.find((content) => content.name === 'CategoryListSwipe')
	const subcategoryAction = section?.data?.content
		?.map((item) => item?.action)
		?.find((action) => ['category', 'path'].includes(action?.type) && action?.value)

	if (!subcategoryAction) return null

	return buildSeeAllActionFromPath(subcategoryAction, pageTitle)
}

export const resolveSeeAllAction = ({
	seeAllAction,
	sourceCategoryItem,
	cmsContent,
	pageTitle,
}) => {
	const sourceAction = sourceCategoryItem?.action

	const candidates = [
		seeAllAction,
		sourceCategoryItem?.seeAllAction,
		isCatalogAction(sourceAction) ? sourceAction : null,
		sourceAction?.seeAllValue ? {
			type: 'category',
			value: sourceAction.seeAllValue,
			title: sourceAction?.title || pageTitle,
			sort: sourceAction?.sort,
			banner: sourceAction?.banner,
		} : null,
		getSeeAllActionFromLandingContent(cmsContent, pageTitle),
	]

	return candidates.find((action) => isCatalogAction(action)) || null
}

const buildSeeAllAction = (sliderData, action, title) => {
	if (sliderData?.seeAllAction) return sliderData.seeAllAction
	if (isCatalogAction(action)) return action
	if (action?.seeAllValue) {
		return {
			type: 'category',
			value: action.seeAllValue,
			title: action?.title || title,
			sort: action?.sort,
			banner: action?.banner,
		}
	}
	return null
}

const handlePageAction = (value, title, icon, sliderData, action) => {
	Eitri.navigation.navigate({
		path: `LandingPage/${value}`,
		state: {
			landingPageName: value,
			title: title || '',
			icon: icon || '',
			seeAllAction: buildSeeAllAction(sliderData, action, title),
			sourceCategoryItem: sliderData,
		},
	})
}
const handleCategoryAction = (action) => {

	const params = {
		...normalizePath(action?.value),
		sort: action?.sort || '',
	}
	Eitri.navigation.navigate({
		path: '/ProductCatalog',
		state: { params, title: action?.title, banner: action?.banner },
	})
}
const handleProductAction = (value) => {
	if (/^\d+$/.test(value)) {
		openProductById(value)
	} else {
		openProductBySlug(value)
	}
}
const openBrand = (action) =>  {
	const facets = [{ key: 'brand', value: action?.value }]
	Eitri.navigation.navigate({
		path: '/ProductCatalog',
		state: { params: { facets, sort: action?.sort }, title: action?.title || '' },
	})
}
const openLink = (link) => {
	Eitri.openBrowser({
		url: link,
		inApp: true,
	})
}

export const processActions = (sliderData, sendTrackPromotion = false) => {
	const action = sliderData?.action

	if (sendTrackPromotion) {
		trackSelectPromotion(sliderData?.mktTag || sliderData?.title || action?.title || action?.type)
	}

	switch (action?.type) {
		case 'search':
			handleSearchAction(action.value)
			break
		case 'collection':
			handleCollectionAction(action)
			break
		case 'page':
			handlePageAction(
				action.value,
				action?.title,
				sliderData?.icon || sliderData?.imageUrl,
				sliderData,
				action,
			)
			break
		case 'category':
			handleCategoryAction(action)
			break
		case 'product':
			handleProductAction(action.value)
			break
		case 'path':
			resolveNavigation(action.value, action?.title)
			break
		case 'brand':
			openBrand(action)
			break
		case 'link':
			openLink(action.value)
			break
		default:
			console.log(`Unknown action type: ${action.type}`)
	}
}

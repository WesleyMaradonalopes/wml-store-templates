import Eitri from 'eitri-bifrost'

import { Vtex } from 'eitri-shopping-vtex-shared'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export const getCmsContent = async (contentType, pageName, faststore) => {
	try {
		if (!pageName) return null

		const cachedPage = await loadPageFromCache(faststore, contentType, pageName)

		if (cachedPage) {
			loadVtexCmsPage(faststore, contentType, pageName)
				.then((page) => {
					if (page) {
						savePageInCache(faststore, contentType, pageName, page)
					}
				})
				.catch(() => {})

			return cachedPage
		}

		const page = await loadVtexCmsPage(faststore, contentType, pageName)
		if (!page) {
			return null
		}

		savePageInCache(faststore, contentType, pageName, page)
		return { sections: page.sections, settings: page.settings }
	} catch (e) {
		console.error('Error trying get CMS content', e)
	}

	return null
}

export const loadVtexCmsPage = async (faststore, contentType, pageName) => {
	try {
		const result = await Vtex.cms.getPagesByContentTypes(faststore, contentType, { 'filters[name]': pageName })
		const page = result?.data?.[0]

		if (!page) {
			return null
		}

		const now = new Date()
		const sections = page?.sections?.filter((section) => {
			const { startDate, endDate, images } = section?.data || {}

			if (!isWithinValidDateRange(startDate, endDate, now)) return false

			if (section?.name === 'MultipleImageBanner' && Array.isArray(images)) {
				section.data.images = images.filter((img) => {
					const action = img?.action || {}
					return isWithinValidDateRange(action.startDate, action.endDate, now)
				})
			}

			return true
		})

		return { ...page, sections }
	} catch (error) {
		console.error('Error loading VTEX CMS page:', pageName, error)
		return null
	}
}

const isWithinValidDateRange = (startDateStr, endDateStr, now) => {
	const hasStart = !!startDateStr
	const hasEnd = !!endDateStr

	const start = hasStart ? new Date(startDateStr) : null
	const end = hasEnd ? new Date(endDateStr) : null

	if ((start && isNaN(start)) || (end && isNaN(end))) return false
	if (start && now < start) return false
	if (end && now > end) return false

	return true
}

export const loadPageFromCache = async (faststore, contentType, pageName) => {
	try {
		const cacheKey = `${faststore}_${contentType}_${pageName}`
		const content = await Eitri.sharedStorage.getItemJson(cacheKey)
		if (!content) return null

		const inputDate = new Date(content.cachedIn)
		const currentDate = new Date()
		const differenceInMs = currentDate - inputDate

		if (differenceInMs > CACHE_TTL_MS) {
			return null
		}

		return content
	} catch (error) {
		console.error('Error trying load CMS from cache', error)
		return null
	}
}

export const savePageInCache = async (faststore, contentType, pageName, page) => {
	try {
		const cacheKey = `${faststore}_${contentType}_${pageName}`
		await Eitri.sharedStorage.setItemJson(cacheKey, { cachedIn: new Date().toISOString(), ...page })
	} catch (error) {
		console.error('Error trying save CMS in cache', error)
	}
}

import { App } from 'eitri-shopping-vtex-shared'

export const formatAmountInCents = (amount, locale = 'pt-BR', currency = 'BRL') => {
	if (typeof amount !== 'number') {
		return ''
	}
	if (amount === 0) {
		return 'Grátis'
	}
	return (amount / 100).toLocaleString(locale, { style: 'currency', currency: currency })
}

export const formatDate = (date) => {
	return new Date(date).toLocaleDateString('pt-br')
}

export const formatPrice = (price, _locale, _currency) => {
	if (!price) return ''

	const locale = _locale || App?.configs?.storePreferences?.locale || 'pt-BR'
	const currency = _currency || App?.configs?.storePreferences?.currencyCode || 'BRL'

	return price.toLocaleString(locale, { style: 'currency', currency: currency })
}

export function getTotalizerValueById(cart, totalizerId) {
	const totalizer = cart?.totalizers?.find((item) => item?.id === totalizerId)

	return totalizer?.value ?? 0
}

export const resolveCategoryItemCart = item => {
	const ids =
		item?.productCategoryIds?.split('/').filter(Boolean) ||
		item?.categoriesIds?.[0]?.split('/').filter(Boolean) ||
		[]

	const categories =
		item?.productCategories ||
		item?.categories?.[0]?.split('/').filter(Boolean) ||
		[]

	const result = {}

	ids.forEach((id, index) => {
		const key = index === 0 ? 'item_category' : `item_category${index + 1}`
		result[key] = item?.productCategories ? categories[id] : categories[index]
	})

	return result
}


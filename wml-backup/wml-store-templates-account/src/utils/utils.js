import { App } from 'eitri-shopping-vtex-shared'

export const formatPrice = (price, _locale, _currency) => {
	if (!price) return ''

	const locale = _locale || App?.configs?.storePreferences?.locale || 'pt-BR'
	const currency = _currency || App?.configs?.storePreferences?.currencyCode || 'BRL'

	return price.toLocaleString(locale, { style: 'currency', currency: currency })
}

export const formatPriceInCents = (price, _locale, _currency) => {
	if (typeof price !== 'number') {
		return ''
	}
	if (price === 0) {
		return 'Grátis'
	}
	return formatPrice(price / 100)
}

export const formatDateDaysMonthYear = (date) => {
	const data = new Date(date)
	const dia = data.getDate()
	const mes = data.toLocaleString('pt-BR', { month: 'long' })
	const ano = data.getFullYear()
	return `${dia} de ${mes} de ${ano}`
}

export const formatDate = (date) => {
	return new Date(date).toLocaleDateString('pt-br')
}
export default function formatDateMMDDYYYY(isoDate) {
	if (!isoDate) return ''

	const date = new Date(isoDate)

	const day = String(date.getUTCDate()).padStart(2, '0')
	const month = String(date.getUTCMonth() + 1).padStart(2, '0') // Janeiro é 0!
	const year = date.getUTCFullYear()

	return `${day}/${month}/${year}`
}

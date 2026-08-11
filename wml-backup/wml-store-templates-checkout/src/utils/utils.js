import Eitri from 'eitri-bifrost'

export const formatAmountInCents = (amount, locale = 'pt-BR', currency = 'BRL') => {
	if (typeof amount !== 'number') {
		return ''
	}
	if (amount === 0) {
		return 'Grátis'
	}
	return (amount / 100).toLocaleString(locale, { style: 'currency', currency: currency })
}

export const hideCreditCardNumber = (text) => {
	return '**** **** **** ' + text?.replace(/\D+/g, '')?.slice(12)
}

export const formatDate = (dateInp) => {
	const date = new Date(dateInp)

	const today = new Date()
	const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24))

	const day = date.toLocaleDateString('pt-BR', { day: 'numeric' })
	const month = date.toLocaleDateString('pt-BR', { month: 'long' })
	const weekdayFull = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date)
	const weekday = weekdayFull.replace('-feira', '') // tira o "-feira"

	if (diffDays <= 7 && diffDays >= 0) {
		return `${weekday}, ${day} de ${month}`
	}

	return `${day}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
}

export const addDaysToDate = (daysToAdd, onlyBusinessDays = true) => {
	let currentDate = new Date()

	currentDate.setHours(12)
	currentDate.setMinutes(0)
	currentDate.setSeconds(0)
	currentDate.setMilliseconds(0)

	let count = 0
	while (count < daysToAdd) {
		currentDate.setDate(currentDate.getDate() + 1)
		// Check if it's not a weekend (Saturday: 6, Sunday: 0)
		if (!onlyBusinessDays || (currentDate.getDay() !== 0 && currentDate.getDay() !== 6)) {
			count++
		}
	}
	return currentDate
}

export const resolveCategoryItemCart = (item) => {
	let ids = item.productCategoryIds?.split('/').filter(Boolean) || item.categoriesIds[0]?.split('/').filter(Boolean)
	let categories = item.productCategories || item.categories[0]?.split('/').filter(Boolean)
	let result = {}

	ids.forEach((id, index) => {
		const key = index === 0 ? 'item_category' : `item_category${index + 1}`
		result[key] = item.productCategories ? categories[id] : categories[index]
	})

	return result
}

export const extractUniqueCategoryNames = (data) => {
	const categorySet = new Set()

	data.items.forEach((item) => {
		const category = resolveCategoryItemCart(item)
		categorySet.add(category.item_category)
	})

	return Array.from(categorySet)
}

let cartmantCountdown = 10
export const goToCartman = () => {
	if (cartmantCountdown === 0) {
		Eitri.navigation.navigate({ path: 'Cartman' })
		cartmantCountdown = 7
	} else {
		cartmantCountdown--
	}
}

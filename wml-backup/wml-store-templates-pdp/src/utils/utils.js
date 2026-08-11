import Eitri from 'eitri-bifrost'

import { App } from 'eitri-shopping-vtex-shared'

export const formatPrice = (price, _locale, _currency) => {
	if (!price) return ''

	const locale = _locale || App?.configs?.storePreferences?.locale || 'pt-BR'
	const currency = _currency || App?.configs?.storePreferences?.currencyCode || 'BRL'

	return price.toLocaleString(locale, { style: 'currency', currency: currency })
}

export const formatAmount = (amount, locale = 'pt-BR', currency = 'BRL') => {
	if (typeof amount !== 'number') {
		return ''
	}
	return amount.toLocaleString(locale, { style: 'currency', currency: currency })
}

export const formatAmountInCents = (amount, locale = 'pt-BR', currency = 'BRL') => {
	if (typeof amount !== 'number') {
		return ''
	}
	if (amount === 0) {
		return 'Grátis'
	}
	return (amount / 100).toLocaleString(locale, { style: 'currency', currency: currency })
}

const discoverInstallments = (item) => {
	try {
		const mainSeller = item.sellers.find((seller) => seller.sellerDefault)
		if (mainSeller) {
			const betterInstallment = mainSeller.commertialOffer.Installments.reduce((acc, installment) => {
				if (!acc) {
					acc = installment
					return acc
				} else {
					if (installment.NumberOfInstallments > acc.NumberOfInstallments) {
						acc = installment
					}
					return acc
				}
			}, null)

			return `Em até ${betterInstallment.NumberOfInstallments}x de ${formatAmount(betterInstallment.Value)}`
		}
		return ''
	} catch (error) {
		return ''
	}
}

export const calculateDiscount = (initialValue, currencyValue) => {
	if (
		typeof initialValue === 'number' &&
		typeof currencyValue === 'number' &&
		currencyValue !== 0 &&
		initialValue > currencyValue
	) {
		const discountPrice = initialValue - currencyValue
		const discount = (discountPrice / initialValue) * 100
		return parseInt(discount)
	}
	return 0
}

export const formatProductFromVtex = (product) => {
	try {
		return {
			productId: product.productId,
			productName: product.productName,
			brand: product.brand,
			productReference: product.productReference,
			description: product.description,
			categoryId: product.categoryId,
			items: product.items.map((item) => {
				const _sellers = item.sellers.map((seller) => {
					return {
						sellerId: seller.sellerId,
						sellerName: seller.sellerName,
						sellerDefault: seller.sellerDefault,
						displayedPrice: formatAmount(seller.commertialOffer?.Price || seller.Price),
						price: seller.commertialOffer?.Price || seller.Price,
						listPrice: seller.commertialOffer?.ListPrice || seller.ListPrice,
						priceWithoutDiscount:
							seller.commertialOffer?.PriceWithoutDiscount || seller.PriceWithoutDiscount,
						availableQuantity: seller.commertialOffer?.AvailableQuantity || seller.AvailableQuantity,
						isAvailable:
							typeof seller.commertialOffer?.IsAvailable === 'boolean'
								? seller.commertialOffer?.IsAvailable
								: seller.commertialOffer.AvailableQuantity > 0,
						installments: seller.commertialOffer?.Installments || seller.Installments,
					}
				})

				return {
					itemId: item.itemId,
					name: item.name,
					nameComplete: item.nameComplete,
					ean: item.ean,
					isKit: item.isKit,
					images: item.images.map((image) => {
						return {
							imageUrl: image.imageUrl,
							imageText: image.imageText,
						}
					}),
					installments: discoverInstallments(item),
					mainImage:
						product.itemMetadata?.items?.find((itemMetadata) => itemMetadata.id === item.itemId)
							?.MainImage || item.images[0].imageUrl,
					sellers: _sellers,
					mainSeller: structuredClone(_sellers.find((seller) => seller.sellerDefault) || _sellers[0]),
				}
			}),
		}
	} catch (error) {
		// console.log('error', product)
		throw error
	}
}

export const validateZipCode = (text) => {
	const regexCEP = /^\d{8}$/
	return regexCEP.test(text)
}

export const hideCreditCardNumber = (text) => {
	return '****.****.****.' + text.slice(12)
}

export const formatCreditCardDueDate = (text) => {
	return text.slice(0, 2) + '/' + text.slice(2, 4)
}

export const formatDateDaysMonthYear = (date) => {
	const data = new Date(date)
	const dia = data.getDate()
	const mes = data.toLocaleString('pt-BR', { month: 'long' })
	const ano = data.getFullYear()
	return `${dia} de ${mes} de ${ano}`
}

export const openNativeProduct = (product) => {
	console.log('openProduct', window.__WORKSPACE_USER_ID)
	//HACK para desenvolvimento.
	if (window && window.__WORKSPACE_USER_ID) {
		Eitri.navigation.navigate({ path: 'Product', state: { product: product } })
		console.warn(window.__WORKSPACE_USER_ID)
		return
	}

	Eitri.nativeNavigation.open({
		slug: 'eitri-shopping-vtex-daisy-catalog',
		initParams: { route: 'product', product: product },
	})
}

export const formatDate = (date) => {
	return new Date(date).toLocaleDateString('pt-br')
}

export const formatZipCode = (zipCode) => {
	if (!zipCode) return ''
	if (zipCode.includes('-') || zipCode.includes('*')) return zipCode
	return zipCode.slice(0, 5) + '-' + zipCode.slice(5)
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

export const formatPhoneNumber = (phoneNumber) => {
	return phoneNumber.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

export const formatDocument = (document) => {
	switch (`${document}`.length) {
		case 11:
			return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
		case 14:
			return document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
		case 12:
			return document.replace(/(\d{2})(\d{4})(\d{4})(\d{2})/, '$1.$2.$3/$4')
	}
}

export const parseJwt = (token) => {
	try {
		return JSON.parse(atob(token.split('.')[1]))
	} catch (e) {
		return null
	}
}

export const upperCaseWord = (string) => {
	return string.charAt(0).toUpperCase() + string.slice(1)
}

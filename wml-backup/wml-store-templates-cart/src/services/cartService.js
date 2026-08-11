import { Vtex } from 'eitri-shopping-vtex-shared'

export const getCart = async () => {
	return await Vtex.cart.getCurrentOrCreateCart()
}

export const addItemToCart = async (payload) => {
	return await Vtex.checkout.addItem(payload)
}

export const saveCartIdOnStorage = async (orderFormId) => {
	return await Vtex.cart.saveCartIdOnStorage(orderFormId)
}

export const addItemOffer = async (itemIndex, offeringId) => {
	return await Vtex.cart.addOfferingsItems(itemIndex, offeringId)
}

export const removeItemOffer = async (itemIndex, offeringId) => {
	return await Vtex.cart.removeOfferingsItems(itemIndex, offeringId)
}

export const changeItemQuantity = async (index, newQuantity) => {
	return await Vtex.cart.changeItemQuantity(index, newQuantity)
}

export const removeCartItem = async (index) => {
	return await Vtex.cart.removeItem(index)
}

export const addCoupon = async (coupon) => {
	return await Vtex.checkout.addPromoCode(coupon)
}

export const removeCoupon = async () => {
	return await Vtex.checkout.addPromoCode('')
}

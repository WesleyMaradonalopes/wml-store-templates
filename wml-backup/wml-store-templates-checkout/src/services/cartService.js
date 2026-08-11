import Eitri from 'eitri-bifrost'

import { Vtex } from 'eitri-shopping-vtex-shared'

export const getCart = async () => {
	return await Vtex.cart.getCartIfExists()
}

export const generateNewCart = async () => {
	return await Vtex.cart.generateNewCart()
}

export const addItem = async (payload) => {
	return await Vtex.cart.addItem(payload)
}

export const startPayment = async (cart, payload) => {
	return await Vtex.checkout.payV2(cart, payload)
}

export const getUserByEmail = async (email) => {
	return await Vtex.cart.getClientProfileByEmail(email)
}

export const saveCartIdOnStorage = async (orderFormId) => {
	return await Vtex.cart.saveCartIdOnStorage(orderFormId)
}

export const addUserData = async (userData) => {
	const newCart = await Vtex.checkout.addUserData(userData)
	return newCart
}

export const selectPaymentOption = async (payload) => {
	const newCart = await Vtex.checkout.selectPaymentOption(payload)
	return newCart
}

export const clearCart = async () => {
	await Vtex.cart.clearCart()
}

export const removeClientData = async () => {
	await Vtex.cart.removeClientData()
	return await getCart()
}

export const registerToNotify = async (userPayload) => {
	try {
		Eitri.exposedApis.session.notifyLogin(userPayload)
	} catch (e) {
		console.log('erro on registerToNotify', e)
	}
}

export const removeItemFromCart = async (index) => {
	return await Vtex.cart.removeItem(index)
}

export const cartHasCustomerData = (cart) => {
	return !!(
		cart.clientProfileData &&
		cart.clientProfileData.email &&
		cart.clientProfileData.firstName &&
		cart.clientProfileData.lastName &&
		cart.clientProfileData.document &&
		cart.clientProfileData.phone
	)
}

export const addLoggedCustomerToCart = async (loggedCustomer, cart, context) => {
	try {
		if (cart.clientProfileData) {
			await Vtex.cart.removeClientData()
		}

		const payload = {
			email: loggedCustomer.email,
			firstName: loggedCustomer.firstName,
			lastName: loggedCustomer.lastName,
			documentType: 'cpf',
			document: loggedCustomer.document,
			phone: loggedCustomer.homePhone,
		}

		return await context.addPersonalData(payload)
	} catch (e) {
		console.log('erro on addLoggedCustomerToCart', e)
	}
}

export const getPixStatus = async (transactionId, paymentId) => {
	return await Vtex.checkout.getPixStatus(transactionId, paymentId)
}

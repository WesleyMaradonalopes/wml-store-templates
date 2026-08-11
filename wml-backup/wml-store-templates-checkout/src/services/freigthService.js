import { Vtex } from 'eitri-shopping-vtex-shared'

export default async function setFreight(payload) {
	const newCart = await Vtex.checkout.setLogisticInfo(payload)
	return newCart
}

export const setLogisticInfo = async (payload) => {
	const newCart = await Vtex.checkout.setLogisticInfo(payload)
	return newCart
}

export const setNewAddress = async (address) => {
	try {
		return await Vtex.checkout.setLogisticInfo({
			clearAddressIfPostalCodeNotFound: false,
			selectedAddresses: Array.isArray(address) ? address : [address],
		})
	} catch (error) {
		console.error('getZipCode Error', error)
	}
}

export const updateAddress = async (selectedAddresses) => {
	const newCart = await Vtex.checkout.setLogisticInfo({
		logisticsInfo: cart?.shippingData?.logisticsInfo,
		clearAddressIfPostalCodeNotFound: false,
		selectedAddresses: selectedAddresses,
	})

	return newCart
}

export const setShippingAddress = async (address) => {
	const newCart = await Vtex.checkout.setLogisticInfo({
		clearAddressIfPostalCodeNotFound: false,
		address,
	})
	return newCart
}

const generateLogisticInfoPayload = (addressId, shippingOptions) => {
	return shippingOptions?.map((option) => {
		return {
			addressId,
			itemIndex: option.itemIndex,
			selectedDeliveryChannel: option.deliveryChannel,
			selectedSla: option.id,
		}
	})
}

const generateSelectedAddressesPayload = (address) => {
	const {
		addressType,
		addressId,
		postalCode,
		complement,
		number,
		street,
		neighborhood,
		city,
		state,
		country,
		geoCoordinates,
		receiverName,
		reference,
		isDisposable,
	} = address

	return [
		{
			addressType: addressType || 'residential',
			receiverName,
			addressId,
			isDisposable: isDisposable,
			postalCode: postalCode,
			city: city,
			state: state,
			country: country,
			street: street,
			number: number,
			neighborhood: neighborhood,
			complement: complement,
			reference,
			geoCoordinates: geoCoordinates.map((coord) => coord),
			addressQuery: '',
		},
		{
			addressType: 'search',
			receiverName,
			isDisposable: isDisposable,
			postalCode: postalCode,
			city: city,
			state: state,
			country: country,
			street: street,
			number: number,
			neighborhood: neighborhood,
			complement: complement,
			reference,
			geoCoordinates: geoCoordinates.map((coord) => coord),
			addressQuery: '',
		},
	]
}

export const resolvePostalCode = async (postalCode) => {
	return await Vtex.cart.resolvePostalCode(postalCode)
}

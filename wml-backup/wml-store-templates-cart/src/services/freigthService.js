import { Vtex } from 'eitri-shopping-vtex-shared'

export const setFreight = async (payload) => {
	try {
		const newCart = await Vtex.checkout.setLogisticInfo(payload)

		return newCart
	} catch (error) {
		console.error('setFreight', error)
	}
}

export const setNewAddress = async (cart, zipCode) => {
	try {
		const address = await Vtex.checkout.resolveZipCode(zipCode)

		const selectedAddresses = generateSelectedAddressesPayload(cart?.shippingData?.selectedAddresses, address)
		return await Vtex.checkout.setLogisticInfo({
			logisticsInfo: cart?.shippingData?.logisticsInfo,
			clearAddressIfPostalCodeNotFound: false,
			selectedAddresses: selectedAddresses,
		})
	} catch (error) {
		console.error('getZipCode Error', error)
	}
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

const generateSelectedAddressesPayload = (selectedAddresses, address) => {
	const { street, neighborhood, city, state, country, geoCoordinates, postalCode } = address || {}

	if (selectedAddresses && selectedAddresses.length > 0) {
		return selectedAddresses.map((selectedAd) => {
			return {
				addressType: selectedAd.addressType,
				receiverName: selectedAd.receiverName,
				addressId: selectedAd.addressId,
				isDisposable: true,
				postalCode: postalCode,
				city: selectedAd.city,
				state: selectedAd.state,
				country,
				street,
				number: null,
				neighborhood,
				complement: null,
				reference: null,
				geoCoordinates,
				addressQuery: selectedAd.addressQuery,
			}
		})
	}

	return [
		{
			addressType: 'search',
			receiverName: '',
			isDisposable: true,
			postalCode: postalCode,
			city: city,
			state: state,
			country: country,
			street: street,
			number: null,
			neighborhood: neighborhood,
			complement: null,
			reference: null,
			geoCoordinates: geoCoordinates?.map((coord) => coord),
			addressQuery: '',
		},
		{
			addressType: 'residential',
			receiverName: '',
			isDisposable: true,
			postalCode: postalCode,
			city: city,
			state: state,
			country: country,
			street: street,
			number: null,
			neighborhood: neighborhood,
			complement: null,
			reference: null,
			geoCoordinates: geoCoordinates?.map((coord) => coord),
			addressQuery: '',
		},
	]
}

export const simulateCart = async (zipCode, cart) => {
	if (!zipCode) {
		return
	}

	try {
		const address = await Vtex.checkout.resolveZipCode(zipCode)

		const { postalCode, city, state, street, neighborhood, country, geoCoordinates } = address || {}

		const cartSimulationPayload = {
			items: cart?.items?.map((item) => {
				return {
					id: item.id,
					quantity: item.quantity,
					seller: item.seller,
				}
			}),
			country,
			postalCode,
			geoCoordinates,
		}

		return await Vtex.cart.simulateCart(cartSimulationPayload)
	} catch (error) {
		console.error('Error fetching freight', error)
	}
}

export const resolveZipCode = async (zipCode) => {
	return await Vtex.checkout.resolveZipCode(zipCode)
}

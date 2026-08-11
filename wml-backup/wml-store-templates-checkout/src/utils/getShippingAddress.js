export const getShippingAddress = (cart) => {
	// Pega o primeiro, todos entregam no mesmo lugar
	const firstLogisticInfo = cart?.shippingData?.logisticsInfo?.[0]

	if (!firstLogisticInfo) return null

	const isPickup = firstLogisticInfo.selectedDeliveryChannel === 'pickup-in-point'
	const selectedSla = firstLogisticInfo.slas.find((sla) => sla.id === firstLogisticInfo.selectedSla)

	if (isPickup) {
		const pickupAddress = selectedSla?.pickupStoreInfo?.address
		return {
			...pickupAddress,
			formattedAddress: `${pickupAddress?.street}, ${
				pickupAddress?.number === null ? 's/n' : pickupAddress?.number
			}${pickupAddress?.complement ? ` - ${pickupAddress?.complement}` : ''}`,
			isPickUp: true,
		}
	}

	const addressId = firstLogisticInfo?.addressId
	const addresses = cart?.shippingData?.availableAddresses
	const currentAddress = addresses?.find((address) => address.addressId === addressId)

	if (!currentAddress) return null

	return {
		...currentAddress,
		formattedAddress: `${currentAddress?.street}, ${
			currentAddress?.number === null ? 's/n' : currentAddress?.number
		}${currentAddress?.complement ? ` - ${currentAddress?.complement}` : ''}`,
		isPickUp: false,
	}
}

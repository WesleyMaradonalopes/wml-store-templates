import { addDaysToDate, formatAmountInCents, formatDate } from './utils'

export default function cartShippingResolver(cart) {
	try {
		if (!cart?.shippingData?.logisticsInfo) {
			return null
		}

		const logisticsInfo = cart.shippingData?.logisticsInfo

		const preProcessedLogisticInfos = preProcessingSla(logisticsInfo)

		const logInfoWithFasterAndCheaperSla = mapFasterAndCheaperShippingOption(preProcessedLogisticInfos)

		const { cheapers, fasters } = getCheapersAndFasters(logInfoWithFasterAndCheaperSla)

		const pickUpInPoints = getPickupPoints(logInfoWithFasterAndCheaperSla)

		const isCheaperAndFasterTheSame = cheapers.length > 0 && cheapers.every((cheaper) => cheaper.isFaster)

		const selectedAddresses = cart.shippingData?.selectedAddresses

		const options = []

		if (cheapers.length > 0 || fasters.length > 0 || pickUpInPoints.length > 0) {
			if (isCheaperAndFasterTheSame) {
				options.push({
					label: 'Entrega econômica',
					shippingEstimate:
						getMaximumDeliveryDate(cheapers) === '01/02/1970'
							? 'Indiponível para entrega'
							: `Receba até ${getMaximumDeliveryDate(cheapers)}`,
					price: getFormattedTotalPrice(cheapers),
					slas: cheapers,
					isCurrent: cheapers.every((cheaper) => cheaper.selected),
				})
			} else {
				if (fasters && fasters?.length > 0) {
					options.push({
						label: 'Entrega mais rápida',
						shippingEstimate:
							getMaximumDeliveryDate(fasters) === '01/02/1970'
								? 'Indiponível para entrega'
								: `Receba até ${getMaximumDeliveryDate(fasters)}`,
						price: getFormattedTotalPrice(fasters),
						slas: fasters,
						isCurrent: fasters.every((faster) => faster.selected),
					})
				}
				if (cheapers && cheapers?.length > 0) {
					options.push({
						label: 'Entrega econômica',
						shippingEstimate:
							getMaximumDeliveryDate(cheapers) === '01/02/1970'
								? 'Indiponível para entrega'
								: `Receba até ${getMaximumDeliveryDate(cheapers)}`,
						price: getFormattedTotalPrice(cheapers),
						slas: cheapers,
						isCurrent: cheapers.every((cheaper) => cheaper.selected),
					})
				}
			}
		}

		if (pickUpInPoints && pickUpInPoints?.length > 0) {
			for (const pickUpInPoint of pickUpInPoints) {
				const pickUpInPointAddress = pickUpInPoint?.pickupStoreInfo?.address
				options.push({
					label: pickUpInPoint?.pickupStoreInfo?.friendlyName,
					shippingEstimate: `Retire na loja a partir de ${pickUpInPoint.formattedShippingEstimate}`,
					price: getFormattedTotalPrice(pickUpInPoint?.slas),
					slas: pickUpInPoint?.slas,
					isPickupInPoint: true,
					pickUpAddress: pickUpInPoint?.pickupStoreInfo?.friendlyName,
					address: { ...pickUpInPointAddress },
					formatedPickAddress: `${pickUpInPointAddress?.street}, ${pickUpInPointAddress?.number} - ${pickUpInPointAddress?.neighborhood} - ${pickUpInPointAddress?.city}`,
					isCurrent: pickUpInPoint?.slas.every((_pickUpInPoint) => _pickUpInPoint.selected),
				})
			}
		}

		const shipping = {
			postalCode: cart.shippingData?.address?.postalCode,
			shippingAvailable: !(cheapers.length === 0 && fasters.length === 0 && pickUpInPoints.length === 0),
			selectedAddresses,
			address: cart.shippingData?.address,
			options,
		}

		return shipping
	} catch (error) {
		console.error('Error on cartShippingResolver', error)

		throw error
	}
}

function getCheapersAndFasters(logInfoWithFasterAndCheaperSla) {
	const cheapers = []
	const fasters = []

	for (const logicInfo of logInfoWithFasterAndCheaperSla) {
		const fasterSla = logicInfo?.slas.find((sla) => sla.isFaster)
		const cheaperSla = logicInfo?.slas.find((sla) => sla.isCheaper)

		if (cheaperSla) {
			cheapers.push({ itemIndex: logicInfo.itemIndex, ...cheaperSla })
		}
		if (fasterSla) {
			fasters.push({ itemIndex: logicInfo.itemIndex, ...fasterSla })
		}
	}
	return { cheapers, fasters }
}

function getPickupPoints(logInfoWithFasterAndCheaperSla) {
	const baseLogisticInfo = logInfoWithFasterAndCheaperSla[0]
	const basePickUpInPoints = baseLogisticInfo?.slas?.filter((sla) => sla.isPickupInPoint)

	if (!basePickUpInPoints) return []

	const pickUpInPoints = []

	const findSlasFromPickUpInPoints = (pickUpPointId) => {
		return logInfoWithFasterAndCheaperSla.reduce((acc, logicInfo) => {
			const sla = logicInfo?.slas?.find((sla) => sla.id === pickUpPointId)
			if (sla) acc.push({ itemIndex: logicInfo.itemIndex, ...sla })
			return acc
		}, [])
	}

	for (const base of basePickUpInPoints) {
		pickUpInPoints.push({
			id: base.id,
			price: base.price,
			shippingEstimate: base.shippingEstimate,
			shippingEstimateDate: base.shippingEstimateDate,
			formattedShippingEstimate: base.formattedShippingEstimate,
			pickupStoreInfo: { ...base.pickupStoreInfo },
			slas: findSlasFromPickUpInPoints(base.id),
		})
	}

	return pickUpInPoints
}

function getFormattedTotalPrice(slas) {
	const total = slas?.reduce((acc, current) => {
		return acc + current.price
	}, 0)

	return total === 0 ? 'Grátis' : formatAmountInCents(total)
}

function getMaximumDeliveryDate(slas) {
	const maximumDate = slas.reduce(
		(acc, current) => {
			return acc > current.shippingEstimateDate ? acc : current.shippingEstimateDate
		},
		new Date(1970, 1, 1),
	)

	return formatDate(maximumDate)
}

function preProcessingSla(logisticsInfo) {
	const shippingEstimateDate = (shippingEstimate) => {
		const useBd = shippingEstimate.indexOf('bd') > -1
		const days = parseInt(shippingEstimate)

		return addDaysToDate(days, useBd)
	}

	const hasValidSlas = logisticsInfo.every((logistic) => logistic?.slas.length > 0)

	if (!hasValidSlas) {
		return []
	}

	return logisticsInfo.map((logistic) => {
		return {
			itemIndex: logistic.itemIndex,
			selectedSla: logistic.selectedSla,
			selectedDeliveryChannel: logistic.selectedDeliveryChannel,
			slas: logistic.slas.map((sla) => {
				const estimatedDate = shippingEstimateDate(sla.shippingEstimate)
				return {
					id: sla.id,
					price: sla.price,
					shippingEstimate: sla.shippingEstimate,
					shippingEstimateDate: estimatedDate,
					formattedShippingEstimate: formatDate(estimatedDate),
					deliveryChannel: sla.deliveryChannel,
					pickupStoreInfo: sla.pickupStoreInfo,
					selected:
						sla.id === logistic.selectedSla && sla.deliveryChannel === logistic.selectedDeliveryChannel,
					courierId: sla.deliveryIds?.[0]?.courierId,
					warehouseId: sla.deliveryIds?.[0]?.warehouseId,
					dockId: sla.deliveryIds?.[0]?.dockId,
					courierName: sla.deliveryIds?.[0]?.courierName,
					isPickupInPoint: sla.deliveryChannel === 'pickup-in-point',
				}
			}),
		}
	})
}

function mapFasterAndCheaperShippingOption(preProcessedSlas) {
	const _preProcessedSlas = []

	for (const preProcessedSla of preProcessedSlas) {
		const { slas } = preProcessedSla

		let fasterSla = { shippingEstimateDate: new Date(2199, 1, 1), price: Infinity }
		let cheaperSla = { shippingEstimateDate: new Date(2199, 1, 1), price: Infinity }

		// Considera que para a comparação de datas, o horário é sempre o mesmo. Isso pq a data a formatada assim no utils.js
		for (const sla of slas) {
			if (sla.isPickupInPoint) {
				continue
			}
			if (
				fasterSla.shippingEstimateDate > sla.shippingEstimateDate ||
				(fasterSla.shippingEstimateDate === sla.shippingEstimateDate && fasterSla.price > sla.price)
			) {
				fasterSla = sla
			}
			if (
				cheaperSla.price > sla.price ||
				(cheaperSla.price === sla.price && cheaperSla.shippingEstimateDate > sla.shippingEstimateDate)
			) {
				cheaperSla = sla
			}
		}
		_preProcessedSlas.push({
			...preProcessedSla,
			slas: preProcessedSla?.slas.map((sla) => {
				return {
					...sla,
					isFaster: sla.id === fasterSla.id && sla.deliveryChannel === fasterSla.deliveryChannel,
					isCheaper: sla.id === cheaperSla.id && sla.deliveryChannel === cheaperSla.deliveryChannel,
				}
			}),
		})
	}

	return _preProcessedSlas
}

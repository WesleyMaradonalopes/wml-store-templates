import { formatAmountInCents, formatShippingEstimate } from './utils'

export default function productGroupShippingResolver(cart) {
	try {
		if (!cart?.shippingData?.logisticsInfo) {
			return null
		}

		const groupedByProduct = groupProductsBySlas(cart.shippingData.logisticsInfo, cart.items, cart)
		const shippingGroups = enrichShippingGroups(groupedByProduct, cart)

		return shippingGroups
	} catch (error) {
		console.error('Error on productGroupShippingResolver', error)
		throw error
	}
}

/**
 * Cria uma chave única baseada nos IDs dos SLAs ordenados
 */
function createSlaKey(slas) {
	return slas
		.map((sla) => sla.id)
		.sort()
		.join('|')
}

/**
 * Agrupa produtos por SLAs idênticos e adiciona informações dos produtos
 */
function groupProductsBySlas(logisticsInfo, cartItems, cart) {
	const groups = new Map()

	logisticsInfo.forEach((logisticItem) => {
		const slaKey = createSlaKey(logisticItem.slas)

		if (!groups.has(slaKey)) {
			groups.set(slaKey, {
				slas: logisticItem.slas.map((sla) => ({
					...sla,
					isPickupInPoint: sla.deliveryChannel === 'pickup-in-point',
					deliveryAddress:
						sla.deliveryChannel === 'delivery'
							? cart?.shippingData?.availableAddresses?.find(
									(address) =>
										address.addressType === 'residential' &&
										address.addressId === logisticItem.addressId,
								)
							: null,
					totalPrice: 0,
				})),
				items: [],
			})
		}

		const group = groups.get(slaKey)

		// Acumula o preço de cada SLA
		group.slas.forEach((sla, index) => {
			sla.totalPrice += logisticItem.slas[index].price
		})

		// Adiciona informações do item e do produto do carrinho
		const cartItem = cartItems[logisticItem.itemIndex]

		group.items.push({
			itemIndex: logisticItem.itemIndex,
			itemId: logisticItem.itemId,
			selectedSla: logisticItem.selectedSla,
			selectedDeliveryChannel: logisticItem.selectedDeliveryChannel,
			name: cartItem?.name,
			quantity: cartItem?.quantity,
			imageUrl: cartItem?.imageUrl,
		})
	})

	return Array.from(groups.values())
}

/**
 * Enriquece os dados dos grupos com formatações e informações adicionais
 */
function enrichShippingGroups(groups, cart) {
	return groups.map((group) => {
		// Verifica se todos os itens têm o mesmo SLA selecionado
		const firstSelectedSla = group.items[0]?.selectedSla
		const allSameSla = group.items.every((item) => item.selectedSla === firstSelectedSla)

		return {
			...group,
			currentSla: allSameSla ? firstSelectedSla : '',
			slas: group.slas.map((sla) => ({
				...sla,
				isPickupInPoint: sla.deliveryChannel === 'pickup-in-point',
				formatedShippingEstimate: formatShippingEstimate(sla),
				formattedTotalPrice: sla.totalPrice === 0 ? 'Grátis' : formatAmountInCents(sla.totalPrice),
			})),
		}
	})
}

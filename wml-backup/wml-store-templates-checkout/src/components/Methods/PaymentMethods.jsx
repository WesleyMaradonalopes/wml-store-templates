import { App } from 'eitri-shopping-vtex-shared'

import ImplementationInterface from '../PaymentsGroups/ImplementationInterface'
import { useLocalShoppingCart } from '../../providers/LocalCart'
import { getPaymentSystem } from '../../utils/getPaymentSystem'

export default function PaymentMethods(props) {
	const { cart } = useLocalShoppingCart()

	const { onSelectPaymentMethod } = props

	const paymentSystemGroups = getPaymentSystem(cart)

	const executeSort = (paymentSystemGroups) => {
		const displayOrder = App?.configs?.appConfigs?.checkout?.paymentSystemDisplayOrder
		if (displayOrder) {
			return paymentSystemGroups.sort((a, b) => {
				const ai = displayOrder.indexOf(a.groupName)
				const bi = displayOrder.indexOf(b.groupName)
				return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi)
			})
		} else {
			return paymentSystemGroups
		}
	}

	return (
		<View className='flex w-full flex-col gap-4'>
			{executeSort(paymentSystemGroups)?.map((system) => {
				return (
					<ImplementationInterface
						key={system.groupName}
						groupName={system.groupName}
						systemGroup={system}
						onSelectPaymentMethod={onSelectPaymentMethod}
					/>
				)
			})}
		</View>
	)
}

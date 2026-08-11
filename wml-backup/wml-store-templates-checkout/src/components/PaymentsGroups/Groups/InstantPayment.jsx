import { Badge, Text, View } from 'eitri-luminus'

import { useLocalShoppingCart } from '../../../providers/LocalCart'
import { navigate } from '../../../services/navigationService'
import GroupsWrapper from './GroupsWrapper'

export default function InstantPayment(props) {
	const { cart } = useLocalShoppingCart()
	const { systemGroup, onSelectPaymentMethod } = props

	const VTEX_INSTANT_PAYMENT = '125'

	const onSelectThisGroup = async () => {
		await onSelectPaymentMethod([
			{
				paymentSystem: VTEX_INSTANT_PAYMENT,
				installmentsInterestRate: 0,
				installments: 1,
				referenceValue: cart.value,
				value: cart.value,
				hasDefaultBillingAddress: true,
			},
		])
		//trackAddPaymentInfo(cart, 'Pix')
		navigate('CheckoutReview')
	}

	const pixBenefits = cart?.ratesAndBenefitsData?.rateAndBenefitsIdentifiers?.find((b) => b.name === '3% OFF Pix')

	return (
		<GroupsWrapper
			title='Pix'
			subtitle='Pagamento instantâneo'
			// icon={<Pix />}
			valueInCents={systemGroup.paymentSystems[0]?.installments?.[0]?.total ?? cart.value}
			onPress={onSelectThisGroup}
			isChecked={systemGroup.isCurrentPaymentSystemGroup}>
			<View onClick={onSelectThisGroup}>
				{pixBenefits && (
					<View className='mb-3 flex flex-row items-center gap-2'>
						<Badge className='badge-success badge-lg text-sm font-bold text-white shadow-md'>3% OFF</Badge>
					</View>
				)}
				<View className='mt-2 rounded bg-neutral-100 p-4'>
					<Text className='text-sm text-neutral-500'>
						{'O código Pix será exibido na próxima etapa, após a revisão do seu pedido.'}
					</Text>
				</View>
			</View>
		</GroupsWrapper>
	)
}

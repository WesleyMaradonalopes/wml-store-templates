import GroupsWrapper from './GroupsWrapper'
import { useLocalShoppingCart } from '../../../providers/LocalCart'
import { trackAddPaymentInfo } from '../../../services/Tracking'
import { navigate } from '../../../services/navigationService'

export default function ExternalPayment(props) {
	const { cart } = useLocalShoppingCart()

	const { externalPaymentRc, onSelectPaymentMethod, systemGroup } = props

	const onSelectThisGroup = async () => {
		const paymentSystem = systemGroup?.paymentSystems?.[0]

		if (!paymentSystem) return
		await onSelectPaymentMethod([
			{
				paymentSystem: paymentSystem.id,
				installmentsInterestRate: 0,
				installments: 1,
				referenceValue: cart.value,
				value: cart.value,
				hasDefaultBillingAddress: true,
			},
		])
		//trackAddPaymentInfo(cart, paymentSystem.name)
		navigate('CheckoutReview')
	}

	return (
		<GroupsWrapper
			title={externalPaymentRc.name}
			valueInCents={systemGroup.paymentSystems[0]?.installments?.[0]?.total ?? cart.value}
			icon={
				<Image
					src={externalPaymentRc.imageUrl}
					className='w-[20px]'
				/>
			}
			onPress={onSelectThisGroup}>
			{externalPaymentRc.description && <Text fontSize='nano'>{externalPaymentRc.description}</Text>}
		</GroupsWrapper>
	)
}

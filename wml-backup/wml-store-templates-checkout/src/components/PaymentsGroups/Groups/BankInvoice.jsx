import { useLocalShoppingCart } from '../../../providers/LocalCart'
import Boleto from '../../Icons/MethodIcons/Boleto'
import GroupsWrapper from './GroupsWrapper'

export default function BankInvoice(props) {
	const { cart, selectedPaymentData, setSelectedPaymentData } = useLocalShoppingCart()
	const { systemGroup, groupName } = props

	const onSelectThisGroup = () => {
		const ps = systemGroup.paymentSystems[0]
		setSelectedPaymentData({
			groupName: groupName,
			paymentSystem: ps,
			payload: {
				paymentSystem: ps.stringId,
				bin: ps.bin,
				hasDefaultBillingAddress: true,
				isLuhnValid: true,
				installmentsInterestRate: ps.installments[0]?.interestRate,
				accountId: null,
				tokenId: null,
				installments: `${ps.installments[0]?.count}`, //TODO: NÃO ESTÁ RECEBENDO COMO NUMERO
				referenceValue: ps.installments[0]?.value,
				value: ps.installments[0]?.total,
				isRegexValid: true,
			},
			isReadyToPay: true,
		})
	}

	return (
		<GroupsWrapper
			title='Boleto Bancário'
			icon={<Boleto />}
			valueInCents={systemGroup.paymentSystems[0]?.installments?.[0]?.total ?? cart.value}
			isChecked={groupName === selectedPaymentData?.groupName}
			onPress={onSelectThisGroup}
		/>
	)
}

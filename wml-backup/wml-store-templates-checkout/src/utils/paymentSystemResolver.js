import { formatAmountInCents } from './utils'

export const paymentSystemResolver = (cart) => {
	const paymentData = JSON.parse(JSON.stringify(cart.paymentData))

	return paymentData?.paymentSystems?.reduce((acc, paymentSystem) => {
		const group = acc?.find((group) => group.groupName === paymentSystem.groupName)

		const installments = paymentData.installmentOptions?.find(
			(installment) => installment.paymentSystem === paymentSystem.stringId,
		)

		const isCurrentPaymentSystem = paymentData?.payments?.some(
			(payment) => payment.paymentSystem === paymentSystem.stringId,
		)

		if (group) {
			group.isCurrentPaymentSystemGroup = isCurrentPaymentSystem
			group.paymentSystems.push({
				...paymentSystem,
				isCurrentPaymentSystem: isCurrentPaymentSystem,
				installments: installments?.installments.map((installment) => ({
					...installment,
					label: `${installment.count}x de ${formatAmountInCents(installment.value)} ${installment.hasInterestRate ? 'com juros' : 'sem juros'}`,
					formattedValue: formatAmountInCents(installment.value),
				})),
			})
		} else {
			acc.push({
				groupName: paymentSystem.groupName,
				isCurrentPaymentSystemGroup: isCurrentPaymentSystem,
				paymentSystems: [
					{
						...paymentSystem,
						isCurrentPaymentSystem: isCurrentPaymentSystem,
						installments: installments?.installments.map((installment) => ({
							...installment,
							label: `${installment.count}x de ${formatAmountInCents(installment.value)} ${installment.hasInterestRate ? 'com juros' : 'sem juros'}`,
							formattedValue: formatAmountInCents(installment.value),
						})),
					},
				],
			})
		}

		return acc
	}, [])
}

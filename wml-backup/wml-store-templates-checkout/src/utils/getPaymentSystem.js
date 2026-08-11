import { formatAmountInCents } from './utils'

export const getPaymentSystem = (cart) => {
	if (!cart?.paymentData) return
	const paymentData = JSON.parse(JSON.stringify(cart?.paymentData))

	return paymentData?.paymentSystems?.reduce((acc, paymentSystem) => {
		const group = acc?.find((group) => group.groupName === paymentSystem.groupName)

		const installments = paymentData.installmentOptions?.find(
			(installment) => installment.paymentSystem === paymentSystem.stringId,
		)

		const currentPaymentSystem = paymentData?.payments?.some(
			(payment) => payment.paymentSystem === paymentSystem.stringId,
		)

		const paymentSystemObject = {
			...paymentSystem,
			isCurrentPaymentSystem: currentPaymentSystem,
			installments: installments?.installments.map((installment) => ({
				...installment,
				label: `${installment.count}x de ${formatAmountInCents(
					installment.value,
				)} (total: ${formatAmountInCents(installment.total)})`,
				formattedValue: formatAmountInCents(installment.value),
			})),
		}

		if (group) {
			group.isCurrentPaymentSystemGroup =
				paymentSystemObject.isCurrentPaymentSystem ||
				group.paymentSystems.some((ps) => ps.isCurrentPaymentSystem)
			group.paymentSystems.push({
				...paymentSystemObject,
			})
		} else {
			acc.push({
				isCurrentPaymentSystemGroup: paymentSystemObject.isCurrentPaymentSystem,
				groupName: paymentSystem.groupName,
				paymentSystems: [
					{
						...paymentSystemObject,
					},
				],
			})
		}

		return acc
	}, [])
}

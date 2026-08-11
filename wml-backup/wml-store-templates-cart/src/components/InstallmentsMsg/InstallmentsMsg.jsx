import { useTranslation } from 'eitri-i18n'
import { View, Text } from 'eitri-luminus'

import { useLocalShoppingCart } from '../../providers/LocalCart'
export default function InstallmentsMsg(props) {
	const { cart } = useLocalShoppingCart()
	const { t } = useTranslation()

	const findMaxInstallments = (installmentOptions) => {
		let maxInstallments = 0

		installmentOptions?.forEach((option) => {
			option.installments?.forEach((installment) => {
				if (installment.count > maxInstallments) {
					maxInstallments = installment.count
				}
			})
		})

		return maxInstallments
	}

	const maxInstallments = findMaxInstallments(cart?.paymentData?.installmentOptions)

	if (!maxInstallments || maxInstallments < 2) {
		return null
	}

	return (
		<View className='bg-primary-100 flex items-center justify-center'>
			<View className='text-primary-100'>
				<svg
					className='h-5 w-5'
					fill='#000'
					viewBox='0 0 512 512'
					xmlns='http://www.w3.org/2000/svg'>
					<path d='M76.8 358.4h153.6c4.71 0 8.533-3.823 8.533-8.533s-3.823-8.533-8.533-8.533H76.8c-4.71 0-8.533 3.823-8.533 8.533S72.09 358.4 76.8 358.4zM503.467 221.867h-460.8c-4.71 0-8.533 3.823-8.533 8.533 0 4.71 3.823 8.533 8.533 8.533h452.267v162.133c0 14.114-11.486 25.6-25.6 25.6H42.667c-11.87 0-25.6-8.755-25.6-25.6V213.333c0-4.71-3.823-8.533-8.533-8.533S0 208.623 0 213.333v187.733c0 20.506 16.614 42.667 42.667 42.667h426.667c23.526 0 42.667-19.14 42.667-42.667V230.4c0-4.71-3.823-8.533-8.533-8.533zM469.333 68.267H42.667C19.14 68.267 0 87.407 0 110.933v51.2c0 4.71 3.823 8.533 8.533 8.533h460.8c4.71 0 8.533-3.823 8.533-8.533 0-4.71-3.823-8.533-8.533-8.533H17.067v-42.667c0-14.114 11.486-25.6 25.6-25.6h426.667c14.114 0 25.6 11.486 25.6 25.6v85.333c0 4.71 3.823 8.533 8.533 8.533s8.533-3.823 8.533-8.533v-85.333c0-23.526-19.14-42.667-42.667-42.667zM298.667 324.267c4.71 0 8.533-3.823 8.533-8.533s-3.823-8.533-8.533-8.533H230.4c-4.71 0-8.533 3.823-8.533 8.533s3.823 8.533 8.533 8.533h68.267zM76.8 324.267h119.467c4.71 0 8.533-3.823 8.533-8.533s-3.823-8.533-8.533-8.533H76.8c-4.71 0-8.533 3.823-8.533 8.533s3.823 8.533 8.533 8.533z' />
				</svg>
			</View>
			<Text className='text-primary-100 py-1 pl-1'>
				{`${t('cart.labelInstalmentUntil')} ${maxInstallments}x`}
			</Text>
		</View>
	)
}

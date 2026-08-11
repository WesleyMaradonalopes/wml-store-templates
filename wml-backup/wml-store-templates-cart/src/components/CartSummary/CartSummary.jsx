import { View, Text } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

import { formatAmountInCents, getTotalizerValueById } from '../../utils/utils'
import { useLocalShoppingCart } from '../../providers/LocalCart'

export default function CartSummary(props) {
	const { freeFreightThreshold = Infinity } = props
	const { cart } = useLocalShoppingCart()
	const { t } = useTranslation()

	// const reachedFreeFreight = cartValue >= freeFreightThreshold

	const itemsValue = getTotalizerValueById(cart, 'Items')
	const reachedFreeFreight = itemsValue >= freeFreightThreshold

	const discountValue = getTotalizerValueById(cart, 'Discounts')

	const shippingValue = reachedFreeFreight ? 0 : getTotalizerValueById(cart, 'Shipping')

	const totalValue = itemsValue + discountValue + shippingValue

	if (totalValue === 0) return null

	return (
		<View className='px-4'>
			<View className='rounded-[16px] border border-[#EFEDEA] bg-white p-4'>
				<View className='flex w-full justify-center'>
					<View className='w-full max-w-sm'>
						<Text
							className='text-[16px] font-medium leading-[24px] text-[#0F0805]'
							style={{ fontFamily: 'Montserrat' }}
						>
							Resumo
						</Text>
						<View className='mt-2 border-y border-[#EFEDEA] p-4'>
							<View className='flex flex-col gap-1'>
								{/* Items */}
								{itemsValue > 0 && (
									<View className='flex justify-between'>
										<Text className='font-sans text-[14px] font-medium leading-[21px] text-[#575756]'>
											{t('cartSummary.txtSubtotal')}
										</Text>
										<Text className='font-sans text-[14px] font-medium leading-[21px] text-right text-[#0F0805]'>
											{formatAmountInCents(itemsValue)}
										</Text>
									</View>
								)}

								{/* Discount */}
								{discountValue < 0 && (
									<View className='flex justify-between'>
										<Text className='font-sans text-[14px] font-medium leading-[21px] text-[#575756]'>
											{t('cartSummary.txtDiscount')}
										</Text>
										<Text className='font-sans text-[14px] font-medium leading-[21px] text-right text-[#0F0805]'>
											{formatAmountInCents(discountValue)}
										</Text>
									</View>
								)}

								{/* Shipping */}
								<View className='flex justify-between'>
									<Text className='font-sans text-[14px] font-medium leading-[21px] text-[#575756]'>
										{t('cartSummary.txtDelivery')}
									</Text>
									<Text className='font-sans text-[14px] font-medium leading-[21px] text-right text-[#0F0805]'>
										{shippingValue === 0
											? t('cartSummary.txtFree')
											: formatAmountInCents(shippingValue)}
									</Text>
								</View>

								{/* Total */}
								{totalValue > 0 && (
									<View className='flex justify-between'>
										<Text className='font-sans text-[16px] font-semibold leading-[24px] text-[#0F0805]'>
											{t('cartSummary.txtTotal')}
										</Text>
										<Text className='font-sans text-[16px] font-semibold leading-[24px] text-right text-[#0F0805]'>
											{formatAmountInCents(totalValue)}
										</Text>
									</View>
								)}
							</View>
						</View>
					</View>
				</View>
			</View>
		</View>
	)
}

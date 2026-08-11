import { useTranslation } from 'eitri-i18n'
import { Text, View } from 'eitri-luminus'

import { formatAmountInCents } from '../../utils/utils'
import { useLocalShoppingCart } from '../../providers/LocalCart'

export default function CartSummary() {
	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()

	// Calculate final total
	const finalTotal = cart?.totalizers?.reduce((acc, totalizer) => acc + totalizer.value, 0)

	return (
		<View className='flex w-full flex-col rounded-[16px] border border-[#EFEDEA] bg-white px-[17px] py-4 shadow-sm'>
			{/* Totalizers breakdown */}
			<View className='flex flex-col gap-1 pb-2'>
				{cart?.totalizers?.map((totalizer) => (
					<View
						key={totalizer.id}
						className='flex flex-row items-center justify-between'>
						<Text className='text-[14px] font-medium leading-[150%] text-[#575756]'>{totalizer.name}</Text>
						<Text className='text-[14px] font-medium leading-[150%] text-[#575756]'>{formatAmountInCents(totalizer.value)}</Text>
					</View>
				))}
			</View>

			{/* Final total */}
			<View className='flex w-full flex-row items-center justify-between border-t border-[#ECE8E4] pt-3'>
				<Text className='text-[14px] font-semibold leading-[150%] text-[#0F0805]'>{t('finishCart.txtTotal')}</Text>
				<Text className='text-[14px] font-semibold leading-[150%] text-[#0F0805]'>{formatAmountInCents(finalTotal)}</Text>
			</View>
		</View>
	)
}

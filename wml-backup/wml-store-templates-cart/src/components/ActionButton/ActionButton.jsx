import { View } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

import { CustomButton, BottomInset } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../providers/LocalCart'
import { navigateToCheckout } from '../../services/navigationService'

export default function ActionButton(props) {
	const { cart } = useLocalShoppingCart()
	const { t } = useTranslation()

	const goToCheckout = async () => {
		if (isValidToProceed()) {
			navigateToCheckout(cart?.orderFormId)
		}
	}

	const isValidToProceed = () => {
		if (!cart) return false
		if (!cart?.items) return false
		return cart?.items.length !== 0
	}

	const canProceed = isValidToProceed()

	return (
		<>
			<View className='fixed bottom-0 left-0 z-50 w-full border-t border-gray-300 bg-white'>
				<View className='py-[14px] px-4'>
					<CustomButton
						disabled={!canProceed}
						label={t('cartSummary.labelFinish')}
						onPress={goToCheckout}
						className={canProceed ? 'h-[49px] bg-[#1E120D]' : ''}
						textClassName={canProceed ? 'font-sans text-sm font-semibold leading-[100%] tracking-[0em] text-white' : ''}
					/>
				</View>
				<BottomInset />
			</View>

			<View className={'h-[77px]'} />

			<BottomInset />
		</>
	)
}

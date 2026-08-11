import { CustomButton, CustomInput } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../../providers/LocalCart'
import { navigate } from '../../../services/navigationService'
import { formatAmountInCents } from '../../../utils/utils'
import LoadingComponent from '../../Shared/Loading/LoadingComponent'
import GroupsWrapper from './GroupsWrapper'

export default function GiftCard(props) {
	const { cart, setPaymentOption } = useLocalShoppingCart()

	const [isLoading, setIsLoading] = useState(false)
	const [redemptionCode, setRedemptionCode] = useState('')
	const [selected, setSelected] = useState(false)
	const [error, setError] = useState(false)
	const [giftCardValue, setGiftCardValue] = useState(0)

	useEffect(() => {
		if (cart?.paymentData?.giftCards?.length > 0) {
			loadCardValue(cart)
			setSelected(true)
		} else {
			setSelected(false)
			setGiftCardValue(0)
		}
	}, [])

	const loadCardValue = (cart) => {
		const giftCardsValue = cart.paymentData?.giftCards?.reduce((acc, giftCard) => acc + giftCard.value, 0) ?? 0
		setGiftCardValue(giftCardsValue)
	}

	const addGiftCard = async () => {
		try {
			setIsLoading(true)
			const payload = {
				payments: cart.paymentData.payments,
				giftCards: [
					...cart.paymentData.giftCards,
					{
						redemptionCode: redemptionCode,
						inUse: true,
						isSpecialCard: false,
					},
				],
			}

			const newCart = await setPaymentOption(payload)
			const applied = newCart?.paymentData?.giftCards?.some(
				(gift) =>
					gift.redemptionCode?.replace(/-/g, '')?.toLowerCase() ===
					redemptionCode?.replace(/-/g, '')?.toLowerCase(),
			)
			if (applied) {
				loadCardValue(newCart)
				setRedemptionCode('')
				setIsLoading(false)
				//trackAddPaymentInfo(newCart, 'Vale Presente')
			} else {
				setError('Código Invalido')
				setIsLoading(false)
				setTimeout(() => {
					setError('')
				}, 8000)
			}
		} catch (e) {
			console.error('Error adding gift card:', e)
			setIsLoading(false)
		}
	}

	const removeGiftCart = async (giftId) => {
		try {
			const newGiftCardList = cart?.giftCards?.filter((gift) => gift.id !== giftId)
			setIsLoading(true)
			const payload = {
				payments: cart.paymentData.payments,
				giftCards: newGiftCardList,
			}
			await setPaymentOption(payload)
			setRedemptionCode('')
			setGiftCardValue(0)
			setIsLoading(false)
		} catch (e) {
			console.error('Error removing gift card:', e)
			setIsLoading(false)
		}
	}

	return (
		<GroupsWrapper
			title='Vale presente'
			// icon={<Gift />}
			valueInCents={cart.value}
			onPress={() => { }}>
			<View>
				{!selected && (
					<View onClick={() => setSelected(!selected)}>
						<Text className='font-bold text-primary'>Adicionar vale presente</Text>
					</View>
				)}
				{selected && (
					<>
						<View className='mt-2 flex w-full items-end justify-between gap-2'>
							<View className='w-2/3'>
								<CustomInput
									checkoutVariant
									placeholder='Insira o código do vale presente'
									value={redemptionCode}
									onChange={(e) => setRedemptionCode(e.target.value)}
								/>
							</View>
							<View className='w-1/3'>
								<CustomButton
									checkoutVariant
									adjacentToInput
									label='Adicionar'
									className='grow'
									onPress={addGiftCard}
								/>
							</View>
						</View>

						{error && (
							<View className='mt-2'>
								<Text className='text-xs font-bold text-red-500'>{error}</Text>
							</View>
						)}

						<View className='flex flex-col gap-2'>
							{isLoading && (
								<View className='my-2 flex justify-center'>
									<LoadingComponent inline />
								</View>
							)}
							{!isLoading &&
								cart?.paymentData?.giftCards?.length > 0 &&
								cart?.paymentData?.giftCards
									?.filter((gift) => gift.redemptionCode)
									.map((gift) => (
										<View
											key={gift.id}
											className='mt-1 flex flex-row items-center justify-between gap-5 px-1 py-2'>
											<View className='flex flex-col'>
												<Text className='text-sm'>{`${gift.redemptionCode}`}</Text>
												<Text className='text-sm font-bold text-primary'>
													{formatAmountInCents(gift.value)}
												</Text>
											</View>
											<View className='flex flex-row items-center justify-between'>
												<View onClick={() => removeGiftCart(gift.id)}>
													<Text className='text-xs font-bold text-blue-500'>{'Remover'}</Text>
												</View>
											</View>
										</View>
									))}
						</View>

						{giftCardValue > 0 && giftCardValue < cart.value && (
							<View>
								<Text className='text-sm font-bold'>{`Pagamento restante de ${formatAmountInCents(cart.value - giftCardValue)}. Por favor, combine com outra forma de pagamento`}</Text>
							</View>
						)}

						{giftCardValue > 0 && giftCardValue >= cart.value && (
							<View>
								<CustomButton
									checkoutVariant
									label='Continuar'
									className='mt-1 w-full'
									onClick={() => navigate('CheckoutReview')}
								/>
							</View>
						)}
					</>
				)}
			</View>
		</GroupsWrapper>
	)
}

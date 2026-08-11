import { useTranslation } from 'eitri-i18n'
import { Image, Text, View } from 'eitri-luminus'

import { formatAmountInCents, hideCreditCardNumber } from '../../utils/utils'
import SimpleCard from '../Card/SimpleCard'
import iconCard from '../../assets/images/credit_card.svg'
import { useLocalShoppingCart } from '../../providers/LocalCart'
import CardIcon from '../Icons/CardIcons/CardIcon'
import pixImage from '../../assets/images/pix.png'
import googlePayImage from '../../assets/images/GPay_Acceptance_Mark_800.png'

function CreditCardVisual({ cardInfo, cardName }) {
	const { t } = useTranslation()

	// Determinar a cor do cartão baseado na bandeira detectada
	const getCardGradient = (brand) => {
		const loBrand = brand.toLowerCase()
		switch (loBrand) {
			case 'visa':
				return 'from-blue-600 via-blue-700 to-blue-800'
			case 'mastercard':
				return 'from-orange-500 via-red-500 to-red-600'
			case 'elo':
				return 'from-green-600 via-green-700 to-green-800'
			case 'amex':
				return 'from-teal-500 via-teal-600 to-teal-700'
			case 'hipercard':
				return 'from-purple-600 via-purple-700 to-purple-800'
			case 'diners':
				return 'from-indigo-600 via-indigo-700 to-indigo-800'
			case 'discover':
				return 'from-orange-600 via-orange-700 to-orange-800'
			default:
				return 'from-slate-600 via-slate-700 to-slate-800'
		}
	}

	return (
		<View
			className={`relative overflow-hidden rounded-lg bg-gradient-to-br p-4 ${getCardGradient(cardName)} border border-gray-200 shadow-md`}>
			{/* Efeito de brilho sutil */}
			<View className='absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-12 rounded-full bg-white/10' />
			<View className='absolute bottom-0 left-0 h-16 w-16 -translate-x-8 translate-y-8 rounded-full bg-white/5' />

			{/* Conteúdo do cartão */}
			<View className='relative z-10 flex flex-col gap-3'>
				{/* Header do cartão */}
				<View className='flex flex-row items-center justify-between'>
					<Text className='text-xs font-medium text-white/80'>CARTÃO DE CRÉDITO</Text>
					<CardIcon
						width={'40px'}
						iconKey={cardName}
					/>
				</View>

				{/* Número do cartão */}
				<View className='flex flex-col gap-1'>
					<Text className='text-xs text-white/60'>Número do cartão</Text>
					<Text className='font-mono text-base tracking-wider text-white'>
						{hideCreditCardNumber(cardInfo?.cardNumber)}
					</Text>
				</View>

				{/* Informações do titular e validade */}
				<View className='flex flex-row items-end justify-between'>
					{cardInfo?.holderName && (
						<View className='flex flex-col gap-1'>
							<Text className='text-xs text-white/60'>Titular</Text>
							<Text className='text-sm font-medium text-white'>{cardInfo?.holderName}</Text>
						</View>
					)}

					<View className='flex flex-col items-end gap-1'>
						<Text className='text-xs text-white/60'>CVV</Text>
						<Text className='text-sm font-medium text-white'>{cardInfo?.validationCode}</Text>
					</View>
					{cardInfo?.dueDate && (
						<View className='flex flex-col items-end gap-1'>
							<Text className='text-xs text-white/60'>Válido até</Text>
							<Text className='text-sm font-medium text-white'>{cardInfo?.dueDate}</Text>
						</View>
					)}
				</View>
			</View>
		</View>
	)
}

export default function SelectedPaymentData(props) {
	const { onPress } = props

	const { cart, cardInfo } = useLocalShoppingCart()

	const { t } = useTranslation()
	const paymentSystem = cart?.paymentData?.payments?.[0]

	const getPaymentSystemDetails = (paymentSystem) => {
		const ps = cart?.paymentData?.paymentSystems?.find((ps) => ps.stringId === paymentSystem.paymentSystem)
		return {
			groupName: ps?.groupName,
			name: ps.name,
			value: paymentSystem.value,
			installment: paymentSystem.installment,
			installmentText: `${paymentSystem?.merchantSellerPayments?.[0]?.installments}x de ${formatAmountInCents(paymentSystem?.merchantSellerPayments?.[0]?.installmentValue)}`,
		}
	}

	return (
		<SimpleCard
			isFilled={paymentSystem || cart?.paymentData?.giftCards?.length > 0}
			onPress={onPress}
			title={t('selectedPaymentData.txtPayment')}
			icon={iconCard}>
			<View className={'flex flex-col gap-4'}>
				{cart?.paymentData?.payments?.length > 0 && (
					<View className='flex flex-col gap-4'>
						{cart?.paymentData?.payments?.map((payment) => {
							const { name, groupName, installmentText } = getPaymentSystemDetails(payment)

							if (groupName === 'creditCardPaymentGroup') {
								return (
									<View
										key={payment.paymentSystem}
										className='flex flex-col gap-3'>
										{/* Cartão visual */}
										<CreditCardVisual
											cardInfo={cardInfo}
											cardName={name}
										/>

										{/* Informações adicionais do cartão */}
										<View className='rounded-lg border border-gray-200 bg-white p-3'>
											<View className='flex flex-col items-center gap-1'>
												<Text className='text-xs text-gray-600'>Parcelamento</Text>
												<Text className='text-sm font-bold text-primary'>
													{installmentText}
												</Text>
											</View>
										</View>
									</View>
								)
							}

							if (groupName === 'instantPaymentPaymentGroup') {
								return (
									<View
										key={payment.paymentSystem}
										className='flex flex-col items-center justify-center gap-4 p-4'>
										<Image
											src={pixImage}
											className='w-[130px] object-contain'
										/>
										<Text className='text-sm'>Aprovação imediata</Text>
									</View>
								)
							}

							if (groupName === 'WH Google PayPaymentGroup') {
								return (
									<View
										key={payment.paymentSystem}
										className='flex flex-col items-center justify-center gap-4 p-4'>
										<Image
											src={googlePayImage}
											className='w-[130px] object-contain'
										/>
									</View>
								)
							}

							return (
								<View
									key={payment.paymentSystem}
									className='flex items-center gap-2'>
									<Text className='text-sm font-medium text-base-content/80'>{name}</Text>
								</View>
							)
						})}
					</View>
				)}
				{cart?.paymentData?.giftCards && cart?.paymentData?.giftCards?.length > 0 && (
					<View className='flex flex-col gap-3'>
						<View className='flex items-center gap-2'>
							<Text className='text-sm font-medium text-base-content/80'>
								Pagamento com vale presente:
							</Text>
						</View>

						<View className='flex flex-col gap-2'>
							{cart?.paymentData?.giftCards
								?.filter((gift) => gift.redemptionCode)
								.map((gift, index) => (
									<View
										key={index}
										className='flex items-center justify-between rounded bg-neutral-50 p-3'>
										<View className='flex flex-col'>
											<Text className='text-xs text-base-content/60'>Código</Text>
											<Text className='font-mono text-sm font-medium text-base-content'>
												{gift.redemptionCode}
											</Text>
										</View>
										<View className='flex flex-col items-end'>
											<Text className='text-xs text-base-content/60'>Valor</Text>
											<Text className='text-sm font-bold'>{formatAmountInCents(gift.value)}</Text>
										</View>
									</View>
								))}
						</View>
					</View>
				)}
			</View>
		</SimpleCard>
	)
}

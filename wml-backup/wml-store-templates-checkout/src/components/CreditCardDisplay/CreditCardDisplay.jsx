import CardIcon from '../Icons/CardIcons/CardIcon'

export default function CreditCardDisplay({ cardInfo, cardName }) {
	// Determinar a cor do cartão baseado na bandeira detectada
	const getCardGradient = (brand) => {
		const loBrand = brand?.toLowerCase()
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
			className={`relative overflow-hidden rounded-lg bg-gradient-to-br p-4 ${getCardGradient(cardName)} border border-gray-200 shadow-md`}
			height={'190'}>
			{/* Efeito de brilho sutil */}
			<View className='absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-12 rounded-full bg-white/10' />
			<View className='absolute bottom-0 left-0 h-16 w-16 -translate-x-8 translate-y-8 rounded-full bg-white/5' />

			{/* Conteúdo do cartão */}
			<View className='relative z-10 flex h-[100%] flex-col justify-between'>
				{/* Header do cartão */}
				<View className='flex flex-row items-center justify-between'>
					<Text className='text-xs font-medium text-white/80'>CARTÃO DE CRÉDITO</Text>
					<CardIcon
						width={'20px'}
						iconKey={cardName}
					/>
				</View>

				<View className='grow-1 mt-2 flex h-[100%] flex-col justify-between gap-4'>
					{/* Número do cartão */}
					<View className='flex flex-col'>
						<Text className='text-xs text-white/60'>Número do cartão</Text>
						<View className='h-[18px]'>
							{cardInfo?.cardNumber && (
								<Text className='font-mono text-base tracking-wider text-white'>
									{cardInfo?.cardNumber}
								</Text>
							)}
						</View>
					</View>

					{/* Informações do titular e validade */}
					<View className='flex flex-row items-end justify-between'>
						<View className='flex flex-col'>
							<Text className='text-xs text-white/60'>Titular</Text>
							<View className='h-[14px] max-w-[100%]'>
								{cardInfo?.holderName && (
									<Text className='truncate text-sm font-medium text-white'>
										{cardInfo?.holderName}
									</Text>
								)}
							</View>
						</View>
					</View>

					{/* Informações do titular e validade */}
					<View className='flex flex-row items-end justify-between'>
						<View className='flex flex-col'>
							<Text className='text-xs text-white/60'>Válido até</Text>
							<View className='h-[16px]'>
								{cardInfo?.dueDate && (
									<Text className='text-sm font-medium text-white'>{cardInfo?.dueDate}</Text>
								)}
							</View>
						</View>

						<View className='flex flex-col items-end'>
							<Text className='text-xs text-white/60'>CVV</Text>
							<View className='h-[16px]'>
								{cardInfo?.validationCode && (
									<Text className='text-sm font-medium text-white'>{cardInfo?.validationCode}</Text>
								)}
							</View>
						</View>
					</View>
				</View>
			</View>
		</View>
	)
}

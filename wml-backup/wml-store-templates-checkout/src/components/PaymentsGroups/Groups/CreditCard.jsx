import { Radio, Text, View } from 'eitri-luminus'

import { CustomButton, CustomInput } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../../providers/LocalCart'
import GroupsWrapper from './GroupsWrapper'
import Card from '../../Icons/MethodIcons/Card'
import CardIcon from '../../Icons/CardIcons/CardIcon'
import { navigate } from '../../../services/navigationService'
import { useCustomer } from '../../../providers/Customer'
import { trackAddPaymentInfo } from '../../../services/Tracking'

export default function CreditCard(props) {
	const { onSelectPaymentMethod, systemGroup } = props

	const { cart, setCardInfo, cardInfo, removeAccount } = useLocalShoppingCart()
	const { checkoutProfile, getCustomer } = useCustomer()

	const [availableAccounts, setAvailableAccounts] = useState([])
	const [accountSelected, setAccountSelected] = useState(null)

	const [accountToRemove, setAccountToRemove] = useState(null)
	const [otpLogin, setOtpLogin] = useState(false)
	const [loadingRemoveCard, setLoadingRemoveCard] = useState(false)

	useEffect(() => {
		if (loadingRemoveCard) return
		if (checkoutProfile?.availableAccounts || cart?.paymentData?.availableAccounts) {
			setAvailableAccounts(
				assetUniqueCards(checkoutProfile?.availableAccounts || cart?.paymentData?.availableAccounts),
			)
		}
	}, [checkoutProfile, cart])

	const assetUniqueCards = (accounts) => {
		const cards = []
		accounts.forEach((account) => {
			if (!cards.some((card) => card.cardNumber === account.cardNumber)) {
				cards.push(account)
			}
		})
		return cards
	}

	const getCardLastDigits = (cardNumber) => {
		return cardNumber?.replace(/\D+/g, '')?.slice(-4) || ''
	}

	const setPaymentSystem = async () => {
		const paymentSystem = systemGroup?.paymentSystems?.find(
			(system) => system.stringId === accountSelected?.paymentSystem,
		)
		if (!paymentSystem) return

		await onSelectPaymentMethod([
			{
				paymentSystem: paymentSystem.id,
				installmentsInterestRate: 0,
				installments: 1,
				referenceValue: cart.value,
				value: cart.value,
				hasDefaultBillingAddress: true,
			},
		])
		// trackAddPaymentInfo(cart, paymentSystem.name)
		navigate('Installments', { paymentSystem })
	}

	const selectCart = async (account) => {
		setAccountSelected(account)
		setCardInfo(account)
	}

	const isAccountSelected = (account) => {
		if (!accountSelected || !account) return false

		return (
			(accountSelected?.accountId && accountSelected.accountId === account?.accountId) ||
			(accountSelected?.cardNumber === account?.cardNumber &&
				accountSelected?.paymentSystem === account?.paymentSystem)
		)
	}

	const addNewCard = async () => {
		navigate('AddCardForm')
	}

	const removeAccountConfirm = async (e, account) => {
		e.stopPropagation()
		setAccountToRemove(account)
	}

	const removeUserAccount = async (isRetrying) => {
		try {
			setLoadingRemoveCard(true)
			setOtpLogin(false)
			const accounts = checkoutProfile?.availableAccounts || cart?.paymentData?.availableAccounts

			// Tem conta com cartão repetido... remove todos os accounts com o cartão
			const accountsToRemove = accounts.filter((account) => account.cardNumber === accountToRemove?.cardNumber)

			setAvailableAccounts(
				availableAccounts.filter((account) => account.cardNumber !== accountToRemove?.cardNumber),
			)

			// Avoid infinite loop
			if (!(await isLoggedIn())) {
				if (!isRetrying) {
					setOtpLogin(true)
				}
				console.log('nao logado, tenta logar com o otp')
				return
			}

			setAccountToRemove(null)

			for (const acc of accountsToRemove) {
				try {
					await removeAccount(acc.accountId)
				} catch (error) {
					console.log(error)
				}
			}

			await getCustomer()
			setLoadingRemoveCard(false)
		} catch (e) {
			setLoadingRemoveCard(false)
		}
	}

	return (
		<>
			<GroupsWrapper
				className='border-[#1E120D]'
				title='Cartão de Crédito'
				icon={<Card />}
				valueInCents={systemGroup.paymentSystems[0]?.installments?.[0]?.total ?? cart.value}>
				{availableAccounts?.length > 0 && (
					<View className='flex flex-col gap-3'>
						{availableAccounts?.map((account) => {
							const selected = isAccountSelected(account)

							return (
								<View
									key={account.id}
									onClick={() => selectCart(account)}
									className={`rounded border p-3 ${
										selected ? 'border-[#1E120D] bg-primary/5' : 'border-gray-200 bg-white'
									}`}>
									<View className='flex flex-row items-center justify-between gap-3'>
										<View className='flex flex-1 flex-row items-center gap-2'>
											<Radio
												className='radio-primary'
												checked={selected}
												name='saved-card-option'
												value={account.id}
												onChange={() => selectCart(account)}
											/>
											<CardIcon
												width={'30px'}
												iconKey={account?.paymentSystemName}
											/>
											<View className='flex flex-col'>
												<View className='flex items-center gap-2'>
													<Text className='text-sm font-bold'>{`${account?.paymentSystemName}`}</Text>
													<View
														onClick={(e) => removeAccountConfirm(e, account)}
														className='text-xs font-semibold text-primary'>
														(Remover)
													</View>
												</View>
												<Text className='text-sm'>{`final ${getCardLastDigits(account?.cardNumber)}`}</Text>
											</View>
										</View>

										<View className='flex flex-row items-center gap-2'>
											<svg
												xmlns='http://www.w3.org/2000/svg'
												width='24'
												height='24'
												viewBox='0 0 24 24'
												fill='none'
												stroke='currentColor'
												strokeWidth='2'
												strokeLinecap='round'
												strokeLinejoin='round'
												className='text-primary'>
												<polyline points='9 18 15 12 9 6'></polyline>
											</svg>
										</View>
									</View>
								</View>
							)
						})}
						{accountSelected && (
							<View className='mt-2 flex flex-row items-end gap-2'>
								<View className='w-2/4'>
									<CustomInput
										checkoutVariant
										inputMode='numeric'
										variant='mask'
										mask='9999'
										label='Cód. Segurança'
										placeholder={'Cód. Segurança'}
										value={cardInfo?.validationCode || ''}
										onChange={(e) => setCardInfo({ ...cardInfo, validationCode: e.target.value })}
									/>
								</View>
								<View className='w-2/4'>
									<CustomButton
										checkoutVariant
										adjacentToInput
										onClick={setPaymentSystem}
										disabled={!cardInfo?.validationCode || cardInfo?.validationCode?.length < 3}
										label='Continuar'
									/>
								</View>
							</View>
						)}
					</View>
				)}

				<View onClick={addNewCard} className='py-2'>
					<Text className='text-[14px] font-medium leading-[150%] text-[#575756]'>+ novo cartão</Text>
				</View>
			</GroupsWrapper>

			{accountToRemove && (
				<View
					className='fixed inset-0 z-[9999] flex items-center justify-center !bg-black/70 !opacity-100'
					onClick={() => {
						setAccountToRemove(null)
					}}>
					<View
						onClick={(e) => e.stopPropagation()}
						className='pointer-events-auto max-h-[70vh] max-w-[80%] overflow-y-auto !rounded-t-sm bg-white p-4'>
						<Text className='text-lg font-semibold'>
							{`Deseja remover o cartão final ${getCardLastDigits(accountToRemove?.cardNumber)}`}
						</Text>

						<View className='mt-5 flex flex-col gap-3'>
							<CustomButton
								checkoutVariant
								label='Sim'
								onClick={removeUserAccount}
							/>
							<CustomButton
								checkoutVariant
								outlined
								label='Não'
								onClick={() => setAccountToRemove(null)}
							/>
						</View>
					</View>
				</View>
			)}

			<OtpLogin
				open={otpLogin}
				onClose={() => setOtpLogin(false)}
				onLogged={() => removeUserAccount(true)}
			/>
		</>
	)
}

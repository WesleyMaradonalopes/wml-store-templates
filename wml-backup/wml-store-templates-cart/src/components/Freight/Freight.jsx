import { useTranslation } from 'eitri-i18n'
import { View, Text, Radio } from 'eitri-luminus'

import { useState, useEffect } from 'react'

import { CustomButton, CustomInput, Loading, shippingResolver } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../providers/LocalCart'
import { loadPostalCodeFromStorage, savePostalCodeOnStorage } from '../../services/customerService'

export default function Freight(props) {
	const { cart, setNewAddress, setFreight } = useLocalShoppingCart()
	const { t } = useTranslation()

	const [zipCode, setZipCode] = useState('')
	const [isUnavailable, setIsUnavailable] = useState(false)
	const [messagesError, setMessagesError] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState(false)
	const [isEditingZipCode, setIsEditingZipCode] = useState(false)

	useEffect(() => {
		if (cart) {
			if (!cart?.shippingData?.address) {
				loadPostalCodeFromStorage().then((postalCode) => {
					if (postalCode) {
						setZipCode(postalCode)
						fetchFreight(postalCode)
					}
				})
			} else {
				setZipCode(cart?.shippingData?.address?.postalCode)
				fetchFreight(cart?.shippingData?.address?.postalCode)
			}
		}
	}, [])

	const onInputZipCode = (e) => {
		setZipCode(e.target.value)
	}

	const onPressZipCodeChange = async () => {
		try {
			if (!zipCode) {
				return
			}
			if (!(zipCode.length == 8 || zipCode.length == 9)) {
				setError(t('freight.errorCep'))
				return
			}
			fetchFreight(zipCode)
		} catch (e) {
			console.error('Error onPressZipCodeChange', e)
		}
	}

	const onPressEditZipCode = () => {
		setIsEditingZipCode(true)
		setZipCode('')
		setError('')
	}

	const fetchFreight = async (zipCode) => {
		setIsLoading(true)
		try {
			setError('')

			savePostalCodeOnStorage(zipCode)

			await setNewAddress(cart, zipCode)
		} catch (error) {
			console.error('Error fetching freight', error)
			setError(t('freight.errorCalcFreight'))
		} finally {
			setIsLoading(false)
		}
	}

	const handleOptionSelect = async (option) => {
		try {
			setIsLoading(true)
			const payload = {
				clearAddressIfPostalCodeNotFound: true,
				logisticsInfo: option?.slas?.map((sla) => {
					return {
						itemIndex: sla.itemIndex,
						selectedDeliveryChannel: sla.deliveryChannel,
						selectedSla: sla.id,
					}
				}),
				selectedAddresses: cart?.shippingData?.selectedAddresses,
			}
			await setFreight(payload)
			setIsLoading(false)
		} catch (e) {
			console.log('Error handleOptionSelect', e)
			setIsLoading(false)
		}
	}

	const getMessageError = (label) => {
		const message = messagesError.find((item) => item.code === 'cannotBeDelivered')
		return (
			<View className='w-full px-2'>
				<Text className='font-bold'>{label}</Text>
				{message && <Text className='text-tertiary-700 text-xs'>{message.fields?.skuName}</Text>}
			</View>
		)
	}

	if (!cart) return null

	const shipping = shippingResolver(cart)
	const deliveryOptions = shipping?.options?.filter((option) => !option.isPickupInPoint) || []
	const pickupOptions = shipping?.options?.filter((option) => option.isPickupInPoint) || []

	return (
		<View className='px-4'>
			<View className='rounded border border-gray-300 bg-white p-4 shadow-sm'>
				<Text className='text-base font-bold'>{t('freight.txtDelivery')}</Text>

				{cart?.canEditData || isEditingZipCode ? (
					<View className='mt-2 flex w-full items-center justify-between gap-2'>
						<View className='w-2/3'>
							<CustomInput
								placeholder={t('freight.labelZipCode')}
								value={zipCode}
								variant='mask'
								mask='99999-999'
								inputMode='numeric'
								onChange={onInputZipCode}
							/>
						</View>
						<View className='w-1/3'>
							<CustomButton
								variant='outlined'
								isLoading={isLoading}
								label={t('freight.txtCalculate')}
								onPress={onPressZipCodeChange}
							/>
						</View>
					</View>
				) : (
					<View className='mt-2 flex flex-row items-center gap-4'>
						<Text className='text-base font-medium'>{`Receber em ${shipping?.postalCode}`}</Text>

						<View onClick={onPressEditZipCode}>
							<Text className='text-sm font-bold text-primary'>alterar</Text>
						</View>
					</View>
				)}

				{shipping?.address && !shipping?.shippingAvailable && (
					<View className='mt-2 rounded border border-red-200 bg-red-50 p-2'>
						<Text className='text-sm font-medium text-red-600'>Entrega indisponível</Text>
					</View>
				)}

				{isLoading && <View className={`mt-4 h-[120px] w-full animate-pulse rounded bg-gray-200`} />}

				{!isLoading && shipping?.options?.length > 0 && (
					<>
						{deliveryOptions.length > 0 && (
							<View className='mt-4'>
								<Text className='mb-2 text-sm font-semibold text-neutral-700'>
									{t('freight.tabDelivery')}
								</Text>

								<View className='mt-2 flex flex-col items-center justify-between gap-2 rounded border border-neutral-300 p-4'>
									{deliveryOptions.map((item, index) => (
										<View
											key={index}
											className='flex w-full flex-row items-center'>
											{isUnavailable ? (
												getMessageError(item?.label)
											) : (
												<View
													className='flex w-full flex-row items-center'
													sendFocusToInput>
													<Radio
														className='radio-primary'
														checked={item.isCurrent}
														name='freight-option'
														value={item?.label}
														onChange={() => handleOptionSelect(item)}
													/>
													<View className='ml-3 flex w-full flex-1 flex-col'>
														<Text className='font-bold'>{item?.label}</Text>
														<Text className='text-xs text-neutral-500'>
															{item?.shippingEstimate}
														</Text>
													</View>
													<View className='flex items-center'>
														<Text className='font-semibold'>{item?.price}</Text>
													</View>
												</View>
											)}
										</View>
									))}
								</View>
							</View>
						)}

						{pickupOptions.length > 0 && (
							<View className='mt-4'>
								<Text className='mb-2 text-sm font-semibold text-neutral-700'>
									{t('freight.tabPickup') || 'Retirada'}
								</Text>
								<View className='flex flex-col items-center justify-between gap-2 rounded border border-neutral-300 p-4'>
									{pickupOptions.map((item, index) => (
										<View
											key={index}
											className='flex w-full flex-row items-center'>
											{isUnavailable ? (
												getMessageError(item?.label)
											) : (
												<>
													{isLoading ? (
														<View className='flex w-full items-center justify-center'>
															<Loading />
														</View>
													) : (
														<>
															<Radio
																className='radio-primary'
																checked={item.isCurrent}
																name='freight-option'
																value={item?.label}
																onChange={() => handleOptionSelect(item)}
															/>
															<View className='ml-3 flex w-full flex-1 flex-col'>
																<Text className='font-bold'>{item?.label}</Text>
																<Text className='text-xs text-neutral-500'>
																	{item?.shippingEstimate}
																</Text>
																{item.isPickupInPoint && (
																	<Text className='text-xs text-neutral-500'>
																		{item?.pickUpAddress}
																	</Text>
																)}
															</View>
															<View className='flex items-center'>
																<Text className='font-semibold'>{item?.price}</Text>
															</View>
														</>
													)}
												</>
											)}
										</View>
									))}
								</View>
							</View>
						)}
					</>
				)}
			</View>
		</View>
	)
}

import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'
import { Page, View } from 'eitri-luminus'

import { useRef, useState } from 'react'

import {
	HeaderContentWrapper,
	HeaderReturn,
	HeaderText,
	CustomButton,
	BottomInset,
	CustomInput,
} from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { trackScreenView } from '../services/Tracking'
import { resolvePostalCode } from '../services/freigthService'
import { navigate, requestLogin } from '../services/navigationService'
import LoadingComponent from '../components/Shared/Loading/LoadingComponent'
import FixedBottom from '../components/FixedBottom/FixedBottom'

function PostalCodeInput({ value, onChange, isLoading, t, error, touched, onBlur }) {
	return (
		<View className='flex w-full flex-col gap-1'>
			<View className='flex w-full items-end justify-between gap-2'>
				<CustomInput
					checkoutVariant
					label='CEP'
					inputMode='numeric'
					placeholder='00000-000'
					value={value}
					onChange={onChange}
					autoFocus={true}
					variant='mask'
					mask='99999-999'
					disabled={isLoading}
					error={touched ? error : ''}
					onBlur={onBlur}
				/>
			</View>
			{error && touched && <Text className='ml-1 text-xs text-red-500'>{error}</Text>}
		</View>
	)
}

function AddressFields({ address, handleAddressChange, t, touched, errors, onBlur }) {
	return (
		<>
			<View>
				<CustomInput
					checkoutVariant
					label='Endereço'
					placeholder='Endereço'
					value={address?.street || ''}
					onChange={(e) => handleAddressChange('street', e)}
					error={touched.street ? errors.street : ''}
					onBlur={() => onBlur('street')}
				/>
				{errors.street && touched.street && <Text className='text-xs text-red-500'>{errors.street}</Text>}
			</View>
			<View className='flex gap-4'>
				<View className='w-1/2'>
					<CustomInput
						checkoutVariant
						label={t('addNewShippingAddress.frmNumber')}
						placeholder={''}
						value={address?.number || ''}
						onChange={(e) => handleAddressChange('number', e)}
						error={touched.number ? errors.number : ''}
						onBlur={() => onBlur('number')}
					/>
					{errors.number && touched.number && <Text className='text-xs text-red-500'>{errors.number}</Text>}
				</View>
				<View className='w-1/2'>
					<CustomInput
						checkoutVariant
						label={t('addNewShippingAddress.frmComplement')}
						placeholder={'Opcional'}
						value={address?.complement || ''}
						onChange={(e) => handleAddressChange('complement', e)}
						onBlur={() => onBlur('complement')}
					/>
				</View>
			</View>
			<View>
				<CustomInput
					checkoutVariant
					label='Bairro'
					placeholder='Nome do Bairro'
					value={address.neighborhood || ''}
					onChange={(e) => handleAddressChange('neighborhood', e)}
					error={touched.neighborhood ? errors.neighborhood : ''}
					onBlur={() => onBlur('neighborhood')}
				/>
				{errors.neighborhood && touched.neighborhood && (
					<Text className='text-xs text-red-500'>{errors.neighborhood}</Text>
				)}
			</View>
			<View className='flex gap-4'>
				<View className='w-1/2'>
					<CustomInput
						checkoutVariant
						label={t('addNewShippingAddress.frmCity')}
						placeholder={''}
						value={address.city || ''}
						onChange={(e) => handleAddressChange('city', e)}
						error={touched.city ? errors.city : ''}
						onBlur={() => onBlur('city')}
					/>
					{errors.city && touched.city && <Text className='text-xs text-red-500'>{errors.city}</Text>}
				</View>
				<View className='w-1/2'>
					<CustomInput
						checkoutVariant
						label={t('addNewShippingAddress.frmState')}
						placeholder={''}
						value={address?.state || ''}
						onChange={(e) => handleAddressChange('state', e)}
						error={touched.state ? errors.state : ''}
						onBlur={() => onBlur('state')}
					/>
					{errors.state && touched.state && <Text className='text-xs text-red-500'>{errors.state}</Text>}
				</View>
			</View>
			<View>
				<CustomInput
					checkoutVariant
					placeholder='Nome Sobrenome'
					label={t('addNewShippingAddress.frmReceiveName')}
					value={address?.receiverName || ''}
					onChange={(text) => handleAddressChange('receiverName', text)}
					error={touched.receiverName ? errors.receiverName : ''}
					onBlur={() => onBlur('receiverName')}
				/>
				{errors.receiverName && touched.receiverName && (
					<Text className='text-xs text-red-500'>{errors.receiverName}</Text>
				)}
			</View>
		</>
	)
}

function validateAddress(address, t) {
	const postalCodeDigits = address.postalCode?.replace(/\D/g, '') || ''
	return {
		postalCode: !address.postalCode
			? 'CEP inválido'
			: postalCodeDigits.length !== 8
				? 'CEP inválido'
				: '',
		street: !address.street ? 'Endereço inválido' : '',
		neighborhood: !address.neighborhood ? 'Bairro inválido' : '',
		city: !address.city ? 'Cidade inválida' : '',
		state: !address.state ? 'Estado inválido' : '',
		receiverName: !address.receiverName ? 'Nome do recebedor inválido' : '',
		number: !address.number ? 'Número inválido' : '',
	}
}

export default function AddressForm(props) {
	const PAGE_NAME = 'Checkout - Cadastro de Endereço'

	const { cart, cartIsLoading, setLogisticInfo, startCart } = useLocalShoppingCart()
	const { t } = useTranslation()

	const [addressId, setAddressId] = useState(props.location?.state?.addressId)
	const [isLoading, setIsLoading] = useState(false)
	const [addressError, setAddressError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [address, setAddress] = useState({
		postalCode: '',
		street: '',
		neighborhood: '',
		city: '',
		state: '',
		country: 'BRA',
		geoCoordinates: [],
		number: '',
		complement: '',
		reference: '',
		addressQuery: '',
		addressType: 'residential',
		receiverName: cart?.clientProfileData?.firstName
			? `${cart?.clientProfileData?.firstName} ${cart?.clientProfileData?.lastName}`
			: '',
		isDisposable: false,
	})
	const [touched, setTouched] = useState({})

	useEffect(() => {
		trackScreenView(PAGE_NAME)
	}, [])

	useEffect(() => {
		if (addressId) {
			init(addressId)
		}
	}, [addressId])

	useEffect(() => {
		const postalCodeDigits = address?.postalCode?.replace(/\D/g, '') || ''

		if (postalCodeDigits.length === 8) {
			submitZipCode(address?.postalCode)
		}
	}, [address?.postalCode])

	const errors = useMemo(() => validateAddress(address, t), [address, t])

	const init = async (addressId) => {
		try {
			if (!cart.canEditData) {
				await requestLogin()
				const newCart = await startCart()
				const _address = newCart?.shippingData?.selectedAddresses?.find(
					(address) => address.addressId === addressId,
				)
				setAddress({
					...address,
					..._address,
				})
			} else {
				const _address = cart?.shippingData?.selectedAddresses?.find(
					(address) => address.addressId === addressId,
				)
				if (!_address && cart?.shippingData?.selectedAddresses?.[0]?.addressId) {
					setAddressId(cart.shippingData.selectedAddresses[0].addressId)
					return
				}
				setAddress({
					...address,
					..._address,
				})
			}
		} catch (e) {
			Eitri.navigation.back()
		}
	}

	const handleAddressChange = useCallback((key, e) => {
		const { value } = e.target
		setAddress((prev) => ({
			...prev,
			[key]: key === 'receiverName' ? value.replace(/[^a-zA-Z\s]/g, '') : value,
		}))
	}, [])

	const onChangePostalCodeInput = async (e) => {
		const { value } = e.target
		setAddress({ ...address, postalCode: value })
	}

	const submitZipCode = async (postalCode) => {
		try {
			if (!postalCode) return
			setIsLoading(true)
			const { street, neighborhood, city, state, country, geoCoordinates } = await resolvePostalCode(postalCode)
			setAddress({
				...address,
				street,
				neighborhood,
				city,
				state,
				country,
				geoCoordinates,
			})
			setIsLoading(false)
			// Foco no campo número após buscar o CEP
			setTimeout(() => {
				document.getElementById('numberField')?.focus()
			}, 100)
		} catch (e) {
			setIsLoading(false)
		}
	}

	const submit = async () => {
		if (isSubmitting) return
		setIsSubmitting(true)
		setAddressError('')
		try {
			if (addressId) {
				const newSelectedAddresses = cart?.shippingData?.selectedAddresses?.map((selectedAddress) => {
					if (selectedAddress.addressId === addressId) {
						return address
					}
					return selectedAddress
				})

				const payload = {
					logisticsInfo: cart?.shippingData?.logisticsInfo,
					clearAddressIfPostalCodeNotFound: false,
					selectedAddresses: newSelectedAddresses,
				}
				await setLogisticInfo(payload)
			} else {
				const payload = {
					address,
					clearAddressIfPostalCodeNotFound: false,
				}
				await setLogisticInfo(payload)
			}
			navigate('FreightResolver', {}, true)
		} catch (e) {
			if (e.response?.status === 400) {
				setAddressError(t('addNewShippingAddress.errorAddress'))
				console.error('Error on submit', e)
				return
			}
			setAddressError(t('addNewShippingAddress.errorDefault'))
			setTimeout(() => setAddressError(''), 8000)
		} finally {
			setIsSubmitting(false)
		}
	}

	const onBlur = (field) => {
		setTouched((prev) => ({ ...prev, [field]: true }))
	}

	const isValidAddress = useMemo(() => {
		return !Object.values(errors).some(Boolean)
	}, [errors])

	return (
		<Page
			title={PAGE_NAME}
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={t('addNewShippingAddress.title')} />
			</HeaderContentWrapper>

			<LoadingComponent
				fullScreen
				isLoading={cartIsLoading}
			/>

			<View className='mx-4 mb-4 mt-6 flex flex-col gap-2 rounded-[16px] border border-[#EFEDEA] bg-white px-[17px] py-4 shadow-sm'>
				<PostalCodeInput
					value={address?.postalCode}
					onChange={onChangePostalCodeInput}
					onSubmit={submitZipCode}
					isLoading={isLoading}
					t={t}
					error={errors.postalCode}
					touched={touched.postalCode}
					onBlur={() => onBlur('postalCode')}
				/>
				{isLoading && (
					<View>
						<Text>{t('addNewShippingAddress.loading') || 'Aguarde...'}</Text>
					</View>
				)}
				<AddressFields
					address={address}
					handleAddressChange={handleAddressChange}
					t={t}
					touched={touched}
					errors={errors}
					onBlur={onBlur}
				/>
			</View>

			{addressError && (
				<View className={'p-4'}>
					<View className='rounded border border-red-400 bg-red-100 px-4 py-3'>
						<Text className='font-medium text-red-700'>{addressError}</Text>
					</View>
				</View>
			)}

			<FixedBottom
				className='align-center flex flex-col gap-4'
				offSetHeight={77}>
				<CustomButton
					checkoutVariant
					width='100%'
					marginTop='large'
					label={
						isLoading
							? t('addNewShippingAddress.loading') || 'Aguarde...'
							: t('addNewShippingAddress.labelButton')
					}
					fontSize='medium'
					disabled={!isValidAddress || isLoading}
					onPress={() => {
						// Marca todos os campos como tocados ao tentar submeter
						setTouched({
							postalCode: true,
							street: true,
							neighborhood: true,
							city: true,
							state: true,
							receiverName: true,
							number: true,
						})
						submit()
					}}
					isLoading={isLoading}
				/>
			</FixedBottom>

			<BottomInset />
		</Page>
	)
}

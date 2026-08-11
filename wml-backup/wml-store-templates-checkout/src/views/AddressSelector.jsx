import { useTranslation } from 'eitri-i18n'
import { Page, Text, View } from 'eitri-luminus'

import { useEffect, useState } from 'react'

import { HeaderContentWrapper, HeaderReturn, HeaderText, BottomInset, Loading } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { trackScreenView } from '../services/Tracking'
import { navigate } from '../services/navigationService'
import FixedBottom from '../components/FixedBottom/FixedBottom'
import CardSelector from '../components/CardSelector/CardSelector'
import OtpLogin from '../components/OtpLogin/OtpLogin'

export default function AddressSelector(props) {
	const { cart, setShippingAddress } = useLocalShoppingCart()
	const { t } = useTranslation()

	const [isAddressLoading, setIsAddressLoading] = useState(false)

	const [modalLogin, setModalLogin] = useState(false)
	const [currentEditingAddress, setCurrentEditingAddress] = useState(null)

	const PAGE = 'Checkout - Seleção de Endereço'

	useEffect(() => {
		if (cart?.shippingData?.availableAddresses?.length > 0) {
			trackScreenView(PAGE)
		} else {
			handleAddNewAddress()
		}
	}, [])

	const handleAddressSelect = async (address) => {
		setIsAddressLoading(true)
		try {
			const currentAddress = cart?.shippingData?.address
			if (currentAddress?.addressId !== address?.addressId) {
				await setShippingAddress(address)
			}

			navigate('FreightSelector')
		} catch (error) {
			console.error('Error selecting address:', error)
		} finally {
			setIsAddressLoading(false)
		}
	}

	const handleAddNewAddress = () => {
		navigate('AddressForm', {}, true)
	}

	const getAddresses = () => {
		if (cart?.shippingData?.availableAddresses) {
			return cart.shippingData.availableAddresses
				.filter((a) => a.addressType === 'residential')
				.map((address) => {
					return {
						...address,
					}
				})
				.sort((a, b) => {
					return a.street > b.street ? 1 : -1
				})
		}
		return []
	}

	const handleEditAddress = (address) => {
		if (!cart.canEditData) {
			setModalLogin(true)
			setCurrentEditingAddress(address)
			return
		}
		navigate('AddressForm', { addressId: address.addressId })
	}

	const availableAddresses = getAddresses()

	return (
		<Page
			title={PAGE}
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={t('addNewShippingAddress.title')} />
			</HeaderContentWrapper>

			<Loading
				fullScreen
				isLoading={isAddressLoading}
			/>

			<View className='flex flex-1 flex-col p-4'>
				<View className={`w-full`}>
					<View className='mb-4 flex flex-col gap-1'>
						<Text className='text-lg font-bold text-base-content'>
							{t('addressSelector.subtitle', 'Selecione um endereço para entrega')}
						</Text>
					</View>

					{availableAddresses?.map((address) => (
						<CardSelector
							key={address.addressId}
							mainTitle={`${address.street}, ${address.number || ''} ${address.complement || ''}`}
							mainClickHandler={() => handleAddressSelect(address)}
							secondaryActionHandler={() => handleEditAddress(address)}
							secondaryActionTitle={'Editar'}>
							<Text className='text text-base-content/70'>
								{`${address.neighborhood} - ${address.city} - ${address.state}`}
							</Text>
							<Text className='text text-base-content/70'>{address.postalCode}</Text>
						</CardSelector>
					))}
				</View>
			</View>

			<FixedBottom
				className='align-center flex flex-col gap-4'
				offSetHeight={56}>
				<View onClick={handleAddNewAddress}>
					<Text className='block text-center font-bold text-primary'>
						{t('addressSelector.addNewAddress', 'Adicionar Novo Endereço')}
					</Text>
				</View>
			</FixedBottom>

			<OtpLogin
				open={modalLogin}
				onLogged={() => handleEditAddress(currentEditingAddress)}
				onClose={() => setModalLogin(false)}
			/>

			<BottomInset />
		</Page>
	)
}

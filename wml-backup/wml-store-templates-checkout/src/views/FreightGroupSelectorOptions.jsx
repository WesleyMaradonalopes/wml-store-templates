import { useTranslation } from 'eitri-i18n'
import { Page, Radio, Text, View } from 'eitri-luminus'
import Eitri from 'eitri-bifrost'

import { useState } from 'react'
import { FaChevronRight } from 'react-icons/fa'

import { HeaderContentWrapper, HeaderReturn, BottomInset } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { navigate } from '../services/navigationService'
import LoadingComponent from '../components/Shared/Loading/LoadingComponent'
import CardSelector from '../components/CardSelector/CardSelector'

export default function FreightGroupSelectorOptions(props) {
	const group = props?.location?.state?.group

	const { cart, setFreight } = useLocalShoppingCart()

	const [isLoading, setIsLoading] = useState(false)

	const { t } = useTranslation()

	const submit = async () => {
		navigate('PaymentData', {}, true)
	}

	const onSelectFreightOption = async (selectedSla, items) => {
		try {
			setIsLoading(true)
			const slas = items.map((item) => ({
				itemIndex: item.itemIndex,
				selectedSla: selectedSla.id,
				selectedDeliveryChannel: selectedSla.isPickupInPoint ? 'pickup-in-point' : 'delivery',
			}))

			const payload = {
				clearAddressIfPostalCodeNotFound: false,
				logisticsInfo: slas,
				selectedAddresses: cart.shippingData.selectedAddresses,
			}

			await setFreight(payload)

			Eitri.navigation.back()
		} catch (error) {
			console.error('Error on select freight option', error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Page
			title='Checkout - Frete e Entrega'
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
			</HeaderContentWrapper>

			<LoadingComponent
				fullScreen
				isLoading={isLoading}
			/>

			<View className='flex flex-1 flex-col gap-4 p-4'>
				<Text className='text-xl font-bold'>Escolha como quer receber esses produtos</Text>

				<View className='flex flex-row gap-4'>
					{group?.items?.map((product) => (
						<View key={product?.imageUrl || product?.itemId}>
							<Image
								src={product.imageUrl}
								className='h-12 w-12 rounded-full object-contain'
							/>
						</View>
					))}
				</View>
				<View className='flex flex-col'>
					{group?.slas?.map((sla) => {
						const label = sla.isPickupInPoint
							? `Retire na loja ${sla.pickupStoreInfo.friendlyName}`
							: `${sla.formatedShippingEstimate}`

						return (
							<CardSelector
								key={sla.id}
								mainTitle={label}
								mainClickHandler={() => onSelectFreightOption(sla, group.items)}
								secondaryActionTitle={sla.formatedShippingEstimate}>
								{/*<Text className='text text-base-content/70'>{`${option.address.street}, ${option.address.number} ${option.address.complement}`}</Text>*/}
								{/*<Text className='text text-base-content/70'>{`${option.address.neighborhood} - ${option.address.city} - ${option.address.state}`}</Text>*/}
								{/*<Text className='text text-base-content/70'>{`CEP: ${option.address.postalCode}`}</Text>*/}
								{/*<Text*/}
								{/*	className={`text text-base-content/70 font-bold ${option.price === 'Grátis' ? 'text-green-600' : ''}`}>*/}
								{/*	{option.price}*/}
								{/*</Text>*/}
							</CardSelector>
						)
					})}
				</View>
			</View>

			<BottomInset />
		</Page>
	)
}

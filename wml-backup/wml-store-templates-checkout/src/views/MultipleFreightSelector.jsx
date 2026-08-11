import { useTranslation } from 'eitri-i18n'
import { Page, Text, View } from 'eitri-luminus'

import { useState } from 'react'
import { FaChevronRight } from 'react-icons/fa'

import { productGroupShippingResolver, HeaderContentWrapper, HeaderReturn, HeaderText, CustomButton } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { navigate } from '../services/navigationService'
import FixedBottom from '../components/FixedBottom/FixedBottom'
import LoadingComponent from '../components/Shared/Loading/LoadingComponent'

function AddressSelectorCard({ sla }) {
	const formatAddress = (address) => {
		return `${address?.street}, ${address?.number || ''} ${address?.complement || ''} - ${address?.neighborhood}`
	}

	const label = sla.isPickupInPoint
		? `Retire na loja ${sla.pickupStoreInfo.friendlyName}`
		: `${sla.formatedShippingEstimate}`

	return (
		<View className='flex w-full flex-row items-start gap-3'>
			<View className='flex w-full flex-col gap-1'>
				<Text className='font-bold'>{label}</Text>

				{sla.isPickupInPoint && (
					<View className='flex w-fit items-center justify-center rounded-full bg-primary px-2 py-1'>
						<Text className='text-xs text-primary-content'>{sla?.formatedShippingEstimate}</Text>
					</View>
				)}

				<Text className='text text-neutral-500'>
					{sla?.pickupStoreInfo?.isPickupStore
						? formatAddress(sla.pickupStoreInfo.address)
						: formatAddress(sla.deliveryAddress)}
				</Text>

				<View className='flex items-center'>
					<Text className={`font-semibold ${sla.formattedTotalPrice === 'Grátis' ? 'text-green-600' : ''}`}>
						{sla?.formattedTotalPrice}
					</Text>
				</View>
			</View>
		</View>
	)
}

export default function MultipleFreightSelector(props) {
	const { cart, setFreight } = useLocalShoppingCart()

	const [isLoading, setIsLoading] = useState(false)

	const { t } = useTranslation()

	const submit = async () => {
		navigate('PaymentData', {}, true)
	}

	const shippingOptions = productGroupShippingResolver(cart)

	const getCurrentSla = (slas, currentSla) => {
		return slas.find((sla) => sla.id === currentSla)
	}

	// console.log('shippingOptions===>', shippingOptions)

	return (
		<Page
			title='Checkout - Frete e Entrega'
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={'Entrega'} />
			</HeaderContentWrapper>

			<LoadingComponent
				fullScreen
				isLoading={isLoading}
			/>

			<View className='mx-4 mb-4 mt-6 flex flex-1 flex-col'>
				<Text className='font-montserrat text-[16px] font-medium leading-[150%] text-[#0F0805]'>Como deseja receber seu produto?</Text>

				<View className='mt-6 flex flex-col gap-4'>
					{shippingOptions?.map((group, index) => (
						<View key={group?.id || index} className='flex w-full flex-col rounded-[16px] border border-[#EFEDEA] bg-white px-[17px] py-4 shadow-sm'>
							<View className='mb-3 flex flex-row items-center justify-between border-b border-[#ECE8E4] pb-1'>
								<Text className='text-[14px] font-semibold leading-[100%] text-[#0F0805]'>{`Pacote ${index + 1}`}</Text>
								<View className='mb-3 flex flex-row gap-4'>
									{group?.items?.slice(0, 4)?.map((product) => (
										<View
											key={product.imageUrl}
											className='h-10 w-10 overflow-hidden rounded-full border p-1'>
											<Image
												src={product.imageUrl}
												width='100%'
												height='100%'
												className='object-cover'
											/>
										</View>
									))}
								</View>
							</View>

							{getCurrentSla(group.slas, group.currentSla) ? (
								<AddressSelectorCard
									sla={getCurrentSla(group.slas, group.currentSla)}
									currentSla={group.currentSla}
								/>
							) : (
								<View
									onClick={() => navigate('FreightGroupSelectorOptions', { group })}
									className='flex flex-col'>
									<View className='mb-1 flex flex-row items-center justify-between gap-2'>
										<Text className='block text-lg font-bold'>
											{`Escolha como receber ${group?.items?.length === 1 ? 'seu produto' : 'seus produtos'}`}
										</Text>
										<FaChevronRight className='w-[24px] text-primary' />
									</View>
								</View>
							)}

							{getCurrentSla(group.slas, group.currentSla) && group.slas.length > 1 && (
								<>
									<View className='my-4 border-b border-[#ECE8E4]'></View>

									<View onClick={() => navigate('FreightGroupSelectorOptions', { group })}>
										<Text className='text-[12px] font-normal leading-[150%] underline text-[#0F0805]'>Ver mais opções</Text>
									</View>
								</>
							)}
						</View>
					))}
				</View>
			</View>

			<FixedBottom
				className='align-center flex flex-col gap-4'
				offSetHeight={120}>
				<CustomButton
					checkoutVariant
					disabled={!shippingOptions?.every((opt) => opt.currentSla)}
					label={t('addNewShippingAddress.labelButton')}
					onClick={submit}
				/>
				<View onClick={() => navigate('AddressSelector', {}, true)}>
					<Text className='block text-center text-[12px] font-normal leading-[150%] underline text-[#0F0805]'>{'Alterar endereço de entrega'}</Text>
				</View>
			</FixedBottom>
		</Page>
	)
}

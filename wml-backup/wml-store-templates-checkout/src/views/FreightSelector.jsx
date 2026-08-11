import { useTranslation } from 'eitri-i18n'
import { Page, Text, View } from 'eitri-luminus'

import { useState } from 'react'

import { cartShippingResolver, HeaderContentWrapper, HeaderReturn, HeaderText, CustomButton } from 'wml-store-templates-shared'

import { navigate } from '../services/navigationService'
import FixedBottom from '../components/FixedBottom/FixedBottom'
import LoadingComponent from '../components/Shared/Loading/LoadingComponent'
import { useLocalShoppingCart } from '../providers/LocalCart'

export default function FreightSelector(props) {
	const { cart, setFreight } = useLocalShoppingCart()

	const [isLoading, setIsLoading] = useState(false)

	const { t } = useTranslation()

	const submit = async () => {
		navigate('PaymentData', {}, true)
	}

	const onSelectFreightOption = async (freightOption) => {
		try {
			setIsLoading(true)
			const slas = freightOption.slas.map((sla) => ({
				itemIndex: sla.itemIndex,
				selectedSla: sla.id,
				selectedDeliveryChannel: sla.isPickupInPoint ? 'pickup-in-point' : 'delivery',
			}))

			const payload = {
				clearAddressIfPostalCodeNotFound: false,
				logisticsInfo: slas,
				selectedAddresses: cart.shippingData.selectedAddresses,
			}
			await setFreight(payload)
		} catch (error) {
			console.error('Error on select freight option', error)
		} finally {
			setIsLoading(false)
		}
	}

	const shippingOptions = cartShippingResolver(cart)
	const deliveryOptions = shippingOptions?.options?.filter((opt) => !opt.isPickupInPoint)
	const deliveryAddressTitle = `Envio para ${shippingOptions.address.street}, ${shippingOptions.address.number || ''}`

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

				<View className='mt-6 flex w-full flex-col gap-[10px] rounded-[16px] border border-[#EFEDEA] bg-white px-[17px] py-4 shadow-sm'>
					<View className='flex flex-row items-center gap-2'>
						<svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
							<path fillRule='evenodd' clipRule='evenodd' d='M10.5384 6.7215C10.9715 6.43167 11.4806 6.27697 12.0015 6.27697C12.6996 6.27777 13.369 6.55593 13.8627 7.05041C14.3564 7.54489 14.6341 8.21532 14.6349 8.91463C14.6349 9.43631 14.4805 9.94628 14.1911 10.38C13.9017 10.8138 13.4904 11.1519 13.0092 11.3515C12.528 11.5511 11.9985 11.6034 11.4877 11.5016C10.9768 11.3998 10.5076 11.1486 10.1393 10.7797C9.77102 10.4109 9.52024 9.94087 9.41862 9.42922C9.31701 8.91756 9.36914 8.38721 9.56846 7.90524C9.76778 7.42328 10.1053 7.01133 10.5384 6.7215ZM11.2134 10.0959C11.4466 10.252 11.7209 10.3354 12.0015 10.3354C12.3775 10.335 12.7381 10.1852 13.004 9.9188C13.2699 9.65245 13.4195 9.29131 13.4199 8.91463C13.4199 8.63363 13.3367 8.35894 13.1808 8.12531C13.025 7.89166 12.8035 7.70957 12.5443 7.60204C12.2851 7.4945 11.9999 7.46637 11.7247 7.52119C11.4495 7.57601 11.1968 7.71132 10.9984 7.91001C10.8 8.10871 10.665 8.36186 10.6102 8.63746C10.5555 8.91305 10.5836 9.19872 10.691 9.45833C10.7983 9.71794 10.9801 9.93982 11.2134 10.0959Z' fill='#0F0805'/>
							<path fillRule='evenodd' clipRule='evenodd' d='M17.555 3.24881C19.0701 4.71299 19.9479 6.71634 19.998 8.82447C20.0003 8.85447 20.0006 8.8846 19.9988 8.91464V8.97829C20.0011 9.0856 19.9966 9.15448 19.992 9.22325L19.9829 9.39732C19.9807 9.45945 19.9776 9.52082 19.9731 9.5822C19.9471 9.97388 19.8925 10.3631 19.8097 10.7468C18.6643 16.4753 12.6795 22.1954 12.4253 22.4363C12.3129 22.5429 12.164 22.6023 12.0092 22.6023C11.8545 22.6023 11.7056 22.5429 11.5932 22.4363C11.3579 22.2128 5.80202 16.9057 4.35708 11.3871C4.11899 10.6194 3.99861 9.82003 4.00001 9.01617C3.99979 6.90745 4.82949 4.88363 6.30918 3.38357C7.78887 1.8835 9.79927 1.02812 11.9045 1.00289C14.0097 0.977667 16.0399 1.78464 17.555 3.24881ZM18.7787 9.21985C18.7808 9.19461 18.7831 9.16738 18.7831 9.14044C18.7836 9.13107 18.7842 9.12173 18.7848 9.11242C18.7868 9.08032 18.7888 9.04847 18.7876 9.01617C18.7863 9.00256 18.7863 8.98887 18.7876 8.97526V8.92298C18.7745 7.94736 18.5517 6.98603 18.1345 6.10433C17.7173 5.22264 17.1155 4.44126 16.3699 3.81331C15.6243 3.18537 14.7525 2.72559 13.8137 2.46522C12.8749 2.20486 11.891 2.15003 10.9292 2.30444C9.96731 2.45886 9.04994 2.81892 8.2394 3.36013C7.42885 3.90133 6.74417 4.611 6.23188 5.44089C5.71959 6.27078 5.39171 7.20142 5.27054 8.16955C5.14937 9.13767 5.23775 10.1206 5.52967 11.0514C6.67125 15.4091 10.7012 19.7934 12.0153 21.1361C13.3884 19.7328 17.724 15.0144 18.6273 10.496C18.6989 10.1651 18.7459 9.82922 18.768 9.49127C18.7755 9.43899 18.7755 9.39352 18.7755 9.3473V9.26471C18.7761 9.25093 18.7774 9.23578 18.7787 9.21985Z' fill='#0F0805'/>
						</svg>
						<Text className='text-[14px] font-medium leading-[150%] text-[#0F0805]'>
							{deliveryAddressTitle}
						</Text>
					</View>
					{deliveryOptions.map((item, index) => (
						<View
							key={index}
							className={`flex w-full flex-row items-center rounded-[8px] border px-4 py-[7px] ${item.isCurrent ? 'border-[#1E120D]' : 'border-[#B0A69B]'}`}
							onClick={() => onSelectFreightOption(item)}>
							<View
								className='flex h-[20px] w-[20px] items-center justify-center rounded-full border'
								style={{ borderColor: item.isCurrent ? '#1E120D' : '#B0A69B' }}>
								{item.isCurrent && (
									<View
										className='rounded-full'
										style={{
											width: '12.5px',
											height: '12.5px',
											backgroundColor: '#1E120D',
										}}
									/>
								)}
							</View>
							<View className='ml-3 flex w-full flex-1 flex-col'>
								<Text className='font-montserrat text-[14px] font-semibold leading-[20px] text-[#0F0805]'>
									{`${item?.label} - ${item?.price}`}
								</Text>
								<Text className='mt-[4px] text-[12px] font-normal leading-[150%] text-[#0F0805]'>
									{item?.shippingEstimate}
								</Text>
							</View>
						</View>
					))}
				</View>
			</View>

			<FixedBottom wrapperClassName='border-t-0' className='align-center flex flex-col gap-[10px] px-4 py-[10px]'>
				<CustomButton
					checkoutVariant
					disabled={!deliveryOptions?.some((item) => item.isCurrent)}
					label={t('addNewShippingAddress.labelButton')}
					onClick={submit}
				/>
				<View
					onClick={() => navigate('AddressSelector', {}, true)}
					className='flex h-[49px] w-full items-center justify-center rounded-[8px] border border-[#0F0805] bg-white'>
					<Text className='text-[14px] font-semibold leading-[100%] text-[#0F0805]'>{'Alterar endereço de entrega'}</Text>
				</View>
			</FixedBottom>
		</Page>
	)
}

import { Page, Text, View } from 'eitri-luminus'

import { useEffect, useState } from 'react'

import { HeaderContentWrapper, HeaderReturn, HeaderText, BottomInset } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import PaymentMethods from '../components/Methods/PaymentMethods'
import { trackScreenView } from '../services/Tracking'
import LoadingComponent from '../components/Shared/Loading/LoadingComponent'

export default function PaymentData(props) {
	const { cart, selectPaymentOption } = useLocalShoppingCart()

	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		trackScreenView(`checkout_dados_pagamento`, 'checkout.paymentData')
	}, [])

	const handlePaymentOptionsChange = async (paymentMethod) => {
		try {
			setIsLoading(true)
			const payload = {
				payments: Array.isArray(paymentMethod) ? paymentMethod : [paymentMethod],
				giftCards: cart.paymentData.giftCards,
			}
			await selectPaymentOption(payload)
		} catch (error) {
			console.log('Erro ao selecionar método de pagamento', error)
		} finally {
			setIsLoading(false)
		}
	}

	if (!cart) {
		return
	}

	return (
		<Page
			title='Checkout - Dados de pagamento'
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={'Pagamento'} />
			</HeaderContentWrapper>

			<LoadingComponent
				fullScreen
				isLoading={isLoading}
			/>

			<View className='mx-4 mb-4 mt-6 flex flex-1 flex-col px-[17px] py-4'>
				<Text className='mb-6 font-montserrat text-[16px] font-medium leading-[150%] text-[#0F0805]'>Escolha como pagar</Text>
				<PaymentMethods onSelectPaymentMethod={handlePaymentOptionsChange} />
			</View>

			<BottomInset />
		</Page>
	)
}

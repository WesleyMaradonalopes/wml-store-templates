import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'
import { Page, Text, View } from 'eitri-luminus'

import { HeaderContentWrapper, HeaderReturn, HeaderText, CustomButton, BottomInset } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { trackScreenView } from '../services/Tracking'
import { goHome, openAccount } from '../services/navigationService'

export default function OrderCompleted(props) {
	const orderId = props.location?.state?.orderId
	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()

	useEffect(() => {
		requestAppReview()
		trackScreenView(`checkout_pedido_realizado`, 'checkout.orderCompleted')
	}, [])

	const requestAppReview = async () => {
		try {
			await Eitri.appStore.requestInAppReview()
			console.log('Solicitação de avaliação enviada com sucesso!')
		} catch (error) {
			console.error('Erro ao solicitar avaliação do app:', error)
		}
	}

	return (
		<Page className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={'Pedido concluído'} />
			</HeaderContentWrapper>

			<View className='p-4'>
				{/* Payment Confirmation Section */}
				<View className='rounded bg-white p-4'>
					<View className='mb-4 flex flex-col items-center justify-center gap-2'>
						<View className='flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
							<Text className='text-2xl'>✓</Text>
						</View>
						<Text className='text-center text-xl font-bold text-gray-800'>Pronto, compra feita!</Text>
					</View>

					<View className='flex flex-col items-center'>
						<Text className='text text-center text-gray-600'>
							Enviamos uma confirmação com os detalhes do seu pedido para seu email
						</Text>
					</View>

					<View className='mt-4 flex flex-col items-center'>
						<Text className='text-center text-sm text-gray-600'>Seu código de pedido é</Text>
						<Text className='text-center text-lg font-bold text-gray-800'>{orderId}</Text>
					</View>
				</View>

				<View className='mt-6 flex flex-col gap-4'>
					<CustomButton
						label='Ver meus pedidos'
						onClick={openAccount}
					/>
					<CustomButton
						outlined
						label='Voltar ao início'
						onClick={goHome}
					/>
				</View>

				<BottomInset />
			</View>
		</Page>
	)
}

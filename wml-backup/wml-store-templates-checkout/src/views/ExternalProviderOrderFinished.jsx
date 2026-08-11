import Eitri from 'eitri-bifrost'

import { useEffect } from 'react'

import { HeaderContentWrapper, CustomButton } from 'wml-store-templates-shared'

import { openAccount } from '../services/navigationService'
import { trackScreenView } from '../services/Tracking'
import { useLocalShoppingCart } from '../providers/LocalCart'

export default function ExternalProviderOrderFinished(props) {
	const PAGE = 'External Provider Order Finished'
	const { cart } = useLocalShoppingCart()

	useEffect(() => {
		trackScreenView(PAGE, 'ExternalProviderOrderFinished')
	}, [])

	return (
		<Page className='font-sans text-base text-primary'>
			<HeaderContentWrapper
				cartProps={{
					cart,
				}}
			/>
			<View className='mt-6 flex flex-col items-center p-4'>
				<View className='mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-green-100'>
					<View className='flex h-16 w-16 items-center justify-center rounded-full bg-green-500'>
						<Text className='text-3xl font-bold text-white'>✓</Text>
					</View>
				</View>

				<View className='rounded border border-gray-300 bg-white p-4 shadow-sm'>
					<View className='mb-6 flex flex-col items-center'>
						<Text className='mb-2 w-full text-center text-2xl font-bold text-gray-800'>
							Solicitação enviada!
						</Text>
						<Text className='text-center text-base leading-relaxed text-gray-600'>
							Acompanhe seu pedido em "Meus pedidos". Se houve algum problema no pagamento, é só clicar em
							"Tentar novamente"!
						</Text>
					</View>

					{/* Action Buttons */}
					<View className='flex flex-col gap-4'>
						<CustomButton
							label={'Ver meus pedidos'}
							onPress={openAccount}
							block
						/>
						<CustomButton
							outlined
							label={'Tentar novamente'}
							onPress={Eitri.navigation.back}
						/>
					</View>
				</View>
			</View>
		</Page>
	)
}

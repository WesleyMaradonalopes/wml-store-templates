import { useTranslation } from 'eitri-i18n'
import Eitri from 'eitri-bifrost'

import { HeaderContentWrapper, HeaderReturn, HeaderText, BottomInset, CustomButton } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { clearCart, startPayment } from '../services/cartService'
import { syncPendingGender } from '../services/CustomerService'
import Recaptcha from '../services/Recaptcha'
import UserData from '../components/FinishCart/UserData'
import SelectedPaymentData from '../components/FinishCart/SelectedPaymentData'
import DeliveryData from '../components/FinishCart/DeliveryData'
import CartSummary from '../components/CartSummary/CartSummary'
import { navigate } from '../services/navigationService'
import { trackAddPaymentInfo, trackScreenView, trackShippingInfo } from '../services/Tracking'
import LoadingComponent from '../components/Shared/Loading/LoadingComponent'
import OtpLogin from '../components/OtpLogin/OtpLogin'
import { ERROR_MAP } from '../utils/vtexErrorMap'
import FixedBottom from '../components/FixedBottom/FixedBottom'

let selectedShipping = null
let selectedPayment = null
export default function CheckoutReview() {
	const { cart, cardInfo, selectedPaymentData, cartIsLoading, removeCartItem } = useLocalShoppingCart()
	const { t } = useTranslation()

	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState({ state: false, message: '' })
	const [unavailableItems, setUnavailableItems] = useState([])
	const [showOtpLogin, setShowOtpLogin] = useState(false)
	const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')

	const recaptchaRef = useRef()

	useEffect(() => {
		Eitri.environment.getRemoteConfigs().then((rc) => {
			const recaptchaSiteKey = rc?.appConfigs?.checkout?.recaptchaKey
			if (recaptchaSiteKey) {
				setRecaptchaSiteKey(recaptchaSiteKey)
			}
		})
	}, [])

	useEffect(() => {
		trackScreenView(`checkout_finaliza_pedido`, 'checkout.finishCart')
	}, [])

	useEffect(() => {
		if (cart && cart?.items?.length > 0) {
			const unavailableItems = cart?.items?.filter((item) => item.availability !== 'available')
			if (unavailableItems.length > 0) {
				setUnavailableItems(unavailableItems)
			} else {
				setUnavailableItems([])
			}

			sendTrackingPayment(cart)
			sendTrackingShipping(cart)
		}
	}, [cart])

	const sendTrackingPayment = async (cart) => {
		try {
			const paymentId = cart.paymentData?.payments?.[0]?.paymentSystem
			const paymentType = cart.paymentData?.paymentSystems?.find((p) => p.stringId === paymentId)?.name
			if (paymentType && (!selectedPayment || selectedPayment !== paymentType)) {
				trackAddPaymentInfo(cart, paymentType)
				selectedPayment = paymentType
			}
		} catch (e) {
			console.error('Error on sendTrackingPayment', e)
		}
	}

	const sendTrackingShipping = async (cart) => {
		try {
			const shippingTier = cart?.shippingData?.logisticsInfo?.find((i) => i.selectedSla)?.selectedSla
			if (shippingTier && (!selectedShipping || selectedShipping !== shippingTier)) {
				trackShippingInfo(cart)
				selectedShipping = shippingTier
			}
		} catch (e) {
			console.error('Error on sendTrackingShipping', e)
		}
	}

	const runPaymentScript = async () => {
		try {
			setIsLoading(true)

			const captchaToken = await recaptchaRef?.current?.getRecaptchaToken()

			const payload = {
				fields: cardInfo,
				captchaToken: captchaToken,
				captchaSiteKey: recaptchaSiteKey,
				savePersonalData: true,
				optinNewsLetter: true,
			}

			const paymentResult = await startPayment(cart, payload)
			await syncPendingGender()

			if (paymentResult.status === 'completed') {
				clearCart()
				navigate('OrderCompleted', {
					orderId: paymentResult.orderId,
					orderValue: cart.value,
				})
				return
			}

			if (paymentResult?.paymentAuthorizationAppCollection?.[0]?.appName === 'vtex.pix-payment') {
				navigate('PixOrder', { paymentResult })
				return
			}

			navigate('ExternalProviderOrder', { paymentResult })
		} catch (error) {
			console.error('Error on runPaymentScript', error)
			await syncPendingGender()

			const errorCode = error.response?.data?.error?.code
			if (errorCode === 'CHK003' || errorCode === 'CHK0087' || errorCode === 'ORD062') {
				setShowOtpLogin(true)
				return
			}

			setError({
				state: true,
				message:
					ERROR_MAP[errorCode] || error.response?.data?.error?.message || 'Houve um erro ao fechar pedido',
			})

			setIsLoading(false)
			setTimeout(() => {
				setError({ state: false, message: '' })
			}, 5000)
		} finally {
			setIsLoading(false)
		}
	}

	const isReadyToPay = () => {
		return (
			unavailableItems.length === 0 &&
			cart?.items?.length > 0 &&
			cart?.shippingData?.address &&
			cart?.shippingData?.address?.number
		)
	}

	const removeUnavailableItem = async (uItem) => {
		try {
			setIsLoading(true)
			const index = cart.items.findIndex((item) => item.uniqueId === uItem.uniqueId)
			await removeCartItem(index)
			setIsLoading(false)
		} catch (e) {
			console.error('Error on removeUnavailableItem', e)
			setIsLoading(false)
		}
	}

	const handleLogged = async () => {
		setShowOtpLogin(false)
		runPaymentScript()
	}

	return (
		<Page
			title='Checkout - Home'
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={'Revise e confirme'} />
			</HeaderContentWrapper>

			<LoadingComponent
				text={'Estamos preparando a sua compra'}
				fullScreen
				isLoading={cartIsLoading || isLoading}
			/>

			<View className='mx-4 mb-4 mt-6'>
				<View className='mb-6'>
					<Text className='font-montserrat text-[16px] font-medium leading-[150%] text-[#0F0805]'>Revise e confirme</Text>
				</View>

				{/* Adiciona padding-bottom para não sobrepor o botão */}
				<>
					{unavailableItems.length > 0 && (
						<View className='mb-4 rounded border border-red-200 bg-red-50 p-4'>
							<Text className='text-sm font-medium text-red-600'>{t('finishCart.errorItems')}</Text>

							{unavailableItems.map((uItem) => (
								<View
									className='mt-2 flex items-center justify-between gap-2'
									key={uItem.uniqueId}>
									<View className='flex items-center gap-2'>
										<Image
											src={uItem.imageUrl}
											className='w-[60px] rounded'
										/>
										<Text className='text-sm font-medium'>{uItem.name}</Text>
									</View>
									<View onClick={() => removeUnavailableItem(uItem)}>
										<Text className='text-sm font-medium text-red-600'>Excluir</Text>
									</View>
								</View>
							))}
						</View>
					)}

					<View className='flex flex-col gap-4'>
						<CartSummary />

						{cart && <UserData />}

						{unavailableItems.length === 0 && (
							<>
								<DeliveryData />

								<SelectedPaymentData
									selectedPaymentData={selectedPaymentData}
									onPress={() => navigate('PaymentData', true)}
								/>
							</>
						)}
					</View>
				</>
			</View>

			{error.message && (
				<View className='fixed bottom-[90px] left-0 w-full'>
					<View className='rounded border border-red-200 bg-red-50 p-4'>
						<Text className='text-sm font-medium text-red-600'>
							{error.message || 'Houve um erro ao fechar o pedido'}
						</Text>
					</View>
					<BottomInset />
				</View>
			)}

			<FixedBottom wrapperClassName='border-t-0' className='px-4 py-[10px]'>
				<CustomButton
					checkoutVariant
					disabled={!isReadyToPay()}
					label={t('finishCart.labelButton')}
					onPress={runPaymentScript}
				/>
			</FixedBottom>

			<BottomInset />

			{recaptchaSiteKey && (
				<Recaptcha
					ref={recaptchaRef}
					siteKey={recaptchaSiteKey}
				/>
			)}

			<OtpLogin
				open={showOtpLogin}
				onClose={() => setShowOtpLogin(false)}
				onLogged={handleLogged}
			/>
		</Page>
	)
}

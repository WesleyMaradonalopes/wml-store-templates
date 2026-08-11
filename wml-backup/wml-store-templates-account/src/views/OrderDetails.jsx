import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import { Vtex } from 'eitri-shopping-vtex-shared'

import { HeaderContentWrapper, HeaderReturn, HeaderText, Loading, BottomInset } from 'wml-store-templates-shared'

import { formatDate, formatDateDaysMonthYear, formatPriceInCents } from '../utils/utils'
import OrderStatusBadge from '../components/OrderStatusBadge/OrderStatusBadge'
import ProtectedView from '../components/ProtectedView/ProtectedView'
import { getOrderById } from '../services/CustomerService'
import ImageCard from '../components/Image/ImageCard'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { sendScreenView } from '../services/TrackingService'
import { useLocalShoppingCart } from '../providers/LocalCart'

// Componente auxiliar para padronizar as seções de detalhes
const DetailSection = ({ title, children }) => (
	<View className='flex flex-col gap-1'>
		<Text className='text-sm font-semibold text-gray-800'>{title}</Text>
		<View>{children}</View>
	</View>
)

export default function OrderDetails(props) {
	const PAGE = 'Detalhes do pedido'

	const [order, setOrder] = useState(null)
	const [isLoading, setIsLoading] = useState(false)
	const [cancelConfirmation, setCancelConfirmation] = useState(false)
	const [cancelReason, setCancelReason] = useState('')

	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()

	useEffect(() => {
		const { order, orderId } = props?.history?.location?.state ?? {}

		if (order) {
			setOrder(order)
		} else if (orderId) {
			handleOrder(orderId)
		} else {
			Eitri.navigation.back()
			return
		}

		addonUserTappedActiveTabListener()
		sendScreenView(PAGE, 'OrderDetails')
	}, [])

	const handleOrder = async (id) => {
		setIsLoading(true)
		try {
			const orderData = await getOrderById(id)
			setOrder(orderData)
		} catch (error) {
			console.error('Erro ao pegar detalhes do pedido:', error)
			Eitri.navigation.back()
		} finally {
			setIsLoading(false)
		}
	}

	const cancelOrder = async () => {
		if (!cancelReason) return
		setIsLoading(true)
		try {
			await Vtex.customer.cancelOrder(order?.orderId, { reason: cancelReason })
			Eitri.navigation.back()
		} catch (e) {
			console.error('Erro ao cancelar pedido', e)
			setIsLoading(false) // Garante que o loading para em caso de erro
		}
	}

	const getFormattedPaymentSystem = (payment) => {
		if (!payment) return null

		// Boleto
		if (payment.paymentSystem === '6') {
			return (
				<View className='flex w-full items-center justify-between'>
					<Text className='text-sm text-gray-700'>{payment.paymentSystemName}</Text>
					{order?.status === 'payment-pending' && (
						<View
							className='cursor-pointer'
							onClick={() => Eitri.openBrowser({ url: payment.url })}>
							<Text className='text-sm font-bold text-blue-600 hover:underline'>
								{t('orderDetails.lbSeeBilling')}
							</Text>
						</View>
					)}
				</View>
			)
		}

		// Outros (Cartão, etc)
		return (
			<Text className='text-sm text-gray-700'>
				{`${payment.paymentSystemName} ${formatPriceInCents(payment.value)} (${payment.installments}x)`}
			</Text>
		)
	}

	const handleShippingEstimate = (shippingEstimate) => {
		return shippingEstimate?.replace(/[a-zA-Z]/g, '') ?? ''
	}

	if (isLoading) {
		return (
			<Page className='font-sans text-base text-primary'>
				<HeaderContentWrapper cartProps={{ cart }}>
					<HeaderReturn />
					<HeaderText text={t('orderDetails.title')} />
				</HeaderContentWrapper>
				<Loading fullScreen />
			</Page>
		)
	}

	if (!order) {
		return
	}

	return (
		<ProtectedView
			afterLoginRedirectTo={'OrderDetails'}
			redirectState={{ orderId: order?.orderId }}>
			<Page
				title={PAGE}
				className='font-sans text-base text-primary'>
				<HeaderContentWrapper cartProps={{ cart }}>
					<HeaderReturn />
					<HeaderText text={t('orderDetails.title')} />
				</HeaderContentWrapper>

				<View className='p-4'>
					<View className='rounded-lg border border-gray-200 bg-white shadow-sm'>
						{/* Bloco principal de informações */}
						<View className='flex flex-col gap-6 p-4'>
							<View className='flex flex-row items-start justify-between'>
								<View className='flex flex-col gap-1'>
									<Text className='text-xs font-semibold uppercase text-gray-500'>
										{t('orderDetails.lbOrder')}
									</Text>
									<Text className='text-sm font-medium text-gray-900'>{order?.orderId}</Text>
								</View>
								<OrderStatusBadge
									statusId={order?.status}
									statusDescription={order?.statusDescription}
								/>
							</View>

							<DetailSection title={t('orderDetails.lbOrderDate')}>
								<Text className='text-sm text-gray-700'>
									{formatDateDaysMonthYear(order?.creationDate)}
								</Text>
							</DetailSection>

							{order?.shippingData?.address && (
								<DetailSection title={t('orderDetails.lbAddress')}>
									<View className='flex flex-col'>
										<Text className='text-sm text-gray-700'>
											{`${order?.shippingData?.address?.street}, ${order?.shippingData?.address?.number}${
												order?.shippingData?.address?.complement
													? ` - ${order?.shippingData?.address?.complement}`
													: ''
											}`}
										</Text>
										<Text className='text-sm text-gray-700'>
											{`${order?.shippingData?.address?.neighborhood}, ${order?.shippingData?.address?.city} - ${order?.shippingData?.address?.state}, ${order?.shippingData?.address?.postalCode}`}
										</Text>
									</View>
								</DetailSection>
							)}

							<DetailSection title={t('orderDetails.lbPayment')}>
								{order?.paymentData?.transactions?.[0]?.payments?.map((payment, index) => (
									<View key={index}>{getFormattedPaymentSystem(payment)}</View>
								))}
							</DetailSection>

							<DetailSection title={t('orderDetails.lbDelivery')}>
								{order?.shippingData?.logisticsInfo?.[0]?.shippingEstimateDate ? (
									<Text className='text-sm text-gray-700'>{`${t('orderDetails.lbShippingUntil')} ${formatDate(
										order?.shippingData?.logisticsInfo?.[0]?.shippingEstimateDate,
									)}`}</Text>
								) : (
									<Text className='text-sm text-gray-700'>{`${t(
										'orderDetails.lbShippingDeadline',
									)} ${handleShippingEstimate(order?.shippingData?.logisticsInfo?.[0]?.shippingEstimate)} ${t(
										'orderDetails.lbShippingDeadlineInfo',
									)}`}</Text>
								)}
							</DetailSection>

							<DetailSection title={t('orderDetails.lbSumary')}>
								<View className='flex flex-col text-sm text-gray-700'>
									{order?.totals?.map(
										(total) =>
											total.value > 0 && (
												<View
													key={total.id}
													className='flex justify-between'>
													<Text>{total?.name}:</Text>
													<Text>{formatPriceInCents(total.value)}</Text>
												</View>
											),
									)}
									<View className='mt-2 flex justify-between border-t border-gray-200 pt-2'>
										<Text className='font-bold text-gray-900'>{`${t('orderDetails.lbTotal')}:`}</Text>
										<Text className='font-bold text-gray-900'>
											{formatPriceInCents(
												order?.totals
													?.map((item) => item.value)
													?.reduce((acc, curr) => acc + curr, 0) ?? 0,
											)}
										</Text>
									</View>
								</View>
							</DetailSection>

							{/* Seção de Cancelamento */}
							{order?.allowCancellation && (
								<View className='mt-2 flex w-full items-center justify-center border-t border-gray-200 pt-4'>
									{cancelConfirmation ? (
										<View className='w-full'>
											<Text className='mb-2 block text-sm font-bold text-gray-800'>
												{t('orderDetails.lbCancelReason')}
											</Text>
											<Dropdown
												value={cancelReason}
												placeholder={t('orderDetails.lbSelectCancelReason')}
												onChange={(value) => setCancelReason(value)}>
												{/* Adicione os Dropdown.Item aqui */}
											</Dropdown>
											<View className='mt-4 flex justify-between'>
												<View
													className='cursor-pointer'
													onClick={() => setCancelConfirmation(false)}>
													<Text className='text-sm font-bold text-gray-700 hover:underline'>
														{t('orderDetails.lbBack')}
													</Text>
												</View>
												<View
													className={`cursor-pointer ${!cancelReason && 'cursor-not-allowed opacity-50'}`}
													onClick={cancelOrder}>
													<Text
														className={`text-sm font-bold ${
															cancelReason
																? 'text-red-600 hover:underline'
																: 'text-gray-400'
														}`}>
														{t('orderDetails.lbContinueCancel')}
													</Text>
												</View>
											</View>
										</View>
									) : (
										<View
											className='cursor-pointer'
											onClick={() => setCancelConfirmation(true)}>
											<Text className='font-bold text-red-600 hover:underline'>
												{t('orderDetails.lbCancel')}
											</Text>
										</View>
									)}
								</View>
							)}
						</View>

						{/* Bloco da lista de produtos */}
						<View className='rounded-b-lg border-t border-gray-200 bg-white p-4'>
							{order?.items?.map((item) => (
								<View
									key={item.uniqueId}
									className='flex items-center gap-x-3'>
									<ImageCard
										imageUrl={item.imageUrl}
										className='h-16 w-16 rounded-md object-cover'
									/>
									<View className='flex flex-1 flex-col justify-center'>
										<Text className='mb-1 line-clamp-2 text-sm font-medium text-gray-800'>
											{item.name}
										</Text>
										<Text className='text-xs text-gray-600'>
											{`${item.quantity} un. • ${formatPriceInCents(item.price)}`}
										</Text>
									</View>
								</View>
							))}
						</View>
					</View>
				</View>

				<BottomInset />
			</Page>
		</ProtectedView>
	)
}

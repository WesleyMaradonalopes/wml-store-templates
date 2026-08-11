import Eitri from 'eitri-bifrost'

import { useState, useEffect } from 'react'

import { CustomButton } from 'wml-store-templates-shared'

import OrderStatusBadge from '../OrderStatusBadge/OrderStatusBadge'
import { formatDateDaysMonthYear, formatPriceInCents } from '../../utils/utils'
import { getOrderById } from '../../services/CustomerService'
import ImageCard from '../Image/ImageCard'
import { navigate, PAGES } from '../../services/NavigationService'

export default function OrderCard(props) {
	const { order, showOrderDetails } = props

	const [loadingDetails, setLoadingDetails] = useState(false)
	const [orderDetail, setOrderDetails] = useState(null)

	useEffect(() => {
		if (showOrderDetails) {
			loadDetails()
		}
	}, [order, showOrderDetails])

	const loadDetails = async () => {
		setLoadingDetails(true)
		try {
			const result = await getOrderById(order?.orderId)
			setOrderDetails(result)
		} catch (e) {
			console.error('Falha ao carregar detalhes do pedido:', e)
		} finally {
			setLoadingDetails(false)
		}
	}

	const openOrderDetails = () => {
		if (orderDetail) {
			navigate(PAGES.ORDER_DETAILS, { order: orderDetail })
		} else {
			navigate(PAGES.ORDER_DETAILS, { order: order.orderId })
		}
	}

	return (
		<View className='flex w-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm'>
			<View className='grid grid-cols-2 gap-x-4 gap-y-4 p-4'>
				<View className='flex flex-col'>
					<Text className='text-xs font-semibold uppercase text-gray-500'>Pedido</Text>
					<Text className='truncate text-sm font-medium text-gray-900'>{order?.orderId}</Text>
				</View>

				<View className='flex items-start justify-end'>
					<OrderStatusBadge
						statusId={order?.status}
						statusDescription={order?.statusDescription}
					/>
				</View>

				<View className='flex flex-col'>
					<Text className='text-xs font-semibold uppercase text-gray-500'>Data</Text>
					<Text className='text-sm text-gray-700'>{formatDateDaysMonthYear(order?.creationDate)}</Text>
				</View>

				<View className='flex flex-col text-right'>
					<Text className='text-xs font-semibold uppercase text-gray-500'>
						Total ({`${order?.totalItems} ${order?.totalItems > 1 ? 'itens' : 'item'}`})
					</Text>
					<Text className='text-sm font-bold text-gray-900'>{formatPriceInCents(order?.totalValue)}</Text>
				</View>
			</View>

			{showOrderDetails && (
				<View className='border-t border-gray-200 p-4'>
					{loadingDetails ? (
						<View className='flex items-center justify-center py-2'>
							<Text className='text-sm text-gray-500'>Carregando produtos...</Text>
						</View>
					) : (
						orderDetail && (
							<View className='flex flex-col gap-y-4'>
								{orderDetail?.items?.map((item) => (
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
												{`${item.quantity} un • ${formatPriceInCents(item.price)}`}
											</Text>
										</View>
									</View>
								))}
							</View>
						)
					)}
				</View>
			)}

			<View className='border-t border-gray-200 p-4'>
				<CustomButton
					width='100%'
					label={'Ver detalhes do pedido'}
					onPress={openOrderDetails}
				/>
			</View>
		</View>
	)
}

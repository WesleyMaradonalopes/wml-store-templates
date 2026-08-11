import { useTranslation } from 'eitri-i18n'
import { Image, Text, View } from 'eitri-luminus'

import { useState } from 'react'

import { Loading } from 'wml-store-templates-shared'

import removeItemIcon from '../../assets/images/trash-01.svg'
import { navigateToProduct } from '../../services/navigationService'
import { formatAmountInCents } from '../../utils/utils'
import ModalConfirm from '../ModalConfirm/ModalConfirm'
import Quantity from '../Quantity/Quantity'

export default function CartItem(props) {
	const { item, onChangeQuantityItem, message, handleRemoveCartItem } = props
	const { t } = useTranslation()

	const [showModalRemoveItem, setShowModalRemoveItem] = useState(false)
	const [modalRemoveItemText, setModalRemoveItemText] = useState('')
	const [loadingItemQuantity, setLoadingItemQuantity] = useState(false)

	const resizedImageUrl = item?.imageUrl?.replace(/\/(\d+)-\d+-\d+\//, '/$1-200-200/')

	const handleQuantityOfItemsCart = async (quantityToUpdate) => {
		try {
			setLoadingItemQuantity(true)
			await onChangeQuantityItem(item.quantity + quantityToUpdate)
			setLoadingItemQuantity(false)
		} catch {
			setLoadingItemQuantity(false)
		}
	}

	const handleRemoveCartItemIntention = () => {
		setModalRemoveItemText(`Deseja remover ${item.name} do carrinho?`)
		setShowModalRemoveItem(true)
	}

	const removeCartItem = () => {
		handleRemoveCartItem()
		setShowModalRemoveItem(false)
	}

	return (
		<View className='border-b border-[#ECE8E4] pt-3 pb-2'>
			<View className='flex gap-4'>
				<View
					onClick={() => navigateToProduct(item.productId)}
					className='flex-shrink-0'>
					<Image
						className='h-[82.365px] w-16 rounded-[8px] object-cover'
						src={resizedImageUrl}
					/>
				</View>

				<View className='min-w-0 flex-1'>
					{item.availability !== 'available' && (
						<View className='mb-2 rounded border border-red-200 bg-red-50 p-2'>
							<Text className='text-sm font-medium text-red-600'>
								{item.availability === 'cannotBeDelivered'
									? t('cartItem.cannotBeDelivered', 'Este item não pode ser entregue')
									: t('cartItem.notAvailable', 'Este item não está disponível')}
							</Text>
						</View>
					)}

					<View className='mb-2 flex items-start justify-between gap-2'>
						<View
							onClick={() => navigateToProduct(item.productId)}
							className='min-w-0 flex-1'>
							<Text className='pr-2 text-sm font-medium text-gray-900'>{item.name}</Text>
						</View>
						{!item.isGift && (
							<View
								onClick={handleRemoveCartItemIntention}
								className='mt-0.5 flex h-6 w-6 items-center justify-center'>
								<Image className='h-5 w-5' src={removeItemIcon} />
							</View>
						)}
					</View>

					{/* Preço */}
					<View className='mb-3'>
						<Text className='text-lg font-bold text-gray-900'>
							{formatAmountInCents(item?.priceDefinition?.total)}
						</Text>
					</View>

					{/* Seletor de Quantidade */}
					<View className='flex items-center justify-between gap-2'>
						<View className='flex items-center gap-2'>
							{!item.isGift && (loadingItemQuantity ? (
								<View className='flex h-[37px] w-[101px] items-center justify-center'>
									<Loading />
								</View>
							) : (
								<Quantity
									quantity={item.quantity}
									handleItemQuantity={handleQuantityOfItemsCart}
								/>
							))}
						</View>

						{/* Preço */}
						<Text className='font-sans text-[14px] font-semibold leading-[20px] tracking-normal text-[#0F0805]'>
							{formatAmountInCents(item.priceDefinition.total)}
						</Text>
					</View>
				</View>
			</View>

			{message && (
				<View className='flex flex-col items-center justify-center'>
					<View className={'h-[10px]'} />
					<Text className='text-tertiary-500 text-center'>
						{message.text || t('cartItem.txtMessageUnavailable')}
					</Text>
					<View className={'h-[10px]'} />
				</View>
			)}

			<ModalConfirm
				text={modalRemoveItemText}
				showModal={showModalRemoveItem}
				closeModal={() => setShowModalRemoveItem(false)}
				removeItem={removeCartItem}
			/>
		</View>
	)
}

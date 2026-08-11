import { useState, useEffect, useCallback } from 'react'
import { View, Text } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'
import CartItem from '../CartItem/CartItem'
import { useLocalShoppingCart } from '../../providers/LocalCart'
import { resolveCategoryItemCart } from '../../utils/utils'
import { logAppsFlyerEvent } from '../../services/trackingService'
import { Toast, CustomCheckbox } from 'wml-store-templates-shared'

export default function CartItemsContent(props) {
	const { cart, changeQuantity, removeItem, addItemOffer, removeItemOffer } = useLocalShoppingCart()
	const { t } = useTranslation()

	const [cartItems, setCartItems] = useState([])
	const [toastData, setToastData] = useState(null)

	useEffect(() => {
		if (cart) {
			setCartItems([...(cart?.items || [])])
		}
	}, [cart])

	const showErrorToast = message => {
		setToastData({
			id: Date.now(),
			message,
			type: 'error'
		})
	}

	const handleToastClose = useCallback(() => {
		setToastData(null)
	}, [])

	const hasMessage = itemEan => {
		const message = (cart?.messages || []).find(item => item.code === 'withoutStock' && item?.fields?.ean == itemEan)
		return message || null
	}

	const onChangeQuantityItem = async (quantity, index) => {
		const currentItem = cart?.items?.[index]

		try {
			const updatedCart = await changeQuantity(index, quantity)
			const updatedItem =
				updatedCart?.items?.find(item => item.uniqueId === currentItem?.uniqueId) || updatedCart?.items?.[index]
			const targetEans = [currentItem?.ean, updatedItem?.ean].filter(Boolean)
			const targetNames = [currentItem?.name, updatedItem?.name].filter(Boolean)
			const relevantItemMessage = updatedCart?.messages?.find(message => {
				const messageEan = String(message?.fields?.ean || '')
				const matchesByEan = targetEans.includes(messageEan)
				const matchesByName = targetNames.some(name => message?.text?.includes(name))

				return matchesByEan || matchesByName
			})
			const quantityWasNotApplied = updatedItem && updatedItem.quantity !== quantity
			const itemIsUnavailable = updatedItem?.availability && updatedItem.availability !== 'available'

			if (quantityWasNotApplied || itemIsUnavailable) {
				const fallbackMessage = itemIsUnavailable
					? 'Este item não está disponível no momento'
					: 'Não foi possível atualizar a quantidade deste item'

				showErrorToast(relevantItemMessage?.text || fallbackMessage)
			}

			const item = cart.items?.find(i => i.itemIndex == index)
			if (item) {
				logAppsFlyerEvent('af_add_to_cart', {
					af_currency: 'BRL',
					af_price: Number(item.price) ? Number(item.price) : '',
					af_content: item.ean || '',
					af_content_id: item.productId,
					af_content_type: resolveCategoryItemCart(item)?.item_category || '',
					af_quantity: quantity
				})
				// logInngageEvent('add_to_cart', {
				// 	currency: 'BRL',
				// 	id: item.productId || '',
				// 	item_name: item.name || '',
				// 	price: Number(item.price) ? Number(item.price)  : '',
				// 	item_category: resolveCategoryItemCart(item)?.item_category || '',
				// 	type: item.additionalInfo?.brandName || '',
				// })
			}
		} catch (e) {
			console.error(e, 'cart.CartItemsContent.onChangeQuantityItem')
		}
	}

	const handleRemoveCartItem = async index => {
		try {
			setCartItems([...cartItems.slice(0, index), ...cartItems.slice(index + 1)])
			await removeItem(index)
		} catch (error) {
			console.error('Cart: handleRemoveCartItem Error', error)
		}
	}

	const [giftWrappingTempState, setGiftWrappingTempState] = useState({})

	const getGiftWrappingOffering = (item) => {
		return item?.offerings?.find((o) => o.name?.includes('Embalagem')) || null
	}

	const itemHasGiftWrappingOption = (item) => {
		return !!getGiftWrappingOffering(item)
	}

	const itemHasGiftWrappingActive = (item) => {
		const offering = getGiftWrappingOffering(item)
		if (!offering) return false
		return item?.bundleItems?.some((b) => b.id === offering.id)
	}

	const isGiftWrappingChecked = (item) => {
		if (item.uniqueId in giftWrappingTempState) {
			return giftWrappingTempState[item.uniqueId]
		}
		return itemHasGiftWrappingActive(item)
	}

	const clearGiftWrappingTempState = (uniqueId) => {
		setGiftWrappingTempState(prev => {
			const next = { ...prev }
			delete next[uniqueId]
			return next
		})
	}

	const hasAnyGiftWrappingOption = cartItems?.some(itemHasGiftWrappingOption) || false
	const allGiftWrappingChecked = hasAnyGiftWrappingOption &&
		cartItems.filter(itemHasGiftWrappingOption).every(isGiftWrappingChecked)

	const handleGlobalGiftWrappingToggle = async (isChecked) => {
		const giftWrappableItems = cartItems
			.map((item, index) => ({ item, index, offering: getGiftWrappingOffering(item) }))
			.filter(({ offering }) => !!offering)

		if (!giftWrappableItems.length) return

		setGiftWrappingTempState(prev => {
			const next = { ...prev }
			giftWrappableItems.forEach(({ item }) => {
				next[item.uniqueId] = isChecked
			})
			return next
		})

		try {
			await Promise.all(
				giftWrappableItems.map(({ index, offering }) => (
					isChecked ? addItemOffer(index, offering.id) : removeItemOffer(index, offering.id)
				))
			)
			setGiftWrappingTempState(prev => {
				const next = { ...prev }
				giftWrappableItems.forEach(({ item }) => {
					delete next[item.uniqueId]
				})
				return next
			})
		} catch {
			setGiftWrappingTempState(prev => {
				const next = { ...prev }
				giftWrappableItems.forEach(({ item }) => {
					delete next[item.uniqueId]
				})
				return next
			})
			showErrorToast('Erro ao adicionar embalagem')
		}
	}

	const packagingItemsCount = cartItems?.filter(isGiftWrappingChecked)?.length || 0
	const showPackagingMessage = packagingItemsCount >= 2

	return (
		<>
			<View className='flex flex-col px-4 gap-4'>
				<View className='overflow-hidden rounded-[16px] border border-[#EFEDEA] bg-white p-4 shadow-sm'>
					{cartItems?.map((item, index) => (
						<CartItem
							key={item.uniqueId}
							item={item}
							onChangeQuantityItem={newQuantity => onChangeQuantityItem(newQuantity, index)}
							message={hasMessage(item.ean)}
							handleRemoveCartItem={() => handleRemoveCartItem(index)}
						/>
					))}

					{hasAnyGiftWrappingOption && (
						<View className='border-t border-[#ECE8E4] pt-4'>
							<View
								onClick={() => handleGlobalGiftWrappingToggle(!allGiftWrappingChecked)}
								className='flex items-center gap-2'>
								<CustomCheckbox
									checked={allGiftWrappingChecked}
									onChange={handleGlobalGiftWrappingToggle}
									color='#A49A8E'
									align='center'
								/>
								<Text className='font-montserrat text-[12px] font-normal leading-[14px] text-[#575756]'>
									{t('cartItem.isGift', 'Incluir uma embalagem de presente para o pedido')}
								</Text>
							</View>
						</View>
					)}
				</View>

				{showPackagingMessage && (
					<View className='rounded border border-yellow-300 bg-yellow-50 p-4'>
						<Text className='text-sm text-yellow-800'>
							{t(
								'cartItems.giftMessage',
								'Todos os itens selecionados como presente serão entregues em uma única embalagem. Caso precise de mais unidades, entre em contato com o nosso SAC.'
							)}
						</Text>
					</View>
				)}
				</View>

			<Toast
				toastData={{
					triggerId: toastData?.id,
					id: toastData?.id,
					message: toastData?.message,
					type: toastData?.type
				}}
				onClose={handleToastClose}
			/>
		</>
	)
}

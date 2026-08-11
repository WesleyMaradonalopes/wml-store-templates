import { useTranslation } from 'eitri-i18n'
import { View } from 'eitri-luminus'

import { useState, useEffect } from 'react'

import { CustomButton, isSkuAvailable } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../providers/LocalCart'

export default function AddToCart(props) {
	const { addItem, cart, updateItemQuantity } = useLocalShoppingCart()
	const { t } = useTranslation()
	const {
		currentSku,
		kitState,
		requiredVariationNames = [],
		isSkuSelectionComplete = true,
		onCartFeedback = () => {}
	} = props
	const [isAvailable, setIsAvailable] = useState(true)
	const [isLoading, setLoading] = useState(false)

	const isCheckingKit = kitState?.isLoading ?? true
	const isKit = kitState?.hasKit ?? false
	const selectedKitItemsCount = kitState?.selectedItems?.length ?? 0
	const selectedKitProductsCount = kitState?.selectedProductCount ?? 0
	const kitReady = isKit && selectedKitProductsCount > 0 && selectedKitItemsCount === selectedKitProductsCount
	const requiresOnlySize =
		requiredVariationNames.length === 1 && requiredVariationNames[0]?.toLowerCase() === 'tamanho'
	const isSelectionPending = !isKit && !isSkuSelectionComplete

	useEffect(() => {
		setIsAvailable(isSkuAvailable(currentSku))
	}, [currentSku])

	const getButtonLabel = () => {
		if (isCheckingKit) return 'Carregando'
		if (isKit && !kitReady) return 'Adicionar à sacola'
		if (isSelectionPending) return requiresOnlySize ? 'Adicionar à sacola' : 'Adicionar à sacola'
		if (!isKit && !isAvailable) return t('product.errorNoProduct')
		return t('product.labelAddToCart')
	}

	const getCartItemIndex = (sku = currentSku) => {
		return cart?.items?.findIndex((cartItem) => String(cartItem?.id) === String(sku?.itemId)) ?? -1
	}

	const addOrIncrement = async (sku, quantity = 1) => {
		const cartItemIndex = getCartItemIndex(sku)
		if (cartItemIndex > -1) {
			const cartItem = cart?.items?.[cartItemIndex]
			return updateItemQuantity(cartItemIndex, (cartItem?.quantity || 0) + quantity)
		}
		return addItem({ ...sku, quantity })
	}

	const handleButtonClick = async () => {
		if (isBlocked) return

		setLoading(true)
		try {
			let updatedCart = null

			if (isKit) {
				for (const kitItem of kitState.selectedItems) {
					updatedCart = await addOrIncrement(kitItem, kitItem.quantity ?? 1)
				}
			} else {
				updatedCart = await addOrIncrement(currentSku, 1)
			}

			if (!updatedCart) {
				onCartFeedback('Nao foi possivel adicionar à sacola', 'error')
				return
			}

			onCartFeedback('Adicionado à sacola com sucesso!')
		} catch (e) {
			console.error('Error adding to cart:', e)
			onCartFeedback('Nao foi possivel adicionar à sacola', 'error')
		} finally {
			setLoading(false)
		}
	}

	const isBlocked =
	isLoading ||
	isCheckingKit ||
	(isKit ? !kitReady : isSelectionPending || !isAvailable)
	const shouldDimButton = !isLoading && isBlocked

	return (
		<View
			id='pdp-main-add-to-cart'
			className=''>
			<CustomButton
				onClick={handleButtonClick}
				isLoading={isLoading}
				disabled={isBlocked}
				className={`rounded-pill w-full transition-all duration-300 ${
					shouldDimButton ? 'opacity-40' : 'opacity-100'
				}`}
				leftIcon={
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path fill-rule="evenodd" clip-rule="evenodd" d="M11.5 1C12.597 1 13.528 1.39185 14.2918 2.17631C15.0558 2.96077 15.4374 3.91687 15.4374 5.04324V5.82703H19.3748V22H3.62512V5.82703H7.56254V5.04324C7.56254 3.91685 7.94411 2.96078 8.70809 2.17631C9.47207 1.39185 10.403 1 11.5 1ZM4.44829 6.67235V21.1547H18.5516V6.67235H4.44829ZM11.5 1.84532C10.6186 1.84532 9.87888 2.15117 9.28148 2.76446C8.684 3.37796 8.38571 4.13809 8.38571 5.04324V5.82703H14.6142V5.04324C14.6142 4.13809 14.3159 3.37796 13.7185 2.76446C13.1211 2.15115 12.3813 1.84532 11.5 1.84532Z" fill="#ECE8E4"/>
				</svg>
				}
				label={getButtonLabel()}
			/>
		</View>
	)
}

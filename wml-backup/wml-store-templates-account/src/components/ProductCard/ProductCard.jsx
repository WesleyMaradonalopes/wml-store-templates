import { useTranslation } from 'eitri-i18n'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { App, EventBus } from 'eitri-shopping-vtex-shared'

import { ProductCardFullImage, ProductCardDefault } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../providers/LocalCart'
import { openCart, openProduct } from '../../services/NavigationService'
import { getProductReleaseDateById } from '../../services/ProductService'
import { addToWishlist, productOnWishlist, removeItemFromWishlist } from '../../services/CustomerService'
import { formatPrice } from '../../utils/utils'
import QuickAddToCartModal from './QuickAddToCartModal'

const NEW_RELEASE_WINDOW_MS = 10368000000

// ========== Hooks Customizados ==========

/**
 * Hook para gerenciar o estado do produto no carrinho
 */
const useCartItem = (cart, itemId) => {
	return useMemo(() => {
		if (!cart?.items || !itemId) return null

		const index = cart.items.findIndex((cartItem) => cartItem.id === itemId)
		if (index === -1) return null

		return { ...cart.items[index], index }
	}, [cart?.items, itemId])
}

/**
 * Hook para gerenciar wishlist
 */
const useWishlist = (productId) => {
	const [isOnWishlist, setIsOnWishlist] = useState(false)
	const [wishListId, setWishListId] = useState(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!productId) {
			setLoading(false)
			return
		}

		const checkWishlist = async () => {
			try {
				const { inList, listId } = await productOnWishlist(productId)
				setIsOnWishlist(inList)
				if (inList) setWishListId(listId)
			} catch (error) {
				console.error('Error checking wishlist:', error)
			} finally {
				setLoading(false)
			}
		}

		checkWishlist()
	}, [productId])

	const addToList = useCallback(
		async (itemName, itemId) => {
			if (!productId) return

			try {
				setLoading(true)
				setIsOnWishlist(true)
				const response = await addToWishlist(productId, itemName, itemId)
				setWishListId(response?.data?.addToList)
			} catch (error) {
				console.error('Error adding to wishlist:', error)
				setIsOnWishlist(false)
			} finally {
				setLoading(false)
			}
		},
		[productId],
	)

	const removeFromList = useCallback(async () => {
		if (!wishListId) return

		try {
			setLoading(true)
			setIsOnWishlist(false)
			await removeItemFromWishlist(wishListId)
		} catch (error) {
			console.error('Error removing from wishlist:', error)
			setIsOnWishlist(true)
		} finally {
			setLoading(false)
		}
	}, [wishListId])

	const toggle = useCallback(
		async (itemName, itemId) => {
			if (loading) return

			if (isOnWishlist) {
				await removeFromList()
			} else {
				await addToList(itemName, itemId)
			}
		},
		[loading, isOnWishlist, removeFromList, addToList],
	)

	return { isOnWishlist, loading, wishListId, setIsOnWishlist, toggle, setWishListId }
}

// ========== Funções Auxiliares ==========

/**
 * Extrai o vídeo do produto baseado na config
 */
const getProductVideo = (product) => {
	const videoTag = App?.configs?.appConfigs?.productCard?.productVideoTag
	if (!videoTag) return ''

	const property = product?.properties?.find((prop) => prop.name === videoTag)
	return property?.values?.[0] || ''
}

/**
 * Formata as parcelas do produto
 */
const formatInstallments = (seller) => {
	if (!seller?.commertialOffer?.Installments?.length) return ''

	const installments = seller.commertialOffer.Installments
	const maxInstallments = installments.reduce(
		(max, curr) => (curr.NumberOfInstallments > max.NumberOfInstallments ? curr : max),
		installments[0],
	)

	if (!maxInstallments || maxInstallments.NumberOfInstallments === 1) {
		return ''
	}

	return `em até ${maxInstallments.NumberOfInstallments}x ${formatPrice(maxInstallments.Value)}`
}

/**
 * Calcula o badge de desconto
 */
const calculateBadge = (seller) => {
	if (!seller?.commertialOffer) return ''

	const { Price, ListPrice } = seller.commertialOffer

	if (Price === ListPrice || !ListPrice) return ''

	const discount = ((ListPrice - Price) / ListPrice) * 100
	return `${discount.toFixed(0)}% OFF`
}

/**
 * Retorna o preço de lista formatado (se diferente do preço atual)
 */
const getFormattedListPrice = (seller) => {
	if (!seller?.commertialOffer) return ''

	const { Price, ListPrice } = seller.commertialOffer

	if (Price === ListPrice) return ''

	return formatPrice(ListPrice)
}

// ========== Componente Principal ==========
const isProductKitByVariation = (product) => {
	return product?.items?.some((item) =>
		item?.variations?.some((variation) => {
			const normalizedVariation = typeof variation === 'string' ? { name: variation, values: item?.[variation] } : variation

			return normalizedVariation?.name === 'Tamanho' && normalizedVariation?.values?.[0] === 'TU'
		}),
	)
}

export default function ProductCard({ product, className }) {
	const { t } = useTranslation()
	const { addItem, removeItem, updateItemQuantity, cart } = useLocalShoppingCart()

	const [loadingCartOp, setLoadingCartOp] = useState(false)
	const [showQuickAddModal, setShowQuickAddModal] = useState(false)
	const [currentSku, setCurrentSku] = useState(null)
	const [isNewProduct, setIsNewProduct] = useState(false)
	// Extrai dados do produto
	const item = useMemo(() => product?.items?.[0], [product])
	const isProductKit = useMemo(() => isProductKitByVariation(product), [product])
	const hasAvailableSku = useMemo(() => {
		if (!product?.items?.length) return false

		return product.items.some((skuItem) =>
			skuItem.sellers?.some((seller) => seller.commertialOffer?.AvailableQuantity > 0),
		)
	}, [product])

	const sellerDefault = useMemo(() => {
		if (!item?.sellers?.length) return null
		return item.sellers.find((seller) => seller.sellerDefault) || item.sellers[0]
	}, [item])

	useEffect(() => {
		if (!product?.items?.length) return

		const availableSku =
			product.items.find((skuItem) =>
				skuItem.sellers?.some((seller) => seller.commertialOffer?.AvailableQuantity > 0),
			) || product.items[0]

		setCurrentSku(availableSku)
	}, [product])

	useEffect(() => {
		let isMounted = true

		const resolveNewProduct = async () => {
			if (!product?.productId) {
				if (isMounted) setIsNewProduct(false)
				return
			}

			let releaseDate = product?.releaseDate

			if (!releaseDate) {
				try {
					releaseDate = await getProductReleaseDateById(product.productId)
				} catch (error) {
					console.error('Error fetching product releaseDate:', error)
					if (isMounted) setIsNewProduct(false)
					return
				}
			}

			if (!releaseDate) {
				if (isMounted) setIsNewProduct(false)
				return
			}

			const releaseDateTimestamp = new Date(releaseDate).getTime()
			if (Number.isNaN(releaseDateTimestamp)) {
				if (isMounted) setIsNewProduct(false)
				return
			}

			if (isMounted) {
				setIsNewProduct(Date.now() - releaseDateTimestamp < NEW_RELEASE_WINDOW_MS)
			}
		}

		resolveNewProduct()

		return () => {
			isMounted = false
		}
	}, [product?.productId, product?.releaseDate])

	// Verifica se o produto tem dados mínimos para renderização
	const isValidProduct = Boolean(item)
	const isUnavailable = !hasAvailableSku

	const itemInCart = useCartItem(cart, item?.itemId)

	const cartQuantity = useMemo(() => {
		if (!cart?.items?.length || !product?.items?.length) return 0

		const productItemIds = new Set(product.items.map((skuItem) => String(skuItem.itemId)))

		return cart.items.reduce((acc, cartItem) => {
			if (!productItemIds.has(String(cartItem?.id))) return acc
			return acc + (cartItem?.quantity || 0)
		}, 0)
	}, [cart, product])

	// Gerencia wishlist
	const wishlist = useWishlist(product?.productId)

	// Valores derivados e formatados
	const productData = useMemo(() => {
		if (!isValidProduct) return null

		return {
			name: product.productName,
			image: item.images?.[0]?.imageUrl || '',
			video: getProductVideo(product),
			badge: calculateBadge(sellerDefault),
			listPrice: getFormattedListPrice(sellerDefault),
			price: sellerDefault?.commertialOffer?.Price ? formatPrice(sellerDefault.commertialOffer.Price) : '',
			installments: formatInstallments(sellerDefault),
		}
	}, [product, item, sellerDefault, isValidProduct])

	const wishlistIdRef = useRef()

	useEffect(() => {
		wishlistIdRef.current = wishlist.wishListId
	}, [wishlist.wishListId])

	useEffect(() => {
		EventBus.subscribe({
			channel: 'addToWishlist',
			broadcast: true,
			callback: (data) => {
				if (data?.productId === product.productId) {
					wishlist.setIsOnWishlist(true)
					wishlist.setWishListId(data?.response?.data?.addToList)
				}
			},
		})
		EventBus.subscribe({
			channel: 'removeFromWishlist',
			broadcast: true,
			callback: (data) => {
				if (data?.id === wishlistIdRef.current && data?.response?.data?.removeFromList) {
					wishlist.setIsOnWishlist(false)
					wishlist.setWishListId(-1)
				}
			},
		})
	}, [])

	// Gerencia item no carrinho
	const itemQuantity = itemInCart?.quantity || 1

	// ========== Ações do Carrinho ==========

	const handleAddToCart = useCallback(async () => {
		if (!item || loadingCartOp || isUnavailable) return

		try {
			setLoadingCartOp(true)

			const cartItemIndex = cart?.items?.findIndex(
				(cartItem) => String(cartItem?.id) === String(item?.itemId),
			) ?? -1
			const cartItem = cart?.items?.[cartItemIndex]

			if (cartItemIndex > -1) {
				await updateItemQuantity(cartItemIndex, (cartItem?.quantity || 0) + itemQuantity)
			} else {
				await addItem({ ...item, quantity: itemQuantity })
			}
		} catch (error) {
			console.error('Error adding to cart:', error)
		} finally {
			setLoadingCartOp(false)
		}
	}, [item, itemQuantity, loadingCartOp, isUnavailable, addItem, updateItemQuantity, cart])

	const handleQuickAddToCart = useCallback(async () => {
		if (!currentSku || loadingCartOp || isUnavailable) return

		try {
			setLoadingCartOp(true)

			const cartItemIndex = cart?.items?.findIndex(
				(cartItem) => String(cartItem?.id) === String(currentSku?.itemId),
			) ?? -1
			const cartItem = cart?.items?.[cartItemIndex]

			if (cartItemIndex > -1) {
				await updateItemQuantity(cartItemIndex, (cartItem?.quantity || 0) + itemQuantity)
			} else {
				await addItem({ ...currentSku, quantity: itemQuantity })
			}

			setShowQuickAddModal(false)
		} catch (error) {
			console.error('Error adding to cart from quick add:', error)
		} finally {
			setLoadingCartOp(false)
		}
	}, [currentSku, itemQuantity, loadingCartOp, isUnavailable, addItem, updateItemQuantity, cart])

	const handleRemoveFromCart = useCallback(async () => {
		if (!itemInCart || loadingCartOp) return

		try {
			setLoadingCartOp(true)
			await removeItem(itemInCart.index)
		} catch (error) {
			console.error('Error removing from cart:', error)
		} finally {
			setLoadingCartOp(false)
		}
	}, [itemInCart, loadingCartOp, removeItem])

	const handleQuantityChange = useCallback(
		async (newQuantity) => {
			if (loadingCartOp) return

			if (newQuantity === 0) {
				return handleRemoveFromCart()
			}

			if (!itemInCart) return

			try {
				setLoadingCartOp(true)
				await updateItemQuantity(itemInCart.index, newQuantity)
			} catch (error) {
				console.error('Error updating quantity:', error)
			} finally {
				setLoadingCartOp(false)
			}
		},
		[itemInCart, loadingCartOp, updateItemQuantity, handleRemoveFromCart],
	)

	// ========== Ações de Navegação ==========

	const handleCardPress = useCallback(() => {
		openProduct(product)
	}, [product])

	const handleWishlistPress = useCallback(() => {
		wishlist.toggle(item?.name, item?.itemId)
	}, [wishlist, item])

	const handleCartButtonPress = useCallback(
		(event) => {
			event.stopPropagation()
			if (loadingCartOp) return

			if (isUnavailable) return

			const buyGoesToPDP = App?.configs?.appConfigs?.productCard?.buyGoesToPDP
			if (buyGoesToPDP || isProductKit) {
				openProduct(product)
				return
			}

			setShowQuickAddModal(true)
		},
		[loadingCartOp, isUnavailable, product, isProductKit],
	)

	const handleQuickSkuChange = useCallback(
		(newDesiredVariations) => {
			if (!product?.items?.length) return

			const productSku = product.items.find((skuItem) => {
				return skuItem.variations?.every((variation) => {
					const normalizedVariation =
						typeof variation === 'string' ? { name: variation, values: skuItem[variation] } : variation
					return newDesiredVariations.some(
						(newDesiredVariation) =>
							normalizedVariation?.name === newDesiredVariation.variation &&
							normalizedVariation?.values?.[0] === newDesiredVariation.value,
					)
				})
			})

			if (productSku) {
				setCurrentSku(productSku)
			}
		},
		[product],
	)

	// ========== Renderização ==========

	// Retorna null se o produto for inválido
	if (!isValidProduct || !productData) {
		return null
	}

	// Monta os parâmetros para o componente de apresentação
	const params = {
		isNewProduct,
		name: productData.name,
		image: productData.image,
		video: productData.video,
		badge: productData.badge,
		listPrice: productData.listPrice,
		showListItem: App?.configs?.appConfigs?.productCard?.showListPrice ?? true,
		price: productData.price,
		installments: productData.installments,
		disableCartAction: isUnavailable && !itemInCart,
		isUnavailable,
		isInCart: Boolean(itemInCart),
		isOnWishlist: wishlist.isOnWishlist,
		loadingWishlistOp: wishlist.loading,
		loadingCartOp,
		hideCartAction: isProductKit,
		itemQuantity,
		actionLabel: isUnavailable ? 'Indisponivel' : 'Comprar',
		// sameColorProducts,
		sameColorProducts: [],
		onPressOnCard: handleCardPress,
		onPressCartButton: handleCartButtonPress,
		onPressOnWishlist: handleWishlistPress,
		onChangeQuantity: handleQuantityChange,
		cartQuantity,
		t,
		className,
	}

	// Seleciona a implementação do card baseado na config
	const implementations = {
		fullImage: ProductCardFullImage,
		default: ProductCardDefault,
	}

	const buyGoesToPDP = App?.configs?.appConfigs?.productCard?.buyGoesToPDP
	const cardStyle = App?.configs?.appConfigs?.productCard?.style
	const Implementation = implementations[cardStyle] || ProductCardDefault

	return (
		<>
			{React.createElement(Implementation, params)}

			{!buyGoesToPDP && !isProductKit && (
				<QuickAddToCartModal
					open={showQuickAddModal}
					onClose={() => setShowQuickAddModal(false)}
					product={product}
					currentSku={currentSku}
					onSkuChange={handleQuickSkuChange}
					onConfirm={handleQuickAddToCart}
					loading={loadingCartOp}
				/>
			)}
		</>
	)
}

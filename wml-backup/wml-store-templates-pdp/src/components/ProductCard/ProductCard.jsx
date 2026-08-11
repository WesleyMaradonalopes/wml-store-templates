import { useTranslation } from 'eitri-i18n'

import { App, EventBus } from 'eitri-shopping-vtex-shared'
import React, { useState, useEffect, useCallback, useRef } from 'react'

import { ProductCardFullImage, ProductCardDefault, Toast } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../providers/LocalCart'
import { openCart, openProduct } from '../../services/NavigationService'
import { addToWishlist, productOnWishlist, removeItemFromWishlist } from '../../services/customerService'
import { getProductReleaseDateById } from '../../services/productService'
import { formatPrice } from '../../utils/utils'
import { useSameColorProducts } from '../../hooks/colors/useSameColorProducts'
import QuickAddToCartModal from './QuickAddToCartModal'

export const COLOR_ATTRIBUTE_NAME = 'Cor em Atributo de Produto'
const NEW_RELEASE_WINDOW_MS = 10368000000

const isProductKitByVariation = (product) => {
	return product?.items?.some((item) =>
		item?.variations?.some((variation) => {
			const normalizedVariation = typeof variation === 'string' ? { name: variation, values: item?.[variation] } : variation

			return normalizedVariation?.name === 'Tamanho' && normalizedVariation?.values?.[0] === 'TU'
		}),
	)
}

export default function ProductCard(props) {
	/*
	 *  Aos poucos modificando esse componente para quebrar ele em mais componentes funcionais
	 * */

	const { t } = useTranslation()
	const { product, className } = props
	const { addItem, removeItem, updateItemQuantity, cart } = useLocalShoppingCart()

	const [loadingCartOp, setLoadingCartOp] = useState(false)
	const [toastData, setToastData] = useState(null)
	const [showQuickAddModal, setShowQuickAddModal] = useState(false)
	const [loadingWishlistOp, setLoadingWishlistOp] = useState(true)

	const [isOnWishlist, setIsOnWishlist] = useState(false)
	const [wishListId, setWishListId] = useState(null)
	const wishListIdRef = useRef()
	const productIdRef = useRef()

	const [itemQuantity, setItemQuantity] = useState(1)
	const [itemInCart, setItemInCart] = useState(null)
	const [currentSku, setCurrentSku] = useState(null)
	const [isNewProduct, setIsNewProduct] = useState(false)

	const item = product?.items?.[0]
	const productItems = product?.items || []
	const productItemIds = productItems.map((productItem) => productItem?.itemId).filter(Boolean)
	const sellerDefault = item?.sellers?.find((seller) => seller.sellerDefault) || item?.sellers?.[0]
	const isProductKit = isProductKitByVariation(product)

	const sameColorProducts = useSameColorProducts(product, COLOR_ATTRIBUTE_NAME, true)

	useEffect(() => {
		wishListIdRef.current = wishListId
	}, [wishListId])

	useEffect(() => {
		productIdRef.current = product?.productId
	}, [product?.productId])

	const showToast = useCallback((message, type = 'success') => {
		setToastData({
			id: Date.now(),
			message,
			type,
		})
	}, [])

	const handleToastClose = useCallback(() => {
		setToastData(null)
	}, [])

	useEffect(() => {
		checkItemOnWishlist()

		const firstAvailableSku =
			productItems.find((productItem) =>
				productItem?.sellers?.some((seller) => seller?.commertialOffer?.AvailableQuantity > 0),
			) || item
		setCurrentSku(firstAvailableSku)
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

	useEffect(() => {
		EventBus.subscribe({
			channel: 'addToWishlist',
			broadcast: true,
			callback: (data) => {
				if (data?.productId === productIdRef.current) {
					setIsOnWishlist(true)
					setWishListId(data?.response?.data?.addToList)
				}
			},
		})

		EventBus.subscribe({
			channel: 'removeFromWishlist',
			broadcast: true,
			callback: (data) => {
				if (data?.id === wishListIdRef.current && data?.response?.data?.removeFromList) {
					setIsOnWishlist(false)
					setWishListId(-1)
				}
			},
		})
	}, [])

	useEffect(() => {
		const itemIndex = cart?.items?.findIndex((cartItem) => productItemIds.includes(cartItem.id))
		if (itemIndex > -1) {
			setItemInCart({ ...cart?.items?.[itemIndex], index: itemIndex })
			setItemQuantity(cart?.items?.[itemIndex].quantity)
			return
		}

		setItemInCart(null)
		setItemQuantity(1)
	}, [cart, product])

	// Loaders
	const checkItemOnWishlist = async () => {
		try {
			const { inList, listId } = await productOnWishlist(product.productId)
			if (inList) {
				setIsOnWishlist(true)
				setWishListId(listId)
			}
			setLoadingWishlistOp(false)
		} catch (e) {
			setLoadingWishlistOp(false)
		}
	}

	const getItemName = () => {
		return product.productName
	}

	const getItemImage = () => {
		if (item) {
			return item?.images?.[0]?.imageUrl
		}
	}

	const getItemVideo = () => {
		if (item) {
			let productVideo = ''
			if (App?.configs?.appConfigs?.productCard?.productVideoTag) {
				const productVideoTag = App?.configs?.appConfigs?.productCard?.productVideoTag
				const property = product?.properties?.find((prop) => prop.name === productVideoTag)
				if (property) {
					productVideo = property.values?.[0]
				}
			}
		}
	}

	// Formatters
	const formatInstallments = (seller) => {
		const installments = seller?.commertialOffer.Installments

		const maxInstallments = installments?.reduce((acc, curr) => {
			return curr.NumberOfInstallments > acc.NumberOfInstallments ? curr : acc
		}, installments[0])

		if (!maxInstallments || maxInstallments?.NumberOfInstallments === 1) return ''

		return `em até ${maxInstallments?.NumberOfInstallments}x ${formatPrice(maxInstallments?.Value)}`
	}

	const getListPrice = () => {
		if (sellerDefault?.commertialOffer.Price === sellerDefault?.commertialOffer.ListPrice) {
			return ''
		} else {
			return formatPrice(sellerDefault?.commertialOffer.ListPrice)
		}
	}

	const getBadge = () => {
		const price = sellerDefault?.commertialOffer?.Price
		const listPrice = sellerDefault?.commertialOffer?.ListPrice

		if (price !== listPrice) {
			const discount = ((listPrice - price) / listPrice) * 100
			return `${discount.toFixed(0)}% OFF`
		} else {
			return ''
		}
	}

	// Cart
	const addToCart = async (skuToAdd = item) => {
		try {
			if (!skuToAdd) return
			setLoadingCartOp(true)
			const cartItemIndex = cart?.items?.findIndex((cartItem) => String(cartItem?.id) === String(skuToAdd?.itemId)) ?? -1
			const cartItem = cart?.items?.[cartItemIndex]
			const newCart =
				cartItemIndex > -1
					? await updateItemQuantity(cartItemIndex, (cartItem?.quantity || 0) + itemQuantity)
					: await addItem({ ...skuToAdd, quantity: itemQuantity })

			if (!newCart) {
				showToast('Nao foi possivel adicionar à sacola', 'error')
				setLoadingCartOp(false)
				return
			}

			const itemIndex = newCart?.items?.findIndex((cartItem) =>
				productItemIds.some((itemId) => String(itemId) === String(cartItem.id)),
			)
			if (itemIndex > -1) {
				setItemInCart({ ...newCart?.items?.[itemIndex], index: itemIndex })
				setItemQuantity(newCart?.items?.[itemIndex].quantity)
			}
			showToast('produto adicionado à sacola')
			setLoadingCartOp(false)
		} catch (e) {
			console.error('Error adding cart item', e)
			showToast('Nao foi possivel adicionar à sacola', 'error')
			setLoadingCartOp(false)
		}
	}

	const removeFromCart = async () => {
		setLoadingCartOp(true)
		await removeItem(itemInCart?.index)
		setItemInCart(null)
		setLoadingCartOp(false)
	}

	const isItemOnCart = () => {
		return !!itemInCart
	}

	const hasSelectableVariations = () => {
		if (productItems.length <= 1) return false

		const variationValues = {}

		productItems.forEach((productItem) => {
			productItem?.variations?.forEach((variation) => {
				const normalizedVariation =
					typeof variation === 'string'
						? { name: variation, values: productItem[variation] }
						: variation

				const variationName = normalizedVariation?.name
				const variationValue = normalizedVariation?.values?.[0]

				if (!variationName || !variationValue) return

				if (!variationValues[variationName]) {
					variationValues[variationName] = new Set()
				}

				variationValues[variationName].add(variationValue)
			})
		})

		return Object.values(variationValues).some((values) => values.size > 1)
	}

	const onChangeQuantity = async (newQuantity) => {
		if (newQuantity === 0) {
			return removeFromCart()
		}
		if (itemInCart) {
			await updateItemQuantity(itemInCart.index, newQuantity)
			setItemQuantity(newQuantity)
		}
	}

	// Wishlist
	const onAddToWishlist = async () => {
		try {
			if (!product.productId) return
			setLoadingWishlistOp(true)
			setIsOnWishlist(true)
			let response = await addToWishlist(product.productId, item?.name, item?.itemId)
			setWishListId(response?.data?.addToList)
			showToast('Produto adicionado aos favoritos')
			setLoadingWishlistOp(false)
		} catch (error) {
			console.error('error on wishlist', error)
			setIsOnWishlist(false)
			setLoadingWishlistOp(false)
		}
	}

	const onRemoveFromWishlist = async () => {
		try {
			setLoadingWishlistOp(true)
			setIsOnWishlist(false)
			await removeItemFromWishlist(wishListId)
			setLoadingWishlistOp(false)
		} catch (error) {
			setLoadingWishlistOp(false)
			setIsOnWishlist(true)
		}
	}

	// Navigation
	const onPressOnCard = () => {
		openProduct(product)
	}

	const onPressOnWishlist = () => {
		try {
			if (loadingWishlistOp) return
			if (isOnWishlist) {
				onRemoveFromWishlist()
			} else {
				onAddToWishlist()
			}
		} catch (e) {}
	}

	const getActionLabel = () => {
		return 'Comprar'
	}

	const onPressCartButton = (event) => {
		event?.stopPropagation?.()

		if (loadingCartOp) return

		if (isProductKit) {
			openProduct(product)
			return
		}

		if (hasSelectableVariations()) {
			setShowQuickAddModal(true)
			return
		}

		addToCart(currentSku || item)
	}

	const onQuickSkuChange = (newDesiredVariations) => {
		if (!productItems.length) return

		const productSku = productItems.find((skuItem) => {
			return skuItem?.variations?.every((variation) => {
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
	}

	const onConfirmQuickAdd = async () => {
		await addToCart(currentSku || item)
		setShowQuickAddModal(false)
	}

	let productVideo = ''
	if (App?.configs?.appConfigs?.productCard?.productVideoTag) {
		const productVideoTag = App?.configs?.appConfigs?.productCard?.productVideoTag
		const property = product?.properties?.find((prop) => prop.name === productVideoTag)
		if (property) {
			productVideo = property.values?.[0]
		}
	}

	const params = {
		isNewProduct,
		name: getItemName(),
		image: getItemImage(),
		video: productVideo,
		badge: getBadge(),
		listPrice: getListPrice(),
		showListItem: App?.configs?.appConfigs?.productCard?.showListPrice ?? true,
		price: formatPrice(sellerDefault?.commertialOffer.Price),
		installments: formatInstallments(sellerDefault),
		isInCart: isItemOnCart(),
		isOnWishlist: isOnWishlist,
		loadingWishlistOp: loadingWishlistOp,
		loadingCartOp: loadingCartOp,
		hideCartAction: isProductKit,
		itemQuantity: itemQuantity,
		actionLabel: getActionLabel(),
		sameColorProducts,
		onPressOnCard: onPressOnCard,
		onPressCartButton: onPressCartButton,
		onPressOnWishlist: onPressOnWishlist,
		onChangeQuantity: onChangeQuantity,
		cartQuantity:
			cart?.items?.reduce((acc, cartItem) => {
				if (!productItemIds.some((itemId) => String(itemId) === String(cartItem?.id))) return acc
				return acc + (cartItem?.quantity || 0)
			}, 0) ?? 0,
		t: t,
		className,
	}

	const implementations = {
		fullImage: ProductCardFullImage,
		default: ProductCardDefault,
		// convenience: ProductCardConvenience
	}

	const rcProductCardStyle = App?.configs?.appConfigs?.productCard?.style

	const Implementation =
		rcProductCardStyle && implementations[rcProductCardStyle]
			? implementations[rcProductCardStyle]
			: ProductCardDefault

	return (
		<>
			{React.createElement(Implementation, params)}
			{!isProductKit && (
				<QuickAddToCartModal
					open={showQuickAddModal}
					onClose={() => setShowQuickAddModal(false)}
					product={product}
					currentSku={currentSku}
					onSkuChange={onQuickSkuChange}
					onConfirm={onConfirmQuickAdd}
					loading={loadingCartOp}
				/>
			)}
			<Toast
				toastData={{
					triggerId: toastData?.id,
					id: toastData?.id,
					message: toastData?.message,
					type: toastData?.type,
				}}
				bottomClassName='bottom-[77px]'
				widthClassName='w-[80%]'
				showBottomInset
				onClose={handleToastClose}
			/>
		</>
	)
}

import { useTranslation } from 'eitri-i18n'

import { App } from 'eitri-shopping-vtex-shared'

import { ProductCardFullImage, ProductCardDefault } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../../providers/LocalCart'
import { openProduct } from '../../../services/NavigationService'
import { addToWishlist, productOnWishlist, removeItemFromWishlist } from '../../../services/CustomerService'
import { formatPrice } from '../../../utils/utils'
export default function ProductCardWrapper(props) {
	const { vtexProduct, width } = props
	const { addItem, removeItem, cart } = useLocalShoppingCart()
	const [loadingCartOp, setLoadingCartOp] = useState(false)
	const [loadingWishlistOp, setLoadingWishlistOp] = useState(true)
	const [isOnWishlist, setIsOnWishlist] = useState(false)
	const [wishListId, setWishListId] = useState(null)
	const { t } = useTranslation()
	useEffect(() => {
		checkItemOnWishlist()
	}, [])
	const item = vtexProduct?.items?.[0]
	const sellerDefault = item?.sellers?.find((seller) => seller.sellerDefault) || item?.sellers?.[0]
	// Loaders
	const checkItemOnWishlist = async () => {
		try {
			const { inList, listId } = await productOnWishlist(vtexProduct.productId)
			if (inList) {
				setIsOnWishlist(true)
				setWishListId(listId)
			}
			setLoadingWishlistOp(false)
		} catch (e) {
			setLoadingWishlistOp(false)
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
		if (price < listPrice) {
			const discount = ((listPrice - price) / listPrice) * 100
			if (discount < 1) return ''
			return `${discount.toFixed(0)}% off`
		} else {
			return ''
		}
	}
	// Cart
	const addToCart = async () => {
		setLoadingCartOp(true)
		await addItem(item)
		setLoadingCartOp(false)
	}
	const removeFromCart = async () => {
		setLoadingCartOp(true)
		const index = cart?.items?.findIndex((cartItem) => cartItem.id === item?.itemId)
		await removeItem(index)
		setLoadingCartOp(false)
	}
	const isItemOnCart = () => {
		return cart?.items?.some((cartItem) => cartItem.id === item?.itemId)
	}
	// Wishlist
	const onAddToWishlist = async () => {
		try {
			if (!vtexProduct.productId) return
			setLoadingWishlistOp(true)
			await addToWishlist(vtexProduct.productId, item?.name, item?.itemId)
			setIsOnWishlist(true)
			setLoadingWishlistOp(false)
		} catch (error) {
			setLoadingWishlistOp(false)
		}
	}
	const onRemoveFromWishlist = async () => {
		setLoadingWishlistOp(true)
		await removeItemFromWishlist(wishListId)
		setLoadingWishlistOp(false)
		setIsOnWishlist(false)
	}
	// Navigation
	const onPressOnCard = () => {
		openProduct(vtexProduct)
	}
	const onPressOnWishlist = () => {
		if (loadingWishlistOp) return
		if (isOnWishlist) {
			onRemoveFromWishlist()
		} else {
			onAddToWishlist()
		}
	}
	const onPressCartButton = () => {
		if (App?.configs?.appConfigs?.productCard?.buyGoesToPDP) {
			openProduct(vtexProduct)
			return
		}
		if (loadingCartOp) return
		if (isItemOnCart()) {
			removeFromCart()
		} else {
			addToCart()
		}
	}
	if (App?.configs?.appConfigs?.productCard?.style === 'fullImage') {
		return (
			<ProductCardFullImage
				name={item?.nameComplete || item?.name}
				image={item?.images?.[0]?.imageUrl}
				badge={getBadge()}
				listPrice={getListPrice()}
				showListItem={App?.configs?.appConfigs?.productCard?.showListPrice ?? true}
				price={formatPrice(sellerDefault?.commertialOffer.Price)}
				installments={formatInstallments(sellerDefault)}
				isInCart={isItemOnCart()}
				isOnWishlist={isOnWishlist}
				loadingWishlistOp={loadingWishlistOp}
				loadingCartOp={loadingCartOp}
				actionLabel={isItemOnCart() ? t('productCardVertical.cart') : t('productCardVertical.buy')}
				width={width}
				onPressOnCard={onPressOnCard}
				onPressCartButton={onPressCartButton}
				onPressOnWishlist={onPressOnWishlist}
			/>
		)
	}
	return (
		<ProductCardDefault
			name={item?.nameComplete || item?.name}
			image={item?.images?.[0]?.imageUrl}
			badge={getBadge()}
			listPrice={getListPrice()}
			showListItem={App?.configs?.appConfigs?.productCard?.showListPrice ?? true}
			price={formatPrice(sellerDefault?.commertialOffer.Price)}
			installments={formatInstallments(sellerDefault)}
			isInCart={isItemOnCart()}
			actionLabel={isItemOnCart() ? t('productCardVertical.cart') : t('productCardVertical.buy')}
			isOnWishlist={isOnWishlist}
			loadingWishlistOp={loadingWishlistOp}
			loadingCartOp={loadingCartOp}
			width={width}
			onPressOnCard={onPressOnCard}
			onPressCartButton={onPressCartButton}
			onPressOnWishlist={onPressOnWishlist}
		/>
	)
}

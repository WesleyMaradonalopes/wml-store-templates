import Eitri from 'eitri-bifrost'
import { setNewAddress, setFreight } from '../services/freigthService'
import { CART_UPDATED_CHANNEL, resolveTabBadge } from 'wml-store-templates-shared'
import {
	getCart,
	addCoupon,
	addItemOffer,
	addItemToCart,
	changeItemQuantity,
	removeCartItem,
	removeCoupon,
	removeItemOffer,
} from '../services/cartService'

const LocalCart = createContext({})

export default function CartProvider({ children }) {
	const [cart, setCart] = useState(null)
	const [cartIsLoading, setCartInLoading] = useState(null)

	useEffect(() => {
		Eitri.eventBus.subscribe({
			channel: CART_UPDATED_CHANNEL,
			broadcast: true,
			persistBetweenNavigations: true,
			callback: (data) => {
				if (data?.cart) setCart(data.cart)
				if (data?.totalQuantity !== undefined) resolveTabBadge(data.totalQuantity)
			},
		})
	}, [])

	const executeCartOperation = async (operation, ...args) => {
		setCartInLoading(true)
		const operationName = operation?.name || 'anonymousOperation'

		try {
			const newCart = await operation(...args)
			if (newCart) {
				setCart(newCart)
				const totalQuantity = newCart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0
				resolveTabBadge(totalQuantity)
				Eitri.eventBus.publish({
					channel: CART_UPDATED_CHANNEL,
					data: { cart: newCart, totalQuantity },
					broadcast: true,
				})
			}

			return newCart
		} catch (error) {
			throw error
		} finally {
			setCartInLoading(false)
		}
	}

	const startCart = async () => {
		return executeCartOperation(getCart)
	}

	const addItem = async (payload) => {
		return executeCartOperation(addItemToCart, payload)
	}

	const _addItemOffer = async (itemIndex, offeringId) => {
		return executeCartOperation(addItemOffer, itemIndex, offeringId)
	}

	const _removeItemOffer = async (itemIndex, offeringId) => {
		return executeCartOperation(removeItemOffer, itemIndex, offeringId)
	}

	const changeQuantity = async (index, newQuantity) => {
		return executeCartOperation(changeItemQuantity, index, newQuantity)
	}

	const removeItem = async (index) => {
		return executeCartOperation(removeCartItem, index)
	}

	const _setNewAddress = async (cart, zipCode) => {
		return executeCartOperation(setNewAddress, cart, zipCode)
	}

	const _setFreight = async (cart, zipCode) => {
		return executeCartOperation(setFreight, cart, zipCode)
	}

	const _removeCoupon = async () => {
		return executeCartOperation(removeCoupon)
	}

	const _addCoupon = async (coupon) => {
		return executeCartOperation(addCoupon, coupon)
	}

	return (
		<LocalCart.Provider
			value={{
				setCart,
				startCart,
				cart,
				cartIsLoading,
				addItem,
				addItemOffer: _addItemOffer,
				removeItemOffer: _removeItemOffer,
				changeQuantity,
				removeItem,
				setNewAddress: _setNewAddress,
				removeCoupon: _removeCoupon,
				setFreight: _setFreight,
				addCoupon: _addCoupon,
			}}>
			{children}
		</LocalCart.Provider>
	)
}

export function useLocalShoppingCart() {
	const context = useContext(LocalCart)

	return context
}

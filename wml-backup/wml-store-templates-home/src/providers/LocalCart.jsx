import Eitri from 'eitri-bifrost'
import { CART_UPDATED_CHANNEL, resolveTabBadge } from 'wml-store-templates-shared'
import { getCart, addItemToCart, changeItemQuantity, removeCartItem } from '../services/CartService'
const LocalCart = createContext({})
export default function CartProvider({ children }) {
	const [cart, setCart] = useState(null)
	const [cartIsLoading, setCartInLoading] = useState(false)

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
		const newCart = await operation(...args)
		setCart(newCart)
		const totalQuantity = newCart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0
		resolveTabBadge(totalQuantity)
		Eitri.eventBus.publish({
			channel: CART_UPDATED_CHANNEL,
			data: { cart: newCart, totalQuantity },
			broadcast: true,
		})
		setCartInLoading(false)
		return newCart
	}
	const startCart = async () => {
		return executeCartOperation(getCart)
	}
	const addItem = async (payload) => {
		return executeCartOperation(addItemToCart, payload)
	}
	const removeItem = async (itemId) => {
		return executeCartOperation(removeCartItem, itemId)
	}
	const updateItemQuantity = async (index, newQuantity) => {
		return executeCartOperation(changeItemQuantity, index, newQuantity)
	}
	return (
		<LocalCart.Provider
			value={{
				setCart,
				startCart,
				cart,
				cartIsLoading,
				addItem,
				removeItem,
				updateItemQuantity,
			}}>
			{children}
		</LocalCart.Provider>
	)
}
export function useLocalShoppingCart() {
	const context = useContext(LocalCart)
	return context
}

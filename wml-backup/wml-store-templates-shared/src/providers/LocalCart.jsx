import { getCart, addItemToCart, removeCartItem } from '../services/CartService'
const LocalCart = createContext({})
export default function CartProvider({ children }) {
	const [cart, setCart] = useState(null)
	const [cartIsLoading, setCartInLoading] = useState(false)
	const executeCartOperation = async (operation, ...args) => {
		setCartInLoading(true)
		const newCart = await operation(...args)
		setCart(newCart)
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
	return (
		<LocalCart.Provider
			value={{
				setCart,
				startCart,
				cart,
				cartIsLoading,
				addItem,
				removeItem,
			}}>
			{children}
		</LocalCart.Provider>
	)
}
export function useLocalShoppingCart() {
	const context = useContext(LocalCart)
	return context
}

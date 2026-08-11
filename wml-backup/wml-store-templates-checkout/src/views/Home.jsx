import Eitri from 'eitri-bifrost'

import { addLoggedCustomerToCart, cartHasCustomerData, saveCartIdOnStorage } from '../services/cartService'
import { startConfigure } from '../services/AppService'
import { useCustomer } from '../providers/Customer'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { trackBeginCheckout } from '../services/Tracking'
import { navigate } from '../services/navigationService'

import LoadingComponent from '../components/Shared/Loading/LoadingComponent'

let pristine = true
export default function Home(props) {
	const { startCart, addPersonalData, setCart } = useLocalShoppingCart()
	const { getCustomer, getUserByEmail } = useCustomer()

	useEffect(() => {
		init()
	}, [])

	const init = async () => {
		try {
			await startConfigure()

			// Carregar customer e cart em paralelo
			const [loggedCustomer, cart] = await Promise.all([
				getCustomer().catch((err) => {
					console.error('Failed to get customer:', err)
					return null
				}),
				loadCart().catch((err) => {
					console.error('Failed to load cart:', err)
					throw err // Cart é crítico
				}),
			])

			let _cart = cart

			if (loggedCustomer) {
				const cartEmail = cart?.clientProfileData?.email
				const customerEmail = loggedCustomer?.email
				if (cartEmail !== customerEmail || !cartHasCustomerData(cart)) {
					try {
						_cart = await addLoggedCustomerToCart(loggedCustomer, cart, { addPersonalData })
					} catch (e) {
						console.error('Failed to add customer to cart:', e)
					}
				}
			}

			loadCheckoutProfile(_cart?.clientProfileData?.email)
			handleNavigation(_cart)
		} catch (e) {
			console.log('Error ao buscar carrinho', e)
		}
	}

	const loadCart = async () => {
		const startParams = await Eitri.getInitializationInfos()

		if (startParams?.orderFormId) {
			await saveCartIdOnStorage(startParams?.orderFormId)
		}

		return await startCart()
	}

	const handleNavigation = async (cart) => {
		// navigate('CheckoutReview')
		// return
		// console.log('cart=====>', cart?.orderFormId)

		if (!cart || cart.items.length === 0) {
			return navigate('EmptyCart')
		}

		if (pristine) {
			trackBeginCheckout(cart)
			pristine = false
		}

		const destination = cartHasCustomerData(cart) ? 'FreightResolver' : 'PersonalData'

		return navigate(destination, {}, true)
	}

	const loadCheckoutProfile = async (email) => {
		if (!email) return
		await getUserByEmail(email)
	}

	return (
		<Page
			title={'Checkout'}
			className='font-sans text-base text-primary'>
			<LoadingComponent
				fullScreen={true}
				isLoading={true}
			/>
		</Page>
	)
}

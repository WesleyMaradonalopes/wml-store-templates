import { cartShippingResolver, shippingResolver } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { navigate, openCart } from '../services/navigationService'

export default function FreightResolver(props) {
	const { cart } = useLocalShoppingCart()

	useEffect(() => {
		if (!cart?.shippingData?.address) {
			navigate('AddressForm', {}, true)
		} else {
			if (cart?.shippingData?.address?.addressType === 'residential' && !cart?.shippingData?.address?.number) {
				navigate('AddressForm', { addressId: cart?.shippingData?.address?.addressId }, true)
				return
			}

			const shippingData = cartShippingResolver(cart)
			const shipping = shippingResolver(cart)

			// console.log('shippingResolver====>', shipping)

			if (shipping?.options?.some((opt) => !opt.fulfillsAllItems)) {
				navigate('MultipleFreightSelector', {}, true)
				return
			}

			if (!shippingData || shippingData?.options?.length === 0) {
				openCart()
				return
			}

			navigate('ShippingMethod', {}, true)
		}
	}, [cart])

	return <Page className='font-sans text-base text-primary'></Page>
}

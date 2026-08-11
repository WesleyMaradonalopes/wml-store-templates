import Eitri from 'eitri-bifrost'

import { Vtex } from 'eitri-shopping-vtex-shared'

import { clearCart } from '../services/cartService'
import { navigate } from '../services/navigationService'

export default function ExternalProviderOrder(props) {
	let isMounted = true

	useEffect(() => {
		if (props.location?.state?.paymentResult) {
			const paymentResult = props.location?.state?.paymentResult

			const paymentAuthorizationApp = paymentResult.paymentAuthorizationAppCollection[0]
			const url = paymentAuthorizationApp.appPayload

			openProvider(url)

			Eitri.navigation.addOnResumeListener(() => checkOrderStatus())
		}
	}, [props.location?.state?.paymentResult])

	useEffect(() => {
		return () => {
			isMounted = false
		}
	}, [])

	const openProvider = async (url) => {
		Eitri.openBrowser({
			url: url,
			inApp: true,
		})
	}

	async function checkOrderStatus(transactionId, paymentId) {
		try {
			if (!isMounted) return

			const cart = await Vtex.checkout.getCart()

			if (cart?.items?.length > 0) {
				navigate('ExternalProviderOrderFinished', {}, true)
			} else {
				clearCart()
				navigate('OrderCompleted', {
					orderValue: cart.value,
					orderId: props.location?.state?.paymentResult?.orderId,
				})
			}
		} catch (error) {}
	}

	return <Page className='font-sans text-base text-primary'></Page>
}

import Eitri from 'eitri-bifrost'
import { Page } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

import { HeaderContentWrapper, HeaderReturn, HeaderText, Loading } from 'wml-store-templates-shared'

import { sendPageView } from '../services/trackingService'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { saveCartIdOnStorage } from '../services/cartService'
import FreightBar from '../components/Freight/FreightBar'
import Coupon from '../components/Coupon/Coupon'
import CartSummary from '../components/CartSummary/CartSummary'
import CartItemsContent from '../components/CartItemsContent/CartItemsContent'
import ActionButton from '../components/ActionButton/ActionButton'
import { startConfigure } from '../services/AppService'
import { isVersionLower } from 'wml-store-templates-shared'

export default function Home(props) {
	const { t } = useTranslation()
	const { cart, startCart, setCart } = useLocalShoppingCart()
	const freeFreightThreshold = 24900

	const [appIsLoading, setAppIsLoading] = useState(true)
	const [openWithBottomBar, setOpenWithBottomBar] = useState(false)

	useEffect(() => {
		startHome()

		Eitri.navigation.addOnResumeListener(() => {
			startHome()
		})
	}, [])

	useEffect(() => {
		if (cart) {
			if (cart.items?.length === 0) {
				Eitri.navigation.navigate({
					path: 'EmptyCart',
					state: { openWithBottomBar },
					replace: true,
				})
			}
		}
	}, [cart])

	const startHome = async () => {
		const startParams = await Eitri.getInitializationInfos()
		const { applicationData } = await Eitri.getConfigs()
		const appVersion = applicationData?.version?.split('-')[0]

		if (startParams?.tabIndex !== undefined && isVersionLower(appVersion, '1.0.5') && !startParams?.compatRedirect) {
			Eitri.navigation.open({ slug: 'wml-store-templates-account', initParams: { tabIndex: startParams.tabIndex, compatRedirect: true }, replace: true })
			return
		}

		setOpenWithBottomBar(startParams?.tabIndex)

		await startConfigure()
		await loadCart()

		setAppIsLoading(false)
		sendPageView('Home')
	}

	const loadCart = async () => {
		const startParams = await Eitri.getInitializationInfos()
		if (startParams?.orderFormId) {
			await saveCartIdOnStorage(startParams?.orderFormId)
		}
		return startCart()
	}

	const count = useRef(5)
	const cpOrderFormId = () => {
		if (count.current <= 0) {
			count.current = 5
			Eitri.clipboard.setText({
				text: cart.orderFormId,
			})
		} else {
			count.current--
		}
	}

	return (
		<Page
			title='Carrinho'
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				{!openWithBottomBar && <HeaderReturn />}
				<View onClick={cpOrderFormId}>
					<HeaderText text={t('home.title')} />

				</View>
			</HeaderContentWrapper>

			<Loading
				fullScreen
				isLoading={appIsLoading}
			/>

			{cart && (
				<>
					<View className='flex flex-col gap-4 pt-6 pb-4'>
						<CartItemsContent />

						<Coupon />

						<FreightBar freeFreightThreshold={freeFreightThreshold} />

						<CartSummary freeFreightThreshold={freeFreightThreshold} />
					</View>

					<ActionButton />
				</>
			)}
		</Page>
	)
}

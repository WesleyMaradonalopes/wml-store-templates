import { Loading, HeaderContentWrapper, HeaderText, HeaderReturn, BottomInset } from 'wml-store-templates-shared'

import NoItem from '../components/NoItem/NoItem'
import { sendScreenView } from '../services/TrackingService'
import OrderCard from '../components/OrderCard/OrderCard'
import { listOrders } from '../services/CustomerService'
import ProtectedView from '../components/ProtectedView/ProtectedView'
import InfiniteScroll from '../components/InfiniteScroll/InfiniteScroll'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { useLocalShoppingCart } from '../providers/LocalCart'

export default function OrderList(props) {
	const PAGE = 'Meus Pedidos'

	const [orders, setOrders] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const openWithBottomBar = props?.location?.state?.tabIndex !== undefined
	const { cart } = useLocalShoppingCart()

	const [page, setPage] = useState(1)

	const [pageHasEnded, setPageHasEnded] = useState(false)

	const MAX_ORDERS_SHOW_DETAILS = 3

	useEffect(() => {
		handleOrders()
		addonUserTappedActiveTabListener()
		sendScreenView(PAGE, 'OrderList')
	}, [])

	const handleOrders = async () => {
		try {
			if (pageHasEnded) {
				return
			}
			setIsLoading(true)
			const orders = await listOrders(page)
			if (orders && orders.list && orders.list.length === 0) {
				setPageHasEnded(true)
				return
			}
			if (orders && orders.list && orders.list.length > 0) {
				const moreOrdersList = orders.list
				setOrders((prevOrders) => [...prevOrders, ...moreOrdersList])
				setOrders(orders.list)
				setPage(page + 1)
			}
		} catch (error) {
			console.log('erro ao buscar orders', error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<ProtectedView
			afterLoginRedirectTo={'OrderList'}
			redirectState={openWithBottomBar ? { tabIndex: props?.location?.state?.tabIndex } : undefined}>
			<Page title={PAGE} className='font-sans text-base text-primary'>
				<HeaderContentWrapper cartProps={{ cart }}>
					{!openWithBottomBar && <HeaderReturn />}
					<HeaderText text={'Meus Pedidos'} />
				</HeaderContentWrapper>

				<Loading
					isLoading={isLoading}
					fullScreen
				/>

				{!isLoading && (
					<>
						<View className='p-4'>
							<>
								{orders && orders.length >= 1 ? (
									<InfiniteScroll
										onScrollEnd={handleOrders}
										className={'flex flex-col gap-4'}>
										{orders.map((item, key) => (
											<OrderCard
												key={item.orderId}
												order={item}
												showOrderDetails={key < MAX_ORDERS_SHOW_DETAILS}
											/>
										))}
									</InfiniteScroll>
								) : (
									<NoItem
										title='Você não possui nenhum pedido'
										subtitle='Quando você fizer uma compra, ela será listada aqui.'
									/>
								)}
							</>
						</View>
						<BottomInset />
					</>
				)}
			</Page>
		</ProtectedView>
	)
}

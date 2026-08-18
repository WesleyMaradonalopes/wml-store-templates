import Eitri from 'eitri-bifrost'
import { HeaderContentWrapper, HeaderReturn, HeaderText, HeaderShare, Loading, BottomInset, AppToast, AppActionButton, AppText } from 'wml-store-templates-shared'
import { EventBus } from 'eitri-shopping-vtex-shared'
import { getWishlist, removeFromWishlist, getCustomerData } from '../services/CustomerService'
import { startConfigure } from '../services/AppService'
import WishlistItem from '../components/WishlistItem/WishlistItem'
import CategoryProducts from '../components/CategoryProducts/CategoryProducts'
import { sendScreenView } from '../services/TrackingService'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { navigate, PAGES } from '../services/NavigationService'

export default function Wishlist(props) {
	const PAGE = 'Lista de desejos'

	const [wishlistItems, setWishlistItems] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [toastData, setToastData] = useState(null)
	const openWithBottomBar = props?.location?.state?.tabIndex !== undefined
	const { cart } = useLocalShoppingCart()

	useEffect(() => {
		start()
		addonUserTappedActiveTabListener()
		sendScreenView(PAGE, 'Wishlist')
		EventBus.subscribe({
			channel: 'removeFromWishlist',
			broadcast: true,
			callback: () => {
				start()
			},
		})
		EventBus.subscribe({
			channel: 'addToWishlist',
			broadcast: true,
			callback: () => {
				start()
			},
		})
	}, [])

	const start = async () => {
		try {
			setIsLoading(true)
			const result = await getWishlist()
			setWishlistItems(result)
			setIsLoading(false)
		} catch (e) {
			setWishlistItems([])
			setIsLoading(false)
		}
	}

	const shareWishlist = async () => {
		if (!wishlistItems.length) {
			setToastData({ message: 'Adicione um item aos favoritos para compartilhar', type: 'error', id: Date.now() })
			return
		}
		const productIds = wishlistItems.map((item) => item.productId).join(',')
		const skuIds = wishlistItems.map((item) => item.sku).filter(Boolean).join(',')
		let name = ''
		try {
			const customer = await getCustomerData()
			name = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim()
		} catch (e) {}
		const raw = `${name}|${productIds}|${skuIds}`
		const encoded = btoa(unescape(encodeURIComponent(raw)))
		const url = `https://www.lojahr.com.br/favoritos?tag=${encoded}`
		Eitri.share.link({ url })
	}

	const onRemoveFromWishList = async (id) => {
		setIsLoading(true)
		try {
			await removeFromWishlist(id)
			setWishlistItems((prevItems) => prevItems.filter((item) => item.id !== id))
		} catch (error) {
			console.error(error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Page
			title={PAGE}
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<View className="flex flex-row items-center justify-between w-full">
					<View className="flex flex-row items-center gap-2">
						{!openWithBottomBar && <HeaderReturn />}
						<HeaderText text={'Meus favoritos'} />
					</View>
					<View>
						<HeaderShare onClick={shareWishlist} />
					</View>
				</View>
			</HeaderContentWrapper>

			<Loading
				isLoading={isLoading}
				fullScreen
			/>

			<AppToast toastData={toastData} onClose={() => setToastData(null)} />

			{!isLoading && wishlistItems?.length > 0 && (
				<View className='my-4 px-4'>
					<AppText variant='subtitle' className='text-primary'>
						{`${wishlistItems.length} ${wishlistItems.length === 1 ? 'produto' : 'produtos'}`}
					</AppText>
				</View>
			)}

			<View className='grid grid-cols-2 gap-x-2 gap-y-4 p-4'>
				{wishlistItems?.map((item) => (
					<WishlistItem
						key={item.id}
						productId={item.productId}
						onRemove={() => onRemoveFromWishList(item.id)}
					/>
				))}
			</View>
			{wishlistItems?.length === 0 && !isLoading && (
				<View className='my-4 px-4'>
					<View>
						<AppText variant='subtitle' className='text-center text-primary'>
							Você ainda não favoritou produtos
						</AppText>
					</View>
					<View className='mt-4'>
						<AppActionButton
							label='Ir para Home'
							onPress={() => navigate(PAGES.HOME, openWithBottomBar ? { tabIndex: props?.location?.state?.tabIndex } : {})}
						/>
					</View>
					<View className='mt-6'>
						<AppText variant='title-md'>Você pode gostar</AppText>
					</View>
					<CategoryProducts categoryIds={[2, 14]} />
				</View>
			)}
			<BottomInset />
		</Page>
	)
}

import Eitri from 'eitri-bifrost'
import { View } from 'eitri-luminus'

import { EventBus } from 'eitri-shopping-vtex-shared'

import { HeaderCart, HeaderContentWrapper, HeaderLogo, HeaderReturn, HeaderSearchIcon } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../providers/LocalCart'
import { addToWishlist, productOnWishlist, removeItemFromWishlist } from '../../services/customerService'

export default function Header(props) {
	const { product, configLoaded, onWishlistFeedback = () => { } } = props
	const { cart } = useLocalShoppingCart()

	const [loadingWishlist, setLoadingWishlist] = useState(true)
	const [itemWishlistId, setItemWishlistId] = useState(-1)
	const [itemOnWishlist, setItemOnWishlist] = useState(false)
	const itemWishlistIdRef = useRef()
	const productIdRef = useRef()

	useEffect(() => {
		itemWishlistIdRef.current = itemWishlistId
	}, [itemWishlistId])

	useEffect(() => {
		productIdRef.current = product?.productId
	}, [product?.productId])

	useEffect(() => {
		if (product && configLoaded) {
			checkIfIsFavorite(product?.productId)
		}
	}, [product, configLoaded])

	useEffect(() => {
		EventBus.subscribe({
			channel: 'addToWishlist',
			broadcast: true,
			callback: (data) => {
				if (data?.productId === productIdRef.current) {
					setItemOnWishlist(true)
					setItemWishlistId(data?.response?.data?.addToList)
				}
			},
		})

		EventBus.subscribe({
			channel: 'removeFromWishlist',
			broadcast: true,
			callback: (data) => {
				if (data?.id === itemWishlistIdRef.current && data?.response?.data?.removeFromList) {
					setItemOnWishlist(false)
					setItemWishlistId(-1)
				}
			},
		})
	}, [])

	const handleSaveFavorite = async () => {
		if (itemWishlistId === -1) {
			try {
				setItemOnWishlist(true)
				const result = await addToWishlist(product?.productId, product?.productName, product?.items[0]?.itemId)
				setItemWishlistId(result?.data?.addToList)
				onWishlistFeedback('Produto adicionado aos favoritos')
			} catch (e) {
				console.error('handleSaveFavorite: Error', e)
				setItemOnWishlist(false)
			}
		} else {
			try {
				setItemOnWishlist(false)
				await removeItemFromWishlist(itemWishlistId)
				setItemWishlistId(-1)
			} catch (e) {
				console.error('handleSaveFavorite: Error', e)
				setItemOnWishlist(true)
			}
		}
	}

	const checkIfIsFavorite = async (productId) => {
		setLoadingWishlist(true)
		const { inList, listId } = await productOnWishlist(productId)
		if (inList) {
			setItemWishlistId(listId)
			setItemOnWishlist(true)
		}
		setLoadingWishlist(false)
	}

	const goToSearch = () => {
		try {
			Eitri.nativeNavigation.open({
				slug: 'home',
				initParams: { route: 'Search' },
			})
		} catch (e) {
			console.error('goToSearch: Error trying to open Search', e)
			Eitri.navigation.navigate({
				path: '/Search',
				replace: true,
			})
		}
	}

	return (
		<HeaderContentWrapper
			className='relative flex-row items-center justify-between'
			showDefaultActions={false}
		>
			<View className='flex-1 items-start'>
				<View className='inline-flex'>
					<HeaderReturn className='border border-[#CEC5BA] rounded-full' />
				</View>
			</View>

			<View className='flex-1 items-center'>
				<HeaderLogo disableClick />
			</View>

			<HeaderSearchIcon onClick={goToSearch} />
			<HeaderCart cart={cart} />
		</HeaderContentWrapper>
	)
}

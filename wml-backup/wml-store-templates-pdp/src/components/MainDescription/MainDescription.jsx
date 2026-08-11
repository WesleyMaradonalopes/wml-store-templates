import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import { App, EventBus } from 'eitri-shopping-vtex-shared'

import { HeaderWishList } from 'wml-store-templates-shared'

import { addToWishlist, productOnWishlist, removeItemFromWishlist } from '../../services/customerService'

import { formatPrice } from '../../utils/utils'

export default function MainDescription(props) {
	const { t } = useTranslation()
	const count = useRef(5)

	const { product, currentSku, locale, currency } = props
	const { properties = [], productName, productReference } = product ?? {}
	const { sellers = [] } = currentSku ?? {}
	const [mainSeller] = sellers.filter((seller) => seller.sellerDefault) ?? sellers
	const { values: collections = [] } = properties.find((property) => property.name === 'Coleção') ?? {}
	const [collection] = collections

	const price = mainSeller?.commertialOffer?.Price
	const listPrice = mainSeller?.commertialOffer?.ListPrice

	const { showListItem: showListItemConfig = true } = App?.configs?.appConfigs?.productCard ?? {}
	const showListItem = listPrice && price && listPrice > price && showListItemConfig

	const copyCheckoutId = () => {
		if (count.current > 0) {
			count.current -= 1
			return
		}
		Eitri.clipboard.setText({
			text: product?.productId,
		})
		count.current = 5
	}

	const { configLoaded, onWishlistFeedback = () => { } } = props

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

	return (
		<View className='flex w-full flex-col gap-1 font-sans'>
			{/* Product name */}

			<View className="flex flex-row items-start justify-between gap-4">
				<View onClick={copyCheckoutId}>
					<Text className="text-sm font-normal leading-6 text-primary">
						{productName}
					</Text>
				</View>

				<HeaderWishList
					filled={itemOnWishlist}
					onClick={handleSaveFavorite}
					className={loadingWishlist && itemOnWishlist ? 'text-gray-300' : ''}
				/>
			</View>
			{/* Pricing */}
			{price && (
				<View className='flex flex-col'>
					{/* List price */}
					{showListItem && listPrice && (
						<View className='flex items-center gap-2'>
							<Text className='text-xs leading-none line-through'>{formatPrice(listPrice)}</Text>
							<Text className='text-xs font-bold leading-none'>
								({Math.floor(((listPrice - price) / listPrice) * 100)}%)
							</Text>
						</View>
					)}

					{/* Price */}
					<Text className='mt-2 text-base font-semibold leading-none'>{formatPrice(price)}</Text>
				</View>
			)}
		</View>
	)
}

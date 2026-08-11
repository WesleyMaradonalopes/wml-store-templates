import { getProductKit } from '../../services/productService'
import { CustomCheckbox } from "wml-store-templates-shared";
  import { sortSku } from '../../utils/skuSort'

export default function KitSelector({
	productId,
	onSelectionChange,
	showLabel = true,
	isInsideActionButton = false,
	selectionState,
	onSelectionStateChange,
	suppressInitialNotify = false,
}) {
	const [kitItems, setKitItems] = useState([])
	const productIdRef = useRef(productId)
	const [internalSelectedSizes, setInternalSelectedSizes] = useState({})
	const [internalCheckedProducts, setInternalCheckedProducts] = useState({})

	const isControlled = Boolean(selectionState)
	const selectedSizes = isControlled ? (selectionState?.selectedSizes ?? {}) : internalSelectedSizes
	const checkedProducts = isControlled ? (selectionState?.checkedProducts ?? {}) : internalCheckedProducts

	const updateSelectionState = (checked, sizes) => {
		if (!isControlled) {
			setInternalCheckedProducts(checked)
			setInternalSelectedSizes(sizes)
		}
		onSelectionStateChange?.({ checkedProducts: checked, selectedSizes: sizes })
	}

	useEffect(() => {
		productIdRef.current = productId
		if (!productId) return
		if (!isControlled) {
			updateSelectionState({}, {})
		}
		if (!suppressInitialNotify) {
			onSelectionChange?.({ isLoading: true, hasKit: false, selectedItems: [], selectedProductCount: 0, totalItems: 0 })
		}
		getProductKit(productId).then((product) => {
			if (productIdRef.current !== productId) return
			const items = (product?.items ?? []).flatMap((item) => item?.kitItems ?? [])
			setKitItems(items)
			if (onSelectionChange && !suppressInitialNotify) {
				onSelectionChange({ isLoading: false, hasKit: items.length > 0, selectedItems: [], selectedProductCount: 0, totalItems: 0 })
			}
		})
	}, [productId])

	const productGroups = useMemo(() => {
		const groups = {}
		kitItems.forEach((item) => {
			const { productId } = item.product
			if (!groups[productId]) {
				groups[productId] = {
					productId,
					productName: item.product.productName,
					items: [],
				}
			}
			groups[productId].items.push(item)
		})
		return Object.values(groups)
	}, [kitItems])

	const getShortName = (productName) => productName?.split(' ')?.[0] ?? ''

	const getFirstImage = (items) => items[0]?.sku?.images?.[0]?.imageUrl

	const getVariationSize = (item) =>
		item.sku?.variations?.find((v) => v.name === 'Tamanho')?.values?.[0]

	const toggleProduct = (productId) => {
		const isNowChecked = !checkedProducts[productId]
		const updatedChecked = { ...checkedProducts, [productId]: isNowChecked }

		if (!isNowChecked) {
			const updatedSizes = { ...selectedSizes }
			delete updatedSizes[productId]
			updateSelectionState(updatedChecked, updatedSizes)
			notifyChange(updatedChecked, updatedSizes)
		} else {
			updateSelectionState(updatedChecked, selectedSizes)
			notifyChange(updatedChecked, selectedSizes)
		}
	}

	const selectSize = (productId, itemId) => {
		const updatedSizes = { ...selectedSizes, [productId]: itemId }
		const updatedChecked = { ...checkedProducts, [productId]: true }
		updateSelectionState(updatedChecked, updatedSizes)
		notifyChange(updatedChecked, updatedSizes)
	}

	const notifyChange = (checked, sizes) => {
		if (!onSelectionChange) return
		const selectedProductCount = productGroups.filter((g) => checked[g.productId]).length
		const selectedItems = productGroups
			.filter((g) => checked[g.productId] && sizes[g.productId])
			.map((g) => {
				const kitItem = g.items.find((item) => item.itemId === sizes[g.productId])
				if (!kitItem) return null
				return { ...kitItem.sku, itemId: kitItem.itemId, quantity: kitItem.amount }
			})
			.filter(Boolean)
		onSelectionChange({
			isLoading: false,
			hasKit: true,
			selectedItems,
			selectedProductCount,
			totalItems: productGroups.length,
		})
	}

	const getSelectedItems = () => {
		return productGroups.filter((g) => checkedProducts[g.productId] && selectedSizes[g.productId])
	}

	const getTotalPrice = () => {
		return productGroups.reduce((total, g) => {
			if (!checkedProducts[g.productId] || !selectedSizes[g.productId]) return total
			const kitItem = g.items.find((item) => item.itemId === selectedSizes[g.productId])
			if (!kitItem) return total
			const price = kitItem.sku.sellers?.[0]?.commertialOffer?.Price ?? 0
			return total + price * (kitItem.amount || 1)
		}, 0)
	}

	const formatPrice = (value) =>
		value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

	if (productGroups.length === 0) return null

	const selectedCount = getSelectedItems().length
	const totalCount = productGroups.length
	const totalPrice = getTotalPrice()
	const allSelected = selectedCount === totalCount

	return (
		<View className='flex flex-col'>
			{showLabel &&<Text
				className="mb-2 text-[12px] leading-4 font-medium text-[#1E120D]"
				style={{ fontFamily: 'Montserrat' }}
			>
				Selecione o tamanho das peças:
			</Text>
			}
			{productGroups.map((group, index) => {
				const isChecked = Boolean(checkedProducts[group.productId])
				const hasSizeSelected = !!selectedSizes[group.productId]
				const showSizeWarning = isChecked && !hasSizeSelected
				const selectedItem = group.items.find((item) => item.itemId === selectedSizes[group.productId])
				const selectedSizeLabel = selectedItem ? getVariationSize(selectedItem) : ''

				return (
					<View key={group.productId}>
						<View className='flex flex-row items-start gap-3 py-3'>
							<CustomCheckbox checked={isChecked} color="#A49A8E" onChange={() => toggleProduct(group.productId)} />

							<Image
								src={getFirstImage(group.items)}
								className='h-[75px] w-[60px] flex-shrink-0 rounded object-cover'
							/>

							<View className='flex flex-col'>
								<Text className='font-semibold'>{getShortName(group.productName)}</Text>
								<Text className="mt-1 font-montserrat font-medium text-xs leading-4 tracking-normal text-[#1E120D]">
									Tamanho:
									{hasSizeSelected && (
										<Text className="font-normal"> {selectedSizeLabel}</Text>
									)}
								</Text>
								<View className='mt-1 flex flex-row gap-2'>

								{sortSku(group.items.map(item => ({ ...item, name: getVariationSize(item) ?? ''}))).map((item) => {
									const size = getVariationSize(item)
									const isSelected = selectedSizes[group.productId] === item.itemId
									return (
										<View
											key={item.itemId}
											onClick={() => selectSize(group.productId, item.itemId)}
											data-selected={isSelected ? '' : undefined}
											className="
												group
												relative
												flex
												h-[34px]
												w-[34px]
												items-center
												justify-center
												rounded-full
												border
												border-[#D2C9C0]
												text-[10px]
												transition-all
												duration-200

												data-[selected]:border-[#0F0805]
												data-[selected]:bg-[#0F0805]
												data-[selected]:text-white

												data-[unavailable]:border-[#D2C9C0]
												data-[unavailable]:text-[#D2C9C0]

												data-[unavailable]:after:absolute
												data-[unavailable]:after:left-1/2
												data-[unavailable]:after:top-1/2
												data-[unavailable]:after:h-[56%]
												data-[unavailable]:after:w-px
												data-[unavailable]:after:-translate-x-1/2
												data-[unavailable]:after:-translate-y-1/2
												data-[unavailable]:after:rotate-45
												data-[unavailable]:after:bg-[#D2C9C0]
											"
											>
											<Text>{size}</Text>
										</View>
									)
								})}
								</View>

								{showSizeWarning && (
									<View className="mt-2 flex w-full flex-row flex-nowrap items-center rounded-[4px] bg-[#FDEDEC] px-1 py-[4.5px]">
										<View className="mr-1 shrink-0">
										<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
											<path d="M7.5 10.625L7.5 6.25M7.5 4.38123V4.37498M13.125 7.5C13.125 10.6066 10.6066 13.125 7.5 13.125C4.3934 13.125 1.875 10.6066 1.875 7.5C1.875 4.3934 4.3934 1.875 7.5 1.875C10.6066 1.875 13.125 4.3934 13.125 7.5Z" stroke="#C42C21" stroke-width="0.75" stroke-linecap="round"/>
										</svg>
										</View>
										<Text className="flex-1 font-montserrat text-[10px] font-normal leading-[14px] text-[#C42C21]">
												Por favor, selecione um tamanho.
										</Text>
									</View>
								)}
							</View>
						</View>

						{index < productGroups.length - 1 && (
							<View className='border-b border-[#eee]' />
						)}
					</View>
				)
			})}

			{!allSelected && selectedCount > 0 && (
				<View className={`mt-2 flex flex-row items-start gap-1 rounded bg-[#F9F2D9] px-3 py-2 ${isInsideActionButton ? 'mb-7' : ''}`}>
					<View className='shrink-0'>
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M18.1117 14.9812L11.4862 3.35845C11.3341 3.09705 11.117 2.88034 10.8564 2.72977C10.5958 2.57921 10.3009 2.5 10.0007 2.5C9.70053 2.5 9.40556 2.57921 9.145 2.72977C8.88444 2.88034 8.66733 3.09705 8.51516 3.35845L1.88968 14.9812C1.74385 15.2334 1.66699 15.5203 1.66699 15.8124C1.66699 16.1045 1.74385 16.3913 1.88968 16.6435C2.03982 16.9067 2.25665 17.1248 2.51787 17.2753C2.77909 17.4258 3.07528 17.5034 3.37598 17.4999H16.6254C16.9259 17.5031 17.2217 17.4254 17.4827 17.2749C17.7436 17.1244 17.9602 16.9065 18.1102 16.6435C18.2563 16.3914 18.3334 16.1047 18.3337 15.8126C18.3339 15.5205 18.2573 15.2336 18.1117 14.9812ZM17.3231 16.1836C17.2523 16.3065 17.1504 16.4082 17.0277 16.4782C16.9051 16.5481 16.7662 16.5838 16.6254 16.5815H3.37598C3.23518 16.5838 3.09631 16.5481 2.97368 16.4782C2.85105 16.4082 2.74909 16.3065 2.67829 16.1836C2.61206 16.071 2.57711 15.9425 2.57711 15.8116C2.57711 15.6807 2.61206 15.5522 2.67829 15.4397L9.30301 3.81687C9.37543 3.69533 9.47773 3.59477 9.59998 3.52496C9.72223 3.45515 9.86028 3.41847 10.0007 3.41847C10.1411 3.41847 10.2792 3.45515 10.4014 3.52496C10.5237 3.59477 10.626 3.69533 10.6984 3.81687L17.3239 15.4397C17.39 15.5523 17.4248 15.6808 17.4247 15.8117C17.4245 15.9426 17.3895 16.0711 17.3231 16.1836ZM9.54618 11.5305V8.4692C9.54618 8.34742 9.59406 8.23062 9.67931 8.14451C9.76454 8.0584 9.88016 8.01002 10.0007 8.01002C10.1213 8.01002 10.2369 8.0584 10.3221 8.14451C10.4073 8.23062 10.4552 8.34742 10.4552 8.4692V11.5305C10.4552 11.6522 10.4073 11.769 10.3221 11.8551C10.2369 11.9413 10.1213 11.9896 10.0007 11.9896C9.88016 11.9896 9.76454 11.9413 9.67931 11.8551C9.59406 11.769 9.54618 11.6522 9.54618 11.5305ZM10.7582 14.2856C10.7582 14.4369 10.7138 14.5849 10.6306 14.7108C10.5473 14.8366 10.429 14.9347 10.2906 14.9926C10.1522 15.0506 9.99986 15.0657 9.85291 15.0362C9.70596 15.0067 9.57098 14.9338 9.46504 14.8267C9.35909 14.7197 9.28695 14.5833 9.25772 14.4349C9.22849 14.2864 9.24349 14.1325 9.30082 13.9927C9.35816 13.8529 9.45526 13.7333 9.57983 13.6492C9.70441 13.5651 9.85087 13.5203 10.0007 13.5203C10.2016 13.5203 10.3943 13.6009 10.5364 13.7444C10.6784 13.8879 10.7582 14.0826 10.7582 14.2856Z" fill="#806C25"/>
						</svg>
					</View>
					<Text className='flex-1 font-montserrat font-normal text-[12px] leading-[14px] tracking-normal text-[#806C25]'>
						Você selecionou apenas {selectedCount} {selectedCount === 1 ? 'item' : 'itens'}.
						{' '}Para comprar o conjunto completo, selecione uma variação de cada produto.
					</Text>
				</View>
			)}
		</View>
	)
}

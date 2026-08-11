import { Image, Select, Text, View } from 'eitri-luminus'

import { Loading } from 'wml-store-templates-shared'
import { useEffect, useRef, useState } from 'react'
import exchange from '../../assets/images/exchange.svg'
import { useLocalShoppingCart } from '../../providers/LocalCart'
import { getProductKit } from '../../services/productService'
import { sortSku } from '../../utils/skuSort'
import { formatPrice } from '../../utils/utils'

const KIT_PIECE_LABELS = ['Tamanho do top', 'Tamanho da calcinha']

function getVariationOrder(name = '') {
	const normalizedName = String(name).toLowerCase()

	if (normalizedName === 'tamanho') return 1
	if (normalizedName === 'taça' || normalizedName === 'taca') return 2
	return 3
}

export default function BuyTogetherItem(props) {
	const { variant, state, onCartFeedback = () => { }, onSelectionCompleteChange = () => { }, onKitItemsChange = () => { } } = props
	const { cart, addItem, updateItemQuantity } = useLocalShoppingCart()
	const [isLoading, setIsLoading] = useState(false)

	const isMain = variant === 'main'
	const { mainProduct, mainSku, setMainSku, altProduct, altSku, setAltSku, refreshAltProduct, canSwap } = state

	const product = isMain ? mainProduct : altProduct
	const sku = isMain ? mainSku : altSku
	const onSelectSku = isMain ? setMainSku : setAltSku
	const [selectedVariations, setSelectedVariations] = useState({})
	const [openDropdownName, setOpenDropdownName] = useState(null)
	const selectRefs = useRef({})
	const justOpenedRef = useRef(false)

	// null = ainda carregando, true = é kit, false = não é kit
	const [isKitProduct, setIsKitProduct] = useState(null)
	const [rawKitData, setRawKitData] = useState(null)
	const [kitPieceGroups, setKitPieceGroups] = useState([])
	const [selectedKitSizes, setSelectedKitSizes] = useState({})
	const [kitComponentItems, setKitComponentItems] = useState([])

	useEffect(() => {
		setSelectedVariations({})
		onSelectionCompleteChange(false)
	}, [product?.productId])

	const productIdRef = useRef(product?.productId)

	useEffect(() => {
		productIdRef.current = product?.productId
		if (!product?.productId) return
		setIsKitProduct(null)
		setRawKitData(null)
		setKitPieceGroups([])
		setSelectedKitSizes({})
		setKitComponentItems([])
		onKitItemsChange([])

		getProductKit(product.productId)
			.then((data) => {
				if (productIdRef.current !== product.productId) return
				const allKitItems = (data?.items ?? []).flatMap((item) => item?.kitItems ?? [])
				if (!allKitItems.length) {
					setIsKitProduct(false)
					return
				}
				const groups = {}
				allKitItems.forEach((ki) => {
					const pid = ki.product.productId
					if (!groups[pid]) groups[pid] = { productId: pid, skus: [] }
					if (!groups[pid].skus.find((s) => s.itemId === ki.itemId)) groups[pid].skus.push(ki)
				})
				setRawKitData(data)
				setKitPieceGroups(Object.values(groups))
				setIsKitProduct(true)
			})
			.catch(() => setIsKitProduct(false))
	}, [product?.productId])

	const normalizeVariation = (item, variation) => {
		return typeof variation === 'string' ? { name: variation, values: item?.[variation] } : variation
	}

	const isSkuAvailable = (item) => {
		return item?.sellers?.some((seller) => seller.commertialOffer?.AvailableQuantity > 0)
	}

	const skuMatchesVariations = (item, desiredVariations = {}) => {
		const entries = Object.entries(desiredVariations).filter(([, value]) => value)
		if (entries.length === 0) return true

		return entries.every(([variationName, variationValue]) =>
			item.variations?.some((variation) => {
				const normalizedVariation = normalizeVariation(item, variation)
				return normalizedVariation?.name === variationName && normalizedVariation?.values?.[0] === variationValue
			}),
		)
	}

	const getVisibleVariations = (targetProduct) => {
		if (!targetProduct?.items?.length) return []

		const variationsMap = targetProduct.items.reduce((acc, item) => {
			item.variations?.forEach((variation) => {
				const normalizedVariation = normalizeVariation(item, variation)
				const name = normalizedVariation?.name
				const value = normalizedVariation?.values?.[0]

				if (!name || !value) return

				if (!acc.has(name)) {
					acc.set(name, new Set())
				}

				acc.get(name).add(value)
			})

			return acc
		}, new Map())

		return Array.from(variationsMap.entries())
			.map(([name, values]) => ({
				name,
				values: Array.from(values),
			}))
			.filter(({ values }) => values.length > 1)
			.sort((a, b) => getVariationOrder(a.name) - getVariationOrder(b.name))
	}

	const findMatchingSku = (targetProduct, desiredVariations = {}) => {
		const entries = Object.entries(desiredVariations).filter(([, value]) => value)
		if (!targetProduct?.items?.length || entries.length === 0) return null

		const matchingSkus = targetProduct.items.filter((item) => skuMatchesVariations(item, desiredVariations))

		return matchingSkus.find(isSkuAvailable) || matchingSkus[0] || null
	}

	const findAvailableMatchingSku = (targetProduct, desiredVariations = {}) => {
		if (!targetProduct?.items?.length) return null

		return targetProduct.items.find((item) => skuMatchesVariations(item, desiredVariations) && isSkuAvailable(item))
	}

	const isVariationValueAvailable = (variationName, value) => {
		const variationIndex = visibleVariations.findIndex((variation) => variation.name === variationName)
		const previousSelectedVariations = Object.entries(selectedVariations).reduce((acc, [selectedName, selectedValue]) => {
			const selectedIndex = visibleVariations.findIndex((variation) => variation.name === selectedName)

			if (selectedIndex > -1 && selectedIndex < variationIndex) {
				acc[selectedName] = selectedValue
			}

			return acc
		}, {})
		const desiredVariations = {
			...previousSelectedVariations,
			[variationName]: value,
		}

		return Boolean(findAvailableMatchingSku(product, desiredVariations))
	}

	const visibleVariations = getVisibleVariations(product)
	const hasSizeVariation = product?.items?.some((item) =>
		item.variations?.some((variation) => normalizeVariation(item, variation)?.name?.toLowerCase() === 'tamanho'),
	)

	useEffect(() => {
		// Produtos kit têm lógica própria em handleKitSizeChange
		if (isKitProduct !== false) return
		if (product && sku && visibleVariations.length === 0 && isSkuAvailable(sku)) {
			onSelectionCompleteChange(true)
		}
	}, [product?.productId, sku?.itemId, visibleVariations.length, isKitProduct])

	const handleKitSizeChange = (productId, selectedItemId) => {
		const next = { ...selectedKitSizes, [productId]: selectedItemId }
		setSelectedKitSizes(next)

		if (!rawKitData || Object.keys(next).length < kitPieceGroups.length) {
			setKitComponentItems([])
			onKitItemsChange([])
			onSelectionCompleteChange(false)
			return
		}

		const matchingKitSku = rawKitData.items?.find((kitSku) => {
			const kitItemIds = kitSku.kitItems?.map((ki) => String(ki.itemId)) ?? []
			return Object.values(next).every((id) => kitItemIds.includes(String(id)))
		})

		if (matchingKitSku) {
			try {
				onSelectSku(matchingKitSku.itemId)
				const componentItems = matchingKitSku.kitItems
					.filter((ki) => Object.values(next).some((id) => String(id) === String(ki.itemId)))
					.map((ki) => ({ ...ki.sku, itemId: ki.itemId, quantity: ki.amount }))
				setKitComponentItems(componentItems)
				onKitItemsChange(componentItems)
				onSelectionCompleteChange(true)
			} catch {
				setKitComponentItems([])
				onKitItemsChange([])
				onSelectionCompleteChange(false)
			}
		} else {
			setKitComponentItems([])
			onKitItemsChange([])
			onSelectionCompleteChange(false)
		}
	}

	const handleDropdownOpen = (variationName) => {
		setOpenDropdownName(variationName)
		justOpenedRef.current = true
		requestAnimationFrame(() => {
			justOpenedRef.current = false
		})
	}

	const handleDropdownClick = (variationName) => {
		if (openDropdownName === variationName && !justOpenedRef.current) {
			selectRefs.current[variationName]?.close()
		}
	}

	if (!product || !sku) return null

	const isSelectionComplete =
		isKitProduct === null ? false :
			isKitProduct === true ? (kitPieceGroups.length > 0 && Object.keys(selectedKitSizes).length === kitPieceGroups.length) :
				(visibleVariations.length === 0 || visibleVariations.every(({ name }) => selectedVariations[name]))
	const matchedSku = findMatchingSku(product, selectedVariations)
	const availableMatchedSku = findAvailableMatchingSku(product, selectedVariations)
	const targetSku = isSelectionComplete
		? visibleVariations.length === 0 && isSkuAvailable(sku)
			? sku
			: availableMatchedSku
		: null

	const displaySku = targetSku || matchedSku || sku
	const price = displaySku?.sellers?.[0]?.commertialOffer?.Price
	const image = displaySku?.images?.[0]?.imageUrl
	const title = product.productName

	const handleVariationChange = (variationName, value) => {
		if (!value) return
		if (!isVariationValueAvailable(variationName, value)) return

		const variationIndex = visibleVariations.findIndex((variation) => variation.name === variationName)
		const nextSelectedVariations = visibleVariations.slice(0, variationIndex).reduce((acc, variation) => {
			if (selectedVariations[variation.name]) {
				acc[variation.name] = selectedVariations[variation.name]
			}

			return acc
		}, {})

		nextSelectedVariations[variationName] = value

		const nextMatchedSku = findMatchingSku(product, nextSelectedVariations)
		const nextAvailableMatchedSku = findAvailableMatchingSku(product, nextSelectedVariations)
		const nextIsSelectionComplete =
			visibleVariations.every(({ name }) => nextSelectedVariations[name]) && Boolean(nextAvailableMatchedSku)

		setSelectedVariations(nextSelectedVariations)

		if (nextMatchedSku) {
			onSelectSku(nextMatchedSku.itemId)
		}

		onSelectionCompleteChange(nextIsSelectionComplete)
	}

	const canAddToCart = isKitProduct === true ? kitComponentItems.length > 0 : Boolean(targetSku)

	const handleAddToCart = async () => {
		if (!canAddToCart) return

		setIsLoading(true)
		try {
			if (isKitProduct === true) {
				for (const componentSku of kitComponentItems) {
					const qty = componentSku.quantity || 1
					const cartItemIndex = cart?.items?.findIndex((cartItem) => String(cartItem?.id) === String(componentSku.itemId)) ?? -1
					if (cartItemIndex > -1) {
						const cartItem = cart?.items?.[cartItemIndex]
						const result = await updateItemQuantity(cartItemIndex, (cartItem?.quantity || 0) + qty)
						if (!result) {
							onCartFeedback('Nao foi possivel adicionar à sacola', 'error')
							return
						}
					} else {
						const result = await addItem(componentSku)
						if (!result) {
							onCartFeedback('Nao foi possivel adicionar à sacola', 'error')
							return
						}
					}
				}
			} else {
				const cartItemIndex = cart?.items?.findIndex((cartItem) => String(cartItem?.id) === String(targetSku.itemId)) ?? -1
				let updatedCart = null
				if (cartItemIndex > -1) {
					const cartItem = cart?.items?.[cartItemIndex]
					updatedCart = await updateItemQuantity(cartItemIndex, (cartItem?.quantity || 0) + 1)
				} else {
					updatedCart = await addItem(targetSku)
				}
				if (!updatedCart) {
					onCartFeedback('Nao foi possivel adicionar à sacola', 'error')
					return
				}
			}
			onCartFeedback('Adicionado à sacola com sucesso!')
		} catch {
			onCartFeedback('Nao foi possivel adicionar à sacola', 'error')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<View className='flex gap-4'>
			{/* Image */}
			<View
				className='relative w-[138px] shrink-0 self-start overflow-hidden rounded-2xl'
				onClick={!isMain && canSwap ? refreshAltProduct : undefined}>
				<Image
					src={image}
					className='h-auto w-full object-contain'
				/>

				{/* Main Product Label */}
				{isMain && (
					<View className='absolute bottom-1 left-1 right-1 flex h-6 items-center justify-center rounded-2xl bg-white/80 px-3'>
						<Text className='font-sans text-xs font-medium text-primary'>Você está vendo</Text>
					</View>
				)}

				{/* Alt Product Label */}
				{!isMain && canSwap && (
					<View className={`absolute left-1 top-1 flex items-center justify-between gap-1`}>
						<Image
							src={exchange}
							className='h-4 w-4'
						/>
						<Text className='text-xs font-medium text-primary'>Trocar</Text>
					</View>
				)}
			</View>

			{/* Content */}
			<View className='flex flex-col gap-2'>
				{/* Title + price*/}
				<View className='flex flex-col gap-2'>
					{/* Title */}
					<Text
						className='line-clamp-2 font-sans text-xs font-medium text-primary'
						numberOfLines={2}>
						{title}
					</Text>

					{/* Price */}
					<Text className='text-base font-semibold leading-none text-primary'>
						{price !== undefined ? formatPrice(price) : '—'}
					</Text>
				</View>

				{/* Inputs */}
				<View className='flex flex-col gap-2'>
					{/* Size / Kit piece dropdowns */}
					{isKitProduct === true ? (
						kitPieceGroups.map((group, index) => (
							<View key={group.productId}>
								<Select
									placeholder={KIT_PIECE_LABELS[index] ?? `Tamanho da peça ${index + 1}`}
									value={selectedKitSizes[group.productId] || ''}
									onChange={(e) => handleKitSizeChange(group.productId, e.target.value)}
									className='w-full rounded-md border border-neutral-400 bg-white'
									menuClassName='max-w-full'>
									{sortSku(
										group.skus
											.filter((ki) => ki.sku?.sellers?.some((s) => s.commertialOffer?.AvailableQuantity > 0))
											.map((ki) => ({ ...ki, name: ki.sku?.variations?.find((v) => v.name === 'Tamanho')?.values?.[0] ?? '' }))
									).map((ki) => (
										<Select.Item key={ki.itemId} value={String(ki.itemId)}>
											{ki.sku?.variations?.find((v) => v.name === 'Tamanho')?.values?.[0]}
										</Select.Item>
									))}
								</Select>
							</View>
						))
					) : (
						visibleVariations.map(({ name, values }) => {
							const normalizedName = name.toLowerCase()
							const placeholder =
								normalizedName === 'tamanho'
									? 'Selecione o tamanho'
									: normalizedName === 'taça' || normalizedName === 'taca'
										? 'Selecione a taça'
										: `Selecione ${normalizedName}`

							return (
								<View
									key={name}
									onClick={() => handleDropdownClick(name)}>
									<Select
										ref={(element) => {
											selectRefs.current[name] = element
										}}
										onOpen={() => handleDropdownOpen(name)}
										onClose={() => setOpenDropdownName(null)}
										placeholder={placeholder}
										value={selectedVariations[name] || ''}
										onChange={(e) => handleVariationChange(name, e.target.value)}
										className='w-full rounded-md border border-neutral-400 bg-white'
										menuClassName='max-w-full'>
										{sortSku(values.map((value) => ({ name: value })))
											.filter(({ name: value }) => isVariationValueAvailable(name, value))
											.map(({ name: value }) => (
												<Select.Item
													key={value}
													value={value}>
													{value}
												</Select.Item>
											))}
									</Select>
								</View>
							)
						})
					)}

					{/* Add to cart */}
					<View
						onClick={canAddToCart ? handleAddToCart : undefined}
						className={`flex h-12 items-center justify-center rounded-md border ${canAddToCart ? 'border-primary cursor-pointer' : 'border-gray-300 opacity-50'}`}>
						<Text className={`text-center font-sans text-sm font-semibold ${canAddToCart ? 'text-primary' : 'text-gray-400'}`}>
							{isLoading ? <Loading /> : 'Adicionar à sacola'}
						</Text>
					</View>
				</View>
			</View>
		</View>
	)
}

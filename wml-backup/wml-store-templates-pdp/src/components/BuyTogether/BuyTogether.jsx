import { Text, View } from 'eitri-luminus'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useBuyTogetherProducts } from '../../hooks/coss-selling/useBuyTogetherProducts'
import { useLocalShoppingCart } from '../../providers/LocalCart'
import { formatPrice } from '../../utils/utils'
import BuyTogetherItem from './BuyTogetherItem'

function useBuyTogetherState(product) {
	if (!product) throw new Error('A valid product is required to use BuyTogether')

	// # Estados de controle (read-only)
	const altProducts = useBuyTogetherProducts(product)
	const [altProductIndex, setAltProductIndex] = useState(0) // Índice do produto alternativo atual
	const [mainSkuIndex, setMainSkuIndex] = useState(0) // Índice do SKU principal atual
	const [altSkuIndex, setAltSkuIndex] = useState(0) // Índice do SKU alternativo atual

	// # Estados de interesse

	// Produto principal
	const mainProduct = useMemo(() => product, [product])

	// SKU selecionado do produto principal
	const mainSku = useMemo(() => mainProduct.items[mainSkuIndex], [mainProduct, mainSkuIndex])

	// Função para selecionar um SKU do produto principal
	const setMainSku = useCallback(
		(skuId) => {
			const index = mainProduct.items.findIndex((item) => String(item.itemId) === String(skuId))
			if (index === -1) throw new Error('SKU not found')
			setMainSkuIndex(index)
		},
		[mainProduct],
	)

	// Garante que o índice nunca fique fora dos limites quando altProducts muda (ex: troca de produto na PDP)
	useEffect(() => {
		if (altProducts.length > 0 && altProductIndex >= altProducts.length) {
			setAltProductIndex(0)
			setAltSkuIndex(0)
		}
	}, [altProducts.length])

	// Produto alternativo atual
	const altProduct = useMemo(() => altProducts[altProductIndex], [altProducts, altProductIndex])

	// SKU selecionado do produto alternativo atual
	const altSku = useMemo(() => altProduct?.items?.[altSkuIndex], [altProduct, altSkuIndex])

	// Função para selecionar um SKU do produto alternativo atual
	const setAltSku = useCallback(
		(skuId) => {
			const index = altProduct.items.findIndex((item) => String(item.itemId) === String(skuId))
			if (index === -1) throw new Error('SKU not found')
			setAltSkuIndex(index)
		},
		[altProduct],
	)

	// Trocar só faz sentido quando há mais de um produto alternativo
	const canSwap = altProducts.length > 1

	// Função para atualizar o produto alternativo atual (rotação circular)
	const refreshAltProduct = useCallback(() => {
		if (altProducts.length <= 1) return
		setAltProductIndex((prev) => (prev + 1) % altProducts.length)
		setAltSkuIndex(0)
	}, [altProducts])

	return { mainProduct, mainSku, setMainSku, altProduct, altSku, setAltSku, refreshAltProduct, canSwap }
}

export default function BuyTogether(props) {
	const { product, onCartFeedback = () => { } } = props
	const { cart, addItem, updateItemQuantity } = useLocalShoppingCart()
	const [isLoading, setIsLoading] = useState(false)
	const [mainSelectionComplete, setMainSelectionComplete] = useState(false)
	const [altSelectionComplete, setAltSelectionComplete] = useState(false)
	const [mainKitItems, setMainKitItems] = useState([])
	const [altKitItems, setAltKitItems] = useState([])
	const state = useBuyTogetherState(product)

	useEffect(() => {
		setMainSelectionComplete(false)
		setAltSelectionComplete(false)
		setMainKitItems([])
		setAltKitItems([])
	}, [product?.productId])

	const handleRefreshAltProduct = useCallback(() => {
		state.refreshAltProduct()
		setAltSelectionComplete(false)
		setAltKitItems([])
	}, [state.refreshAltProduct])

	if (!state?.mainProduct || !state?.mainSku || !state?.altProduct || !state?.altSku) return null

	const bothSelectionsComplete = mainSelectionComplete && altSelectionComplete

	const mainPrice = state.mainSku?.sellers?.[0]?.commertialOffer?.Price || 0
	const altPrice = state.altSku?.sellers?.[0]?.commertialOffer?.Price || 0
	const totalPrice = mainPrice + altPrice

	const formattedTotalPrice = formatPrice(totalPrice)

	const addOrIncrement = async (sku) => {
		const qty = sku?.quantity || 1
		const cartItemIndex = cart?.items?.findIndex((cartItem) => String(cartItem?.id) === String(sku?.itemId)) ?? -1
		if (cartItemIndex > -1) {
			const cartItem = cart?.items?.[cartItemIndex]
			return updateItemQuantity(cartItemIndex, (cartItem?.quantity || 0) + qty)
		}
		return addItem(sku)
	}

	const addSkusToCart = async (skus) => {
		for (const sku of skus) {
			const result = await addOrIncrement(sku)
			if (!result) return false
		}
		return true
	}

	const handleBuyTogether = async () => {
		if (!bothSelectionsComplete) return
		setIsLoading(true)
		try {
			const mainSkus = mainKitItems.length > 0 ? mainKitItems : [state.mainSku]
			const altSkus = altKitItems.length > 0 ? altKitItems : [state.altSku]

			const mainOk = await addSkusToCart(mainSkus)
			const altOk = await addSkusToCart(altSkus)

			if (!mainOk || !altOk) {
				onCartFeedback('Nao foi possivel adicionar à sacola', 'error')
				return
			}
			onCartFeedback('Adicionado à sacola com sucesso!')
		} catch {
			onCartFeedback('Nao foi possivel adicionar à sacola', 'error')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<View className='flex flex-col gap-8'>
			{/* Title */}
			<View className='flex flex-col gap-2 font-serif text-[22px] leading-none text-primary'>
				<Text>
					Complete o <Text className='italic'>look</Text>
				</Text>
				<Text className='font-sans text-sm'>Sinta a experiência HOPE completa.</Text>
			</View>

			{/* Items */}
			<View className='flex flex-col gap-4'>
				{/* Main Item */}
				<BuyTogetherItem
					variant='main'
					state={state}
					onCartFeedback={onCartFeedback}
					onSelectionCompleteChange={setMainSelectionComplete}
					onKitItemsChange={setMainKitItems}
				/>

				{/* Separator */}
				<Text className='text-center text-2xl font-semibold text-primary'>+</Text>

				{/* Alt Item */}
				<BuyTogetherItem
					variant='alt'
					state={{ ...state, refreshAltProduct: handleRefreshAltProduct }}
					onCartFeedback={onCartFeedback}
					onSelectionCompleteChange={setAltSelectionComplete}
					onKitItemsChange={setAltKitItems}
				/>

				{/* Separator */}
				<Text className='text-center text-2xl font-semibold text-primary'>=</Text>

				{/* Total Price */}
				<View className='flex flex-col items-center gap-4 text-primary'>
					<Text className='font-sans text-base leading-none'>Leve os 2 produtos por:</Text>
					<Text className='text-[32px] font-semibold leading-none'>{formattedTotalPrice}</Text>
				</View>

				{/* Button */}
				<View
					onClick={bothSelectionsComplete ? handleBuyTogether : undefined}
					className={`flex h-12 items-center justify-center rounded-lg ${bothSelectionsComplete ? 'bg-primary cursor-pointer' : 'bg-gray-300'}`}>
					<Text className={`text-center text-sm font-semibold leading-none ${bothSelectionsComplete ? 'text-white' : 'text-gray-500'}`}>
						{isLoading ? <Loading /> : bothSelectionsComplete ? 'Comprar junto' : 'Selecione as opções'}
					</Text>
				</View>
			</View>
		</View>
	)
}

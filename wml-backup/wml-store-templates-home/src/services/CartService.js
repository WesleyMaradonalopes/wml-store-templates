import { Vtex } from 'eitri-shopping-vtex-shared'
import { trackAddToCart } from './TrackingService'

export const getCart = async () => {
	try {
		return await Vtex.cart.getCurrentOrCreateCart()
	} catch (error) {
		console.log('Erro ao buscar carrinho', error)
	}
}

export const addItemToCart = async (skuItem) => {
	try {
		const cart = await Vtex.cart.addItem(skuItem)
		trackAddToCart(skuItem, skuItem.quantity || 1)
		return cart
	} catch (error) {
		console.error('Erro ao adicionar item ao carrinho', error)
	}
}

export const changeItemQuantity = async (index, newQuantity) => {
	try {
		return await Vtex.cart.changeItemQuantity(index, newQuantity)
	} catch (error) {
		console.error('Erro ao alterar quantidade do item no carrinho', error)
	}
}

export const removeCartItem = async (index) => {
	try {
		return await Vtex.cart.removeItem(index)
	} catch (error) {
		console.error('Erro ao remover item ao carrinho', error)
	}
}

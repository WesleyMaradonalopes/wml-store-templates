import { Vtex } from 'eitri-shopping-vtex-shared'

import { crashLog } from './trackingService'

export const getCart = async () => {
	try {
		return await Vtex.cart.getCurrentOrCreateCart()
	} catch (error) {
		console.error('Erro ao buscar carrinho', error)
		crashLog('Erro ao buscar carrinho', error)
	}
}

export const addItemToCart = async (item) => {
	try {
		return await Vtex.cart.addItem(item)
	} catch (error) {
		console.error('Erro ao adicionar item ao carrinho', error)
		// crashLog('Erro ao adicionar item ao carrinho', error)
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
		console.error('Erro ao remover item do carrinho', error)
		crashLog('Erro ao remover item do carrinho', error)
	}
}

export const saveCartIdOnStorage = async (cartId) => {
	return Vtex.cart.saveCartIdOnStorage(cartId)
}

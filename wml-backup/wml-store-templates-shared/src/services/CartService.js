import { Vtex } from 'eitri-shopping-vtex-shared'

export const getCart = async () => {
	try {
		return await Vtex.cart.getCurrentOrCreateCart()
	} catch (error) {
		console.log('Erro ao buscar carrinho', error)
	}
}

export const addItemToCart = async (skuItem) => {
	try {
		return await Vtex.cart.addItem(skuItem)
	} catch (error) {
		console.error('Erro ao adicionar item ao carrinho', error)
	}
}

export const removeCartItem = async (index) => {
	try {
		return await Vtex.cart.removeItem(index)
	} catch (error) {
		console.error('Erro ao remover item ao carrinho', error)
	}
}

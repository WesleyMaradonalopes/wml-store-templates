import Eitri from 'eitri-bifrost'
import { createContext, useContext, useEffect, useState } from 'react'
import { CART_UPDATED_CHANNEL, resolveTabBadge } from 'wml-store-templates-shared'

import {
	addItem,
	addUserData,
	generateNewCart,
	getCart,
	removeClientData,
	removeItemFromCart,
	selectPaymentOption,
} from '../services/cartService'
import setFreight, {
	setLogisticInfo,
	setNewAddress,
	setShippingAddress,
	updateAddress,
} from '../services/freigthService'

const LocalCart = createContext({})

export default function CartProvider({ children }) {
	const [cart, setCart] = useState(null)
	const [cartIsLoading, setCartIsLoading] = useState(null)
	const [selectedPaymentData, setSelectedPaymentData] = useState()
	const [cardInfo, setCardInfo] = useState()

	useEffect(() => {
		Eitri.eventBus.subscribe({
			channel: CART_UPDATED_CHANNEL,
			broadcast: true,
			persistBetweenNavigations: true,
			callback: (data) => {
				if (data?.cart) setCart(data.cart)
				if (data?.totalQuantity !== undefined) resolveTabBadge(data.totalQuantity)
			},
		})
	}, [])

	const executeCartOperation = async (operation, ...args) => {
		setCartIsLoading(true)
		const newCart = await operation(...args)
		setCart(newCart)
		const totalQuantity = newCart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0
		resolveTabBadge(totalQuantity)
		Eitri.eventBus.publish({
			channel: CART_UPDATED_CHANNEL,
			data: { cart: newCart, totalQuantity },
			broadcast: true,
		})
		setCartIsLoading(false)
		return newCart
	}

	const startCart = async () => {
		return executeCartOperation(getCart)
	}

	const _generateNewCart = async () => {
		return executeCartOperation(generateNewCart)
	}

	const _addItem = async (payload) => {
		const newCart = await executeCartOperation(addItem, payload)
		return newCart
	}

	const addPersonalData = async (userData, orderFormId) => {
		return executeCartOperation(addUserData, userData, orderFormId)
	}

	const _updateAddress = async (selectedAddresses) => {
		return executeCartOperation(updateAddress, cart, zipCode)
	}

	const _setFreight = async (option) => {
		return executeCartOperation(setFreight, option)
	}

	const _setNewAddress = async (address) => {
		return executeCartOperation(setNewAddress, address)
	}

	const addCustomerData = async (userData, orderFormId) => {
		return executeCartOperation(addUserData, userData, orderFormId)
	}

	const _selectPaymentOption = async (payload) => {
		if (cart?.paymentData?.giftCards?.length > 0) {
			await selectPaymentOption({
				payments: [],
				giftCards: [],
			})
		}
		return executeCartOperation(selectPaymentOption, payload)
	}

	const _setShippingAddress = async (payload) => {
		return executeCartOperation(setShippingAddress, payload)
	}

	const _removeClientData = async (payload) => {
		return executeCartOperation(removeClientData, payload)
	}

	const _setLogisticInfo = async (payload) => {
		return executeCartOperation(setLogisticInfo, payload)
	}

	const _removeCartItem = async (index) => {
		const newCart = await executeCartOperation(removeItemFromCart, index)
		return newCart
	}

	const setPaymentOption = async (payload) => {
		return executeCartOperation(selectPaymentOption, payload)
	}

	return (
		<LocalCart.Provider
			value={{
				cart,
				setCart,
				addPersonalData,
				startCart,
				setFreight: _setFreight,
				setNewAddress: _setNewAddress,
				updateAddress: _updateAddress,
				addCustomerData,
				selectPaymentOption: _selectPaymentOption,
				setShippingAddress: _setShippingAddress,
				removeClientData: _removeClientData,
				setLogisticInfo: _setLogisticInfo,
				removeCartItem: _removeCartItem,
				setPaymentOption: setPaymentOption,
				generateNewCart: _generateNewCart,
				addItem: _addItem,
				selectedPaymentData,
				setSelectedPaymentData,
				cartIsLoading,
				cardInfo,
				setCardInfo,
			}}>
			{children}
		</LocalCart.Provider>
	)
}

export function useLocalShoppingCart() {
	const context = useContext(LocalCart)

	return context
}

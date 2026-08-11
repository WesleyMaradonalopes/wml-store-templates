import { useEffect, useState } from 'react'
import { View, Image } from 'eitri-luminus'

import whatsapp from '../../assets/images/whatsapp.svg'
import cashback from '../../assets/images/cashback.svg'
import AddToCart from './AddToCart'
import { openLink } from '../../services/productService'
import Eitri from 'eitri-bifrost'

export default function BuySection(props) {
	const {
		product,
		currentSku,
		kitState,
		requiredVariationNames = [],
		isSkuSelectionComplete = true,
		onCartFeedback = () => {}
	} = props
	const [cashbackFormated, setCashbackFormated] = useState('R$ 0,00')
	const [cashbackRaw, setCashbackRaw] = useState(null)
	const seller = currentSku?.sellers?.find((s) => s.sellerDefault)
	const price = seller?.commertialOffer?.Price ?? 0

	useEffect(() => {
		Eitri.environment.getRemoteConfigs().then((rc) => {
			setCashbackRaw(rc?.appConfigs?.cashbackInfo)
		})
	}, [])

	useEffect(() => {
		if (!cashbackRaw) return

		const isPercent = String(cashbackRaw).includes('%')
		const value = parseFloat(cashbackRaw)

		if (isPercent) {
			const cashbackValue = price * (value / 100)
			setCashbackFormated(cashbackValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
		} else {
			setCashbackFormated(value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
		}
	}, [price, cashbackRaw])

	const { productName, productReference } = product ?? {}

	return (
		<View className='flex flex-col gap-3 px-[34px] pb-[16px]'>
			{/* Add to cart button */}
			<AddToCart
				currentSku={currentSku}
				requiredVariationNames={requiredVariationNames}
				isSkuSelectionComplete={isSkuSelectionComplete}
				kitState={kitState}
				onCartFeedback={onCartFeedback}
			/>
		</View>
	)
}

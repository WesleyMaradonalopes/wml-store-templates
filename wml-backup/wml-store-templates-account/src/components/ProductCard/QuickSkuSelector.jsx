import { View, Text } from 'eitri-luminus'

import { useEffect, useState } from 'react'

export default function QuickSkuSelector(props) {
	const { product, currentSku, onSkuChange, onInteraction } = props
	const [hasInteracted, setHasInteracted] = useState(false)
	const [skuVariations, setSkuVariations] = useState([])

	useEffect(() => {
        setHasInteracted(false)
    }, [])

	useEffect(() => {
		if (!product?.items?.length) return

		const selectedVariations = product.items.reduce((acc, item) => {
			if (!item?.variations?.length) return acc
			const isAvailable = item.sellers?.some(
				(seller) => seller.commertialOffer?.AvailableQuantity > 0,
			)

			item.variations.forEach((variation) => {
				const normalizedVariation =
					typeof variation === 'string' ? { name: variation, values: item[variation] } : variation

				const { name, values } = normalizedVariation || {}
				if (!name || !values?.[0]) return

				let existingVariation = acc.find((v) => v.name === name)

				if (!existingVariation) {
					existingVariation = {
						name,
						values: [],
					}
					acc.push(existingVariation)
				}

				const valueExists = existingVariation.values.some((v) => v.name === values[0])
				if (!valueExists) {
					existingVariation.values.push({
						name: values[0],
						available: isAvailable,
					})
				} else {
					const existingValue = existingVariation.values.find((v) => v.name === values[0])
					if (isAvailable) {
						existingValue.available = true
					}
				}
			})

			return acc
		}, [])

		setSkuVariations(selectedVariations || [])
	}, [product])

	const handleSkuChange = (skuName, valueName, isAvailable) => {
		if (!isAvailable) return

		if (!hasInteracted) {
			setHasInteracted(true)
			onInteraction?.()
		}

		if (!currentSku) return

		const variationOfCurrentSku = currentSku.variations.map((variation) => {
			const normalizedVariation =
				typeof variation === 'string' ? { name: variation, values: currentSku[variation] } : variation

			const { name, values } = normalizedVariation || {}

			return {
				variation: name,
				value: values?.[0] || null,
			}
		})

		const newDesiredVariation = variationOfCurrentSku.map((variation) =>
			variation.variation === skuName ? { variation: skuName, value: valueName } : variation,
		)

		onSkuChange(newDesiredVariation)
	}

	const isCurrentSku = (skuName, valueName) => {
		if (!hasInteracted) return false
		return currentSku?.variations?.some(
			(variation) => variation?.name === skuName && variation?.values?.[0] === valueName,
		)
	}

	const isSkuOptionAvailable = (skuName, valueName) => {
		if (!hasInteracted || !currentSku?.variations) {
			const variation = skuVariations?.find((v) => v.name === skuName)
			const value = variation?.values?.find((v) => v.name === valueName)
			return value?.available !== false
		}

		const otherSelectedVariations = currentSku.variations
			.map((variation) => {
				const normalized =
					typeof variation === 'string' ? { name: variation, values: currentSku[variation] } : variation
				return { variation: normalized.name, value: normalized.values?.[0] }
			})
			.filter((v) => v.variation !== skuName && v.value)

		return (
			product?.items?.some((item) => {
				const isAvailable = item.sellers?.some(
					(seller) => seller.commertialOffer?.AvailableQuantity > 0,
				)
				if (!isAvailable) return false

				const itemVariations = item.variations?.map((variation) =>
					typeof variation === 'string' ? { name: variation, values: item[variation] } : variation,
				)

				const matchesDesired = itemVariations?.some(
					(v) => v.name === skuName && v.values?.[0] === valueName,
				)
				if (!matchesDesired) return false

				return otherSelectedVariations.every((selVar) =>
					itemVariations?.some((v) => v.name === selVar.variation && v.values?.[0] === selVar.value),
				)
			}) ?? false
		)
	}

	if (!(skuVariations?.length > 0)) {
		return null
	}

	const getVariationOrder = (name = '') => {
		const normalizedName = String(name).toLowerCase()
		if (normalizedName === 'tamanho') return 1
		if (normalizedName === 'taça' || normalizedName === 'taca') return 2
		return 3
	}

	return (
		<View className='flex w-full flex-col gap-4 font-sans'>
			{[...skuVariations]
				.sort((a, b) => getVariationOrder(a.name) - getVariationOrder(b.name))
				?.filter((sku) => sku?.values?.length > 1)
				?.map((sku) => (
					<View
						key={sku?.name}
						className='flex flex-col gap-2'>
						<View className='flex items-center'>
							<Text className='text-xs font-semibold leading-none'>{`${sku?.name}:`}</Text>
							<Text className='ml-1 text-xs leading-none'>
								{hasInteracted
									? currentSku?.variations?.find((variation) => variation?.name === sku?.name)?.values?.[0] || ''
									: ''}
							</Text>
						</View>

						<View className='flex flex-wrap gap-2'>
							{sku?.values?.map((value) => {
								const isSelected = isCurrentSku(sku.name, value.name)
								const isAvailable = isSkuOptionAvailable(sku.name, value.name)
								return (
									<View
										key={`${sku?.name}-${value?.name}`}
										onClick={() => handleSkuChange(sku.name, value.name, isAvailable)}
										data-selected={isSelected ? '' : undefined}
										data-unavailable={!isAvailable ? '' : undefined}
										className='
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
										'>
										<Text className='data-[unavailable]:text-[#D2C9C0]'>{value.name}</Text>
									</View>
								)
							})}
						</View>
					</View>
				))}
		</View>
	)
}

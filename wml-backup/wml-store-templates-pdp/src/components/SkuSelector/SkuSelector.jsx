import { sortSku } from '../../utils/skuSort'

import { useMemo } from 'react'

import { Text, View } from 'eitri-luminus'

function getVariationOrder(name = '') {
	const normalizedName = String(name).toLowerCase()

	if (normalizedName === 'tamanho') return 1
	if (normalizedName === 'taça' || normalizedName === 'taca') return 2
	return 3
}

export default function SkuSelector(props) {
	const { product, currentSku, selectedVariations = [], onSkuChange, showLabel, onTacaInfoClick, onUnavailableSkuClick } = props
	const { items = [] } = product ?? {}
	const referenceSku = currentSku || items[0]
	const hasUniversalSize = referenceSku?.variations?.some((variation) => {
		const normalizedVariation =
			typeof variation === 'string' ? { name: variation, values: referenceSku?.[variation] } : variation

		return normalizedVariation?.name === 'Tamanho' && normalizedVariation?.values?.[0] === 'TU'
	})

	if (hasUniversalSize) {
		return null
	}

	const skuVariations = useMemo(() => {
		return items.reduce((acc, item) => {
			if (!item.variations?.length) return acc

			const available = item.sellers.some((seller) => seller.commertialOffer?.AvailableQuantity > 0)

			item.variations.forEach((variation) => {
				// Normaliza a variação para formato objeto padrão
				const normalizedVariation =
					typeof variation === 'string' ? { name: variation, values: item[variation], available } : variation

				const { name, values } = normalizedVariation
				if (!name || !values?.[0]) return // Guard clause para dados inválidos

				// Busca variação existente no acumulador
				let existingVariation = acc.find((v) => v.name === name)

				if (!existingVariation) {
					// Cria nova variação se não existir
					existingVariation = {
						name,
						values: [],
						available,
					}
					acc.push(existingVariation)
				}

				// Adiciona valor se não existir
				const valueExists = existingVariation.values.some((v) => v.name === values[0])
				if (!valueExists) {
					existingVariation.values.push({
						name: values[0],
						available,
					})
				} else if (available) {
					const existingValue = existingVariation.values.find((value) => value.name === values[0])
					existingValue.available = true
				}
			})

			return acc
		}, [])
	}, [product])

	const visibleVariations = skuVariations
		.filter(({ values = [] }) => values.length > 1)
		.sort((a, b) => getVariationOrder(a.name) - getVariationOrder(b.name))

	const normalizeVariation = (item, variation) => {
		return typeof variation === 'string' ? { name: variation, values: item?.[variation] } : variation
	}

	const isSkuAvailable = (item) => {
		return item?.sellers?.some((seller) => seller.commertialOffer?.AvailableQuantity > 0)
	}

	const skuMatchesVariations = (item, desiredVariations = []) => {
		if (!desiredVariations.length) return true

		return desiredVariations.every((desiredVariation) =>
			item.variations?.some((variation) => {
				const normalizedVariation = normalizeVariation(item, variation)
				return (
					normalizedVariation?.name === desiredVariation.variation &&
					normalizedVariation?.values?.[0] === desiredVariation.value
				)
			}),
		)
	}

	const hasAvailableSkuForVariations = (desiredVariations = []) => {
		return items.some((item) => skuMatchesVariations(item, desiredVariations) && isSkuAvailable(item))
	}

	const getFirstSkuForVariations = (desiredVariations = []) => {
		return items.find((item) => skuMatchesVariations(item, desiredVariations))
	}

	const getOtherSelectedVariations = (skuName) => {
		return selectedVariations.filter((selectedVariation) => selectedVariation?.variation !== skuName)
	}

	const isVariationValueAvailable = (skuName, valueName) => {
		return hasAvailableSkuForVariations([
			...getOtherSelectedVariations(skuName),
			{ variation: skuName, value: valueName },
		])
	}

	const handleSkuChange = (skuName, valueName, available) => {
		const otherSelectedVariations = getOtherSelectedVariations(skuName)

		if (!available) {
			if (typeof onUnavailableSkuClick === 'function') {
				const unavailableSku = getFirstSkuForVariations([
					...otherSelectedVariations,
					{ variation: skuName, value: valueName },
				])
				const selectedSeller = unavailableSku?.sellers?.[0]

				onUnavailableSkuClick({
					variationName: skuName,
					valueName,
					skuId: unavailableSku?.itemId,
					sellerId: selectedSeller?.sellerId,
					sellerName: selectedSeller?.sellerName,
				})
			}
			return
		}

		const isSelected = isCurrentSku(skuName, valueName)
		const nextSelectedVariations = isSelected
			? otherSelectedVariations
			: [...otherSelectedVariations, { variation: skuName, value: valueName }]

		onSkuChange(nextSelectedVariations)
	}

	const isCurrentSku = (skuName, valueName) => {
		return selectedVariations.some(
			(variation) => variation?.variation === skuName && variation?.value === valueName,
		)
	}

	const renderOption = (skuName, valueName) => {
		const available = isVariationValueAvailable(skuName, valueName)

		return (
			<View
				key={valueName}
				onClick={() => handleSkuChange(skuName, valueName, available)}
				data-selected={isCurrentSku(skuName, valueName) ? '' : undefined}
				data-unavailable={!available ? '' : undefined}
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
				<Text>{valueName}</Text>
			</View>
		)
	}

	if (visibleVariations.length === 0) return null

	return (
		<View className={`flex w-full gap-4 flex-col font-sans`}>
			{visibleVariations.map(({ name, values = [] }) => {
				const normalizedVariationName = String(name).toLowerCase()
				const isCupVariation = normalizedVariationName === 'taça' || normalizedVariationName === 'taca'
				const shouldShowVariationLabel =
					showLabel &&
					(normalizedVariationName === 'tamanho' ||
						normalizedVariationName === 'taça' ||
						normalizedVariationName === 'taca')
				const selectedVariationLabel =
					selectedVariations.find(
						(item) => String(item?.variation).toLowerCase() === normalizedVariationName,
					)?.value ?? ''

				return (
					<View
						key={name}
						className='flex flex-col gap-2'>
						<View className='flex items-center'>
							{shouldShowVariationLabel && <Text className='text-xs font-semibold leading-none'>{`${name}:`}</Text>}
							{shouldShowVariationLabel && selectedVariationLabel && (
								<Text className='ml-1 text-xs leading-none'>{`${selectedVariationLabel}`}</Text>
							)}
							{shouldShowVariationLabel && isCupVariation && (
								<View
									onClick={onTacaInfoClick}
									className='ml-0.5 flex h-4 w-4 items-center justify-center'>
									<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
										<path
											d='M8 11.3267V11.3334M8 9.33333C8 8 10 8 10 6.60606C10 5.53496 9.12225 4.66667 8 4.66667C7.05317 4.66667 6.22557 5.28474 6 6.12121M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z'
											stroke='#1E120D'
											strokeWidth='0.75'
											strokeLinecap='round'
										/>
									</svg>
								</View>
							)}
						</View>
						<View className='flex flex-wrap gap-2'>
							{sortSku(values)?.map((value) => renderOption(name, value.name))}
						</View>
					</View>
				)
			})}
		</View>
	)
}

import { useTranslation } from 'eitri-i18n'

import { CustomButton, CustomInput } from 'wml-store-templates-shared'

import fetchFreight from '../../services/freightService'
import { loadPostalCodeFromStorage, savePostalCodeOnStorage } from '../../services/customerService'
import FreightInput from './FreightInput'
import FreightButton from './FreightButton'

export default function Freight(props) {
	const { currentSku } = props
	const { t } = useTranslation()

	const [zipCode, setZipCode] = useState('')
	const [freightOptions, setFreightOptions] = useState(null)
	const [loading, setLoading] = useState(false)
	const [hasInvalidZipCode, setHasInvalidZipCode] = useState(false)
	const [hasValidCalculatedZipCode, setHasValidCalculatedZipCode] = useState(false)

	useEffect(() => {
		loadPostalCodeFromStorage()
			.then((postalCode) => {
				if (postalCode) {
					setZipCode(postalCode)
					setHasValidCalculatedZipCode(isValidZipCode(postalCode))
					handleFreight(postalCode)
				}
			})
			.catch()
	}, [])

	const onInputZipCode = (e) => {
		if (hasValidCalculatedZipCode) return

		const value = e.target.value
		setZipCode(value)
		setHasInvalidZipCode(false)
		setHasValidCalculatedZipCode(false)
	}

	const isValidZipCode = (value) => {
		const zipCodeNumbers = String(value || '').replace(/\D/g, '')

		return zipCodeNumbers.length === 8
	}

	const handleFreight = async (zipCode) => {
		if (loading) return

		if (!isValidZipCode(zipCode)) {
			setHasInvalidZipCode(true)
			setHasValidCalculatedZipCode(false)
			setFreightOptions(null)
			return
		}

		setHasInvalidZipCode(false)
		setHasValidCalculatedZipCode(true)

		setLoading(true)

		try {
			const freightOpt = await fetchFreight(zipCode, currentSku)

			setFreightOptions(freightOpt)

			await savePostalCodeOnStorage(zipCode)
		} catch (error) {
			console.error('Error handleFreight', error)
		}

		setLoading(false)
	}

	const handleRemoveZipCode = async () => {
		setZipCode('')
		setFreightOptions(null)
		setHasInvalidZipCode(false)
		setHasValidCalculatedZipCode(false)

		try {
			await savePostalCodeOnStorage('')
		} catch (error) {
			console.error('Error clearing postal code from storage', error)
		}
	}

	const clearZipCodeIcon = (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
				stroke="#575756"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)

	const formatShippingEstimateDate = (shippingEstimateDate) => {
		if (!shippingEstimateDate) return ''

		const date = new Date(shippingEstimateDate)
		if (Number.isNaN(date.getTime())) return ''

		const day = String(date.getUTCDate()).padStart(2, '0')
		const months = [
			'Janeiro',
			'Fevereiro',
			'Março',
			'Abril',
			'Maio',
			'Junho',
			'Julho',
			'Agosto',
			'Setembro',
			'Outubro',
			'Novembro',
			'Dezembro',
		]
		const month = months[date.getUTCMonth()]

		return `${day} de ${month}`
	}

	return (
		<View className="flex w-full flex-col px-4 pt-4">
			<Text className="font-serif mb-4 text-[16px] font-normal leading-[22px] text-[#0F0805]">
				Calcule o frete e prazo de entrega
			</Text>

			<View className="flex w-full items-stretch">
				<View className="w-2/3">
				<FreightInput
					placeholder={t('freight.labelZipCode')}
					value={zipCode}
					variant="mask"
					mask="99999-999"
					inputMode="numeric"
					onChange={onInputZipCode}
					className={hasInvalidZipCode ? 'text-[#C42C21]' : ''}
					showRightIcon={hasValidCalculatedZipCode}
					rightIcon={clearZipCodeIcon}
					onRightIconClick={handleRemoveZipCode}
					readOnly={hasValidCalculatedZipCode}
				/>
				{hasInvalidZipCode && (
					<Text className="mt-1 text-[12px] font-normal text-[#C42C21]">CEP inválido</Text>
				)}
				</View>

			<View className="w-[120px]">
				<FreightButton
					label="Calcular"
					onClick={() => handleFreight(zipCode)}
					className={`
						h-[40px]
						w-[120px]
						rounded-l-nonez
						rounded-r-[8px]
						border-0
						bg-[#0F0805]
						text-[14px]
						font-semibold
						text-white
						flex
						items-center
						justify-center
					`}
				/>
			</View>
			</View>

			{loading && (
				<View className="mt-4 h-[100px] w-full animate-pulse rounded bg-gray-200" />
			)}

			{!loading &&
				freightOptions &&
				freightOptions?.options?.length > 0 && (
					<View className="mt-4 flex flex-col gap-2">
						{freightOptions.options
							.filter((item) => !item?.isPickupInPoint)
							.map((item) => (
							<View
								key={item?.id}
								className="flex w-full flex-col py-[5.5px]"
							>
								<View className="flex w-full items-center justify-between">
									<Text className="text-[14px] font-medium text-[#0F0805]">
										{item?.pickupStoreInfo?.isPickupStore
											? item?.pickupStoreInfo?.friendlyName
											: item?.name}
									</Text>

									<Text className="text-[12px] font-normal text-[#575756]">
										Receberá até {formatShippingEstimateDate(item?.shippingEstimateDate)}
									</Text>

									<Text className="text-[12px] font-semibold text-[#0F0805]">
										{item?.formatedPrice}
									</Text>
								</View>

							</View>
						))}
					</View>
				)}
		</View>
	)
}

import { useTranslation } from 'eitri-i18n'
import { Skeleton, Text, View } from 'eitri-luminus'

export default function ShippingMethods(props) {
	const { onSelectFreightOption, options, loading = false, ...rest } = props

	const { t } = useTranslation()

	const handleMethodChange = (option) => {
		onSelectFreightOption(option)
	}

	if (!options || options.length === 0) {
		return null
	}

	return (
		<View {...rest}>
			<View className='flex flex-col gap-3'>
				{options.map((option) => (
					<View key={option.label}>
						{loading ? (
							<Skeleton className='h-[40px] w-full' />
						) : (
							<ShippingMethodCard
								option={option}
								isSelected={!!option.isCurrent}
								onClick={() => handleMethodChange(option)}
							/>
						)}
					</View>
				))}
			</View>
		</View>
	)
}

function ShippingMethodCard({ option, isSelected = false, onClick }) {
	return (
		<View
			className={`cursor-pointer rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md ${
				isSelected ? 'border-2 border-primary' : 'border-neutral-300 bg-base-100 hover:border-primary/30'
			}`}
			onClick={onClick}>
			<View className='p-4'>
				<View className='flex flex-row items-start justify-between'>
					<View className='flex flex-1 flex-col gap-1'>
						<Text className='mb-1 text-base font-semibold text-base-content'>{option.label}</Text>

						<Text className='mb-1 text-sm text-base-content/70'>{option?.shippingEstimate}</Text>
					</View>

					<View className='flex flex-col items-end gap-1'>
						<Text className='text-lg font-semibold text-base-content'>{option.price}</Text>

						{isSelected && (
							<View className='flex h-6 w-6 items-center justify-center rounded-full bg-primary'>
								<svg
									width='12'
									height='12'
									viewBox='0 0 16 16'
									fill='none'
									xmlns='http://www.w3.org/2000/svg'>
									<path
										d='M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z'
										fill='white'
									/>
								</svg>
							</View>
						)}
					</View>
				</View>
			</View>
		</View>
	)
}

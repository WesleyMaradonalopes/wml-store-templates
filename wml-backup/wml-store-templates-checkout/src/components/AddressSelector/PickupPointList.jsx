import { Loading, Skeleton, Text, View } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

export default function PickupPointList({ options, onSelectFreightOption, loading }) {
	const { t } = useTranslation()

	if (!options && loading) {
		return (
			<View className='flex flex-col gap-3'>
				{[1, 2, 3].map((i) => (
					<Skeleton
						key={i}
						className='mb-2 h-[72px] w-full rounded-lg'
					/>
				))}
			</View>
		)
	}

	if (!options) {
		return (
			<View className='flex flex-col items-center justify-center py-8'>
				<Loading />
			</View>
		)
	}

	if (options.length === 0 && !loading) {
		return (
			<View className='py-8 text-center'>
				<Text className='text-base-content/50'>
					{t('addressSelector.noPickupPoints', 'Nenhum ponto de retirada disponível')}
				</Text>
			</View>
		)
	}

	const currentSelectedOption = options?.find((option) => option.isCurrent)

	const handlePickupChange = (option) => {
		onSelectFreightOption(option)
	}

	return (
		<View>
			<View className='mb-4 flex flex-col gap-1'>
				<Text className='text-lg font-bold text-base-content'>
					{t('addressSelector.pickupTitle', 'Pontos de Retirada')}
				</Text>
				<Text className='mt-1 text-sm text-base-content/70'>
					{t('addressSelector.pickupSubtitle', 'Selecione um ponto de retirada')}
				</Text>
			</View>

			<View className='flex flex-col gap-3'>
				{loading
					? [1, 2, 3].map((i) => (
							<Skeleton
								key={i}
								className='mb-2 h-[72px] w-full rounded-lg'
							/>
						))
					: options.map((option, index) => (
							<PickupPointCard
								key={option.label || index}
								option={option}
								isSelected={!!option.isCurrent}
								onClick={() => handlePickupChange(option)}
							/>
						))}
			</View>
		</View>
	)
}

function PickupPointCard({ option, isSelected = false, onClick }) {
	// Exibe um cartão de ponto de retirada, destacando visualmente se está selecionado
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
						{option.address && (
							<Text className='mb-1 text-sm text-base-content/70'>{option?.address?.street}</Text>
						)}
					</View>
					<View className='flex flex-col items-end gap-1'>
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

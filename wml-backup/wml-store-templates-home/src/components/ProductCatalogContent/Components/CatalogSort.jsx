import { View, Text } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

import { useState } from 'react'

import { CustomButton } from 'wml-store-templates-shared'

import { LIST_ORDERING } from '../../../utils/lists'
import CustomModal from '../../CustomModal/CustomModal'

export default function CatalogSort(props) {
	const { currentSort, onSortChange } = props

	const [showModal, setShowModal] = useState(false)

	const { t } = useTranslation()

	const handleSortSelect = (sortValue) => {
		onSortChange(sortValue)
		setShowModal(false)
	}

	const getCurrentSortLabel = () => {
		const currentOption = LIST_ORDERING.values.find((option) => option.value === currentSort)
		return currentOption ? t(currentOption.name) : t('lists.labelRelevance')
	}

	return (
		<>
			<CustomButton
				onClick={() => setShowModal(true)}
				leftIcon={
					<svg
						xmlns='http://www.w3.org/2000/svg'
						width='16'
						height='16'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'
						strokeLinecap='round'
						strokeLinejoin='round'>
						<path d='M3 6h18' />
						<path d='M7 12h10' />
						<path d='M10 18h4' />
					</svg>
				}
				label={getCurrentSortLabel()}
			/>

			<CustomModal
				open={showModal}
				onClose={() => setShowModal(false)}>
				<View
					bottomInset={'auto'}
					className='pointer-events-auto max-h-[70vh] w-full overflow-y-auto rounded-t bg-white p-4'>
					<Text className='text-lg font-semibold'>{t('lists.title')}</Text>

					<View className='mt-4 flex flex-col'>
						{LIST_ORDERING.values.map((option, index) => (
							<View
								key={option.value}
								onClick={() => handleSortSelect(option.value)}
								className={`flex cursor-pointer flex-row items-center justify-between p-4 transition-colors ${
									currentSort === option.value
										? 'border-l-4 border-primary bg-primary/10'
										: 'border-l-4 border-transparent'
								}`}>
								<Text
									className={`text-base ${
										currentSort === option.value ? 'font-medium text-primary' : 'text-gray-700'
									}`}>
									{t(option.name)}
								</Text>
								{currentSort === option.value && (
									<svg
										xmlns='http://www.w3.org/2000/svg'
										width='20'
										height='20'
										viewBox='0 0 24 24'
										fill='none'
										stroke='currentColor'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'
										className='text-primary'>
										<polyline points='20,6 9,17 4,12' />
									</svg>
								)}
							</View>
						))}
					</View>

					<View className='mb-4'>
						<CustomButton
							label='Cancelar'
							onClick={() => setShowModal(false)}
						/>
					</View>
				</View>
			</CustomModal>
		</>
	)
}

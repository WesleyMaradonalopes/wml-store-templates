import { Text, View } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

import { navigate } from '../../services/navigationService'

export default function AddressCard({ address, isSelected = false, onClick, showBusinessHours = false, title = null }) {
	const isPickupPoint = address?.friendlyName

	const { t } = useTranslation()

	const formatBusinessHours = (businessHours) => {
		if (!businessHours || businessHours.length === 0) return ''

		const today = new Date().getDay()

		const todayHours = businessHours.find((h) => h.DayOfWeek === today)
		if (todayHours) {
			return `Hoje: ${todayHours?.OpeningTime?.slice(0, 5)} - ${todayHours.ClosingTime.slice(0, 5)}`
		}

		return 'Horário disponível'
	}

	const editAddress = () => {
		navigate('AddressForm', { addressId: address.addressId })
	}

	return (
		<View
			className={`flex w-full flex-col rounded border border-gray-300 bg-white p-4 shadow-sm ${
				isSelected ? 'border-2 border-primary' : 'border-neutral-300 bg-base-100 hover:border-primary/30'
			}`}
			onClick={onClick}>
			<View className='flex flex-row items-start justify-between'>
				<View className='flex flex-1 flex-col gap-1'>
					{title && <Text className='mb-2 text-sm font-medium text-primary'>{title}</Text>}

					<Text className='mb-1 text-base font-semibold text-base-content'>
						{isPickupPoint ? address.friendlyName : address.street}
					</Text>

					<Text className='mb-1 text-sm text-base-content/70'>
						{isPickupPoint
							? `${address.address.street}, ${address.address.number}`
							: `${address.street} • ${address.number}`}
					</Text>

					<Text className='mb-1 text-sm text-base-content/70'>
						{isPickupPoint
							? `${address.address.neighborhood} • ${address.address.city}`
							: `${address.neighborhood} • ${address.city} • ${address.state}`}
					</Text>

					<Text className='mb-2 text-xs text-base-content/50'>
						{isPickupPoint ? address.address.postalCode : address.postalCode}
					</Text>

					{showBusinessHours && address.businessHours && (
						<Text className='text-xs font-medium text-primary'>
							{formatBusinessHours(address.businessHours)}
						</Text>
					)}

					<View
						onClick={editAddress}
						className='mt-2'>
						<Text className='text-primary-700 text-xs uppercase'>Editar</Text>
					</View>
				</View>

				{isSelected && (
					<View className='ml-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary'>
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
	)
}

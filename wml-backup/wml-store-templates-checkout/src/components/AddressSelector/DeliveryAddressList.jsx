import { View } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

import AddressCard from './AddressCard'

export default function DeliveryAddressList({ addresses, selectedAddress, onAddressSelect }) {
	const { t } = useTranslation()

	return (
		<View className='flex flex-col gap-3'>
			{addresses.length > 0 && (
				<>
					{addresses.map((address, index) => (
						<View key={address.id || index}>
							<AddressCard
								address={address}
								isSelected={selectedAddress?.addressId === address?.addressId}
								onClick={() => onAddressSelect(address)}
							/>
						</View>
					))}
				</>
			)}
		</View>
	)
}

import { View } from 'eitri-luminus'

import { openAccount } from '../../services/NavigationService'
import userIcon from '../../assets/account.svg'

export default function HeaderAccount({ onClick, transparent = false }) {
	const handlePress = () => {
		if (typeof onClick === 'function') {
			return onClick()
		}

		openAccount()
	}

	return (
		<View
			onClick={handlePress}
			className='flex h-6 w-6 items-center justify-center'>
			<Image
				src={userIcon}
				className='h-full w-full'
				style={transparent ? { filter: 'brightness(0) invert(1)' } : undefined}
			/>
		</View>
	)
}

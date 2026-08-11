import { View } from 'eitri-luminus'

import HeaderLogo from './HeaderLogo'
import HeaderSearchIcon from './HeaderSearchIcon'

export default function HeaderCenteredLogoBar({ onSearchClick, transparent = false, leftSlot = null }) {
	return (
		<View className='grid h-10 w-full grid-cols-[1fr_auto_1fr] items-center'>
			<View className='flex items-center justify-start'>{leftSlot}</View>

			<HeaderLogo transparent={transparent} />

			<View className='flex items-center justify-end'>
				{onSearchClick && <HeaderSearchIcon onClick={onSearchClick} />}
			</View>
		</View>
	)
}

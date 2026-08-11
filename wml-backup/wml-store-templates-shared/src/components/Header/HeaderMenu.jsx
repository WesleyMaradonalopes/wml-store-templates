import { View } from 'eitri-luminus'

import hamburgerIcon from '../../assets/hamburger.svg'

export default function HeaderMenu() {
	return (
		<View className='flex h-5 w-5 items-center justify-center'>
			<Image
				src={hamburgerIcon}
				className='h-full w-full'
			/>
		</View>
	)
}

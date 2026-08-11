import { Image, Text, View } from 'eitri-luminus'
import { useMemo } from 'react'

import cartIcon from '../../assets/add-to-cart-trigger.svg'
import { openCart } from '../../services/NavigationService'

export default function HeaderCart({ onClick, cart, transparent = false }) {


	const itemsQuantity = useMemo(() => cart?.items?.reduce((acc, item) => acc + item.quantity, 0), [cart])

	const handlePress = () => {
		if (onClick) return onClick()
		openCart()
	}

	return (
		<View
			className='relative flex h-6 w-[18px] items-center'
			onClick={handlePress}>
			<Image
				src={cartIcon}
				className='h-full w-full object-contain'
				style={transparent ? { filter: 'brightness(0) invert(1)' } : undefined}
			/>

			{itemsQuantity > 0 && (
				<View className='pointer-events-none absolute inset-x-0 bottom-0 top-[26%] flex items-center justify-center'>
					<Text className={`text-[9px] font-medium leading-none ${transparent ? 'text-white' : 'text-primary'}`}>
						{itemsQuantity}
					</Text>
				</View>
			)}
		</View>
	)
}

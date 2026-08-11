export default function CardSelector(props) {
	const {
		children,
		mainTitle,
		mainClickHandler,
		secondaryActionHandler,
		secondaryActionTitle,
		variant,
	} = props

	const isDeliveryVariant = variant === 'delivery'

	return (
		<View
			style={isDeliveryVariant ? { borderRadius: '16px' } : undefined}
			className={`border bg-white ${isDeliveryVariant ? 'border-[#EFEDEA] px-4 py-2' : 'mt-4 border-gray-300 p-4 shadow-sm rounded'}`}>
			<View
				onClick={mainClickHandler}
				className='flex flex-col'>
				<View className={`${isDeliveryVariant ? 'flex flex-row items-center justify-between gap-2 py-2' : 'mb-1 flex flex-row items-center justify-between gap-2'}`}>
					<Text className={isDeliveryVariant ? 'text-[14px] font-semibold leading-[100%] text-[#0F0805]' : 'block text-lg font-bold'}>{mainTitle}</Text>
					{isDeliveryVariant ? (
						<svg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
							<path d='M12.6663 8.00048C12.6664 8.05635 12.6562 8.11171 12.6361 8.16335C12.616 8.21498 12.5865 8.26186 12.5493 8.30132L6.01616 14.5418C5.97903 14.5813 5.93493 14.6127 5.88639 14.6341C5.83786 14.6555 5.78584 14.6666 5.7333 14.6666C5.68075 14.6667 5.62872 14.6557 5.58017 14.6343C5.53161 14.6129 5.48749 14.5815 5.45032 14.542C5.41315 14.5025 5.38366 14.4556 5.36353 14.404C5.3434 14.3524 5.33303 14.297 5.33301 14.2411C5.33298 14.1852 5.34331 14.1299 5.3634 14.0783C5.38349 14.0266 5.41294 13.9796 5.45007 13.9401L11.7005 7.99996L5.45007 2.05983C5.37507 1.97997 5.33296 1.87168 5.33301 1.75879C5.33305 1.6459 5.37525 1.53767 5.45032 1.45788C5.52539 1.3781 5.62718 1.33324 5.7333 1.33329C5.83941 1.33334 5.94116 1.37828 6.01616 1.45814L12.5493 7.69912C12.5866 7.73864 12.6161 7.78562 12.6362 7.83735C12.6563 7.88908 12.6665 7.94451 12.6663 8.00048Z' fill='#0F0805'/>
						</svg>
					) : (
						<svg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
							<path d='M9 18L15 12L9 6' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
						</svg>
					)}
				</View>
				<View className={isDeliveryVariant ? 'border-b border-[#ECE8E4] pb-1' : ''}>
					<View className={isDeliveryVariant ? 'flex flex-col text-[14px] font-medium leading-[150%] text-[#575756]' : ''}>
						{children}
					</View>
				</View>
			</View>

			{!isDeliveryVariant && <View className='my-4 border-b'></View>}

			<View onClick={secondaryActionHandler} className={isDeliveryVariant ? 'py-2' : ''}>
				<Text className={isDeliveryVariant ? 'text-[12px] font-normal leading-[150%] underline text-[#0F0805]' : 'font-bold text-primary'}>{secondaryActionTitle}</Text>
			</View>
		</View>
	)
}

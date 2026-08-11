import Eitri from 'eitri-bifrost'

export default function FreightInput(props) {
	const {
		icon,
		type,
		backgroundColor,
		width,
		label,
		height,
		onChange,
		value,
		className,
		onFocus,
		error,
		rightIcon,
		onRightIconClick,
		showRightIcon,
		rightIconClassName,
		...rest
	} = props

	const [showPassword, setShowPassword] = useState(false)

	const hasClearIcon = showRightIcon && rightIcon && type !== 'password'
	const normalizedValue = value == null ? '' : String(value)
	const inputHorizontalPadding = 12

	const handleFocus = (e) => {
		Eitri.keyboard.setVisibilityListener((status) => {
			if (status.code === 'keyboardDidShow') {
				e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
			}
			Eitri.keyboard.clearVisibilityListener()
		})

		e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })

		if (typeof onFocus === 'function') {
			onFocus(e)
		}
	}

	return (
		<View className='w-full'>
			{label && (
				<View className='mb-1'>
					<Text className='text-xs font-bold'>{label}</Text>
				</View>
			)}
			<View
				className='relative'>
				<TextInput
					className={`
						w-full
						border
						focus:outline-none
						placeholder:text-[14px]
    					placeholder:text-[#B0A69B]
						${type === 'password' ? 'pr-8' : ''}
						${className}
					`}
					style={{
						height: 40,
						borderColor: "#A49A8E",
						borderRightWidth: 0,
						borderTopLeftRadius: 8,
						borderBottomLeftRadius: 8,
						borderTopRightRadius: 0,
						borderBottomRightRadius: 0,
						paddingLeft: inputHorizontalPadding,
						paddingRight: hasClearIcon ? 38 : undefined,
					}}
					type={showPassword ? 'text' : type || 'text'}
					onChange={onChange}
					value={value}
					onFocus={handleFocus}
					{...rest}
				/>

				{type === 'password' && (
					<View
						onClick={() => setShowPassword(!showPassword)}
						className='absolute right-2 top-3 cursor-pointer'>
						{showPassword ? (
							<svg
								width='24'
								height='24'
								viewBox='0 0 24 24'
								fill='none'
								xmlns='http://www.w3.org/2000/svg'>
								<path
									d='M21.544 11.045C21.848 11.4713 22 11.6845 22 12C22 12.3155 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C7.31078 19 3.8221 14.8706 2.45604 12.955C2.15201 12.5287 2 12.3155 2 12C2 11.6845 2.15201 11.4713 2.45604 11.045C3.8221 9.12944 7.31078 5 12 5C16.6892 5 20.1779 9.12944 21.544 11.045Z'
									stroke='currentColor'
									strokeWidth='1.5'
									strokeLinecap='round'
									strokeLinejoin='round'
									className='text-gray-300'
								/>
								<path
									d='M15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12Z'
									stroke='currentColor'
									strokeWidth='1.5'
									strokeLinecap='round'
									strokeLinejoin='round'
									className='text-gray-300'
								/>
							</svg>
						) : (
							<svg
								width='24'
								height='24'
								viewBox='0 0 24 24'
								fill='none'
								xmlns='http://www.w3.org/2000/svg'>
								<path
									d='M19.439 15.439C20.3636 14.5212 21.0775 13.6091 21.544 12.955C21.848 12.5287 22 12.3155 22 12C22 11.6845 21.848 11.4713 21.544 11.045C20.1779 9.12944 16.6892 5 12 5C11.0922 5 10.2294 5.15476 9.41827 5.41827M6.74742 6.74742C4.73118 8.1072 3.24215 9.94266 2.45604 11.045C2.15201 11.4713 2 11.6845 2 12C2 12.3155 2.15201 12.5287 2.45604 12.955C3.8221 14.8706 7.31078 19 12 19C13.9908 19 15.7651 18.2557 17.2526 17.2526'
									stroke='currentColor'
									strokeWidth='1.5'
									strokeLinecap='round'
									strokeLinejoin='round'
									className='text-gray-300'
								/>
								<path
									d='M9.85786 10C9.32783 10.53 9 11.2623 9 12.0711C9 13.6887 10.3113 15 11.9289 15C12.7377 15 13.47 14.6722 14 14.1421'
									stroke='currentColor'
									strokeWidth='1.5'
									strokeLinecap='round'
									className='text-gray-300'
								/>
								<path
									d='M3 3L21 21'
									stroke='currentColor'
									strokeWidth='1.5'
									strokeLinecap='round'
									strokeLinejoin='round'
									className='text-gray-300'
								/>
							</svg>
						)}
					</View>
				)}

				{hasClearIcon && (
					<View
						className={`absolute top-1/2 -translate-y-1/2 flex flex-row items-center ${rightIconClassName || ''}`}
						style={rightIconClassName ? undefined : { left: inputHorizontalPadding }}>
						<Text className='text-[14px] whitespace-pre opacity-0'>
							{normalizedValue || ' '}
						</Text>
						<View onClick={onRightIconClick} className='ml-[14px] cursor-pointer'>
							{rightIcon}
						</View>
					</View>
				)}
			</View>
			{error && (
				<Text className='mt-1 text-xs text-red-500'>{error}</Text>
			)}
		</View>
	)
}

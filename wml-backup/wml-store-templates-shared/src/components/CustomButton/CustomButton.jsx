import Loading from '../Loading/LoadingComponent'

export default function CustomButton(props) {
	const {
		disabled,
		color,
		backgroundColor,
		variant,
		label,
		onPress,
		onClick,
		isLoading,
		width,
		borderRadius,
		className,
		textClassName,
		outlined,
		children,
		leftIcon,
		checkoutVariant,
		adjacentToInput,
		...rest
	} = props

	const _onPress = () => {
		if (!disabled && onPress && typeof onPress === 'function') {
			onPress()
		}

		if (!disabled && onClick && typeof onClick === 'function') {
			onClick()
		}
	}

	const _backgroundColor = (() => {
		if (checkoutVariant) {
			return 'bg-[#1E120D]'
		}
		if (variant === 'outlined' || outlined) {
			return 'transparent'
		}
		return isLoading || disabled ? 'bg-gray-300' : 'bg-primary'
	})()

	const _contentColor = (() => {
		if (checkoutVariant) {
			return 'text-white'
		}
		if (variant === 'outlined' || outlined) {
			return 'text-primary'
		}
		return isLoading || disabled ? 'text-gray-500' : 'text-primary-content'
	})()

	const renderContent = () => {
		const checkoutTextClass = checkoutVariant ? 'text-[14px] font-semibold leading-[100%]' : 'font-bold'

		if (leftIcon) {
			return (
				<View className='flex items-center gap-2'>
					<View className={_contentColor}>{leftIcon}</View>
					<Text className={`${checkoutVariant ? checkoutTextClass : 'font-medium'} ${_contentColor} ${textClassName || ''}`}>{label}</Text>
				</View>
			)
		}

		return <Text className={`${checkoutTextClass} ${_contentColor} ${textClassName || ''}`}>{label}</Text>
	}

	const _buttonStyle = {
		borderRadius: borderRadius ? `${borderRadius}px` : undefined,
		...(adjacentToInput ? { height: '40px', minHeight: '40px', maxHeight: '40px' } : {}),
	}

	return (
		<View
			onClick={_onPress}
			style={_buttonStyle}
			className={`flex ${checkoutVariant ? 'h-[49px] rounded-[8px]' : 'h-[45px] rounded'} w-full items-center justify-center ${_backgroundColor ? `${_backgroundColor}` : ''} ${variant === 'outlined' || outlined ? `border border-primary` : ''} ${className || ''} `}
			{...rest}>
			{children || (isLoading ? <Loading /> : renderContent())}
		</View>
	)
}

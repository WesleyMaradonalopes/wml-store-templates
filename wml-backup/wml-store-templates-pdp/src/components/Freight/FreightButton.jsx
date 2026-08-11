import { Loading } from "wml-store-templates-shared"

export default function FreightButton(props) {
	const {
		disabled,
		variant,
		label,
		onPress,
		onClick,
		isLoading,
		className,
		outlined,
		children,
		leftIcon,
		...rest
	} = props

	const _onPress = () => {
		if (disabled) return

		if (typeof onPress === 'function') onPress()
		if (typeof onClick === 'function') onClick()
	}

	const isOutlined = variant === 'outlined' || outlined

	return (
		<View
			onClick={_onPress}
			className={`
				flex
				h-[40px]
				items-center
				justify-center
				px-4
				bg-[#0F0805]
				text-white
				rounded-r-[8px]
				rounded-l-none
				border-0
				${disabled ? 'opacity-50' : ''}
				${className || ''}
			`}
			{...rest}
		>
			{children || (
				isLoading ? (
					<Loading />
				) : (
					<View className="flex items-center gap-2">
						{leftIcon && <View>{leftIcon}</View>}
						<Text className="text-[14px] font-semibold text-white leading-none">
							{label}
						</Text>
					</View>
				)
			)}
		</View>
	)
}

import { Image } from 'eitri-luminus'

import CustomButton from '../CustomButton/CustomButton'

const mergeClasses = (...classes) => classes.filter(Boolean).join(' ')

const VARIANT_CLASS_MAP = {
	primary: 'h-auto !rounded-[8px] px-4 py-4',
	outlined: 'h-auto !rounded-[8px] px-4 py-4 border border-[#1E120D] bg-transparent',
	ghost: 'h-auto bg-transparent px-0 py-0',
	pill: 'h-10 rounded-full px-4 !text-[#1E120D] border border-[#E6E1DC] bg-white font-medium',
	dashed: 'h-auto !rounded-[8px] border border-dashed border-[#B0A69B] bg-white px-4 py-4',
}

export default function AppActionButton(props) {
	const {
		label,
		onPress,
		onClick,
		disabled,
		isLoading,
		beforeIcon,
		beforeIconSrc,
		beforeIconWidth = '22px',
		beforeIconHeight = '22px',
		afterIcon,
		afterIconSrc,
		afterIconWidth = '22px',
		afterIconHeight = '22px',
		leftIcon,
		children,
		className,
		textClassName,
		variant = 'primary',
		...rest
	} = props

	const isOutlined = variant === 'outlined'
	const contentColorClassName = disabled ? 'text-white' : isOutlined ? 'text-[#1E120D]' : 'text-primary-content'
	const disabledBackgroundClassName = disabled ? '!bg-[#B0A69B]' : ''

	const resolvedBeforeIcon = beforeIcon ||
		(beforeIconSrc ? <Image src={beforeIconSrc} width={beforeIconWidth} height={beforeIconHeight} /> : null)
	const resolvedAfterIcon = afterIcon ||
		(afterIconSrc ? <Image src={afterIconSrc} width={afterIconWidth} height={afterIconHeight} /> : null)

	const hasInlineIcons = Boolean(resolvedBeforeIcon || resolvedAfterIcon)

	const defaultContent = hasInlineIcons ? (
		<View className='flex flex-row items-center justify-center gap-2'>
			{resolvedBeforeIcon ? <View className='flex items-center justify-center'>{resolvedBeforeIcon}</View> : null}
			<Text className={mergeClasses('font-sans text-sm font-semibold text-[#1E120D]', contentColorClassName, textClassName)}>{label}</Text>
			{resolvedAfterIcon ? <View className='flex items-center justify-center'>{resolvedAfterIcon}</View> : null}
		</View>
	) : (
		<Text className={mergeClasses('font-sans text-sm font-semibold text-[#1E120D]', contentColorClassName, textClassName)}>
			{label}
		</Text>
	)

	const buttonChildren = isLoading ? null : (children || defaultContent)

	return (
		<CustomButton
			label={label}
			onPress={onPress}
			onClick={onClick}
			disabled={disabled}
			isLoading={isLoading}
			leftIcon={leftIcon}
			variant={isOutlined ? 'outlined' : undefined}
			className={mergeClasses(VARIANT_CLASS_MAP[variant] || VARIANT_CLASS_MAP.primary, disabledBackgroundClassName, className)}
			{...rest}>
			{buttonChildren}
		</CustomButton>
	)
}

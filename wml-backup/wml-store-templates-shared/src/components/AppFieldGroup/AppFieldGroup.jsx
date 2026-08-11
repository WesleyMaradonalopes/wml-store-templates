import AppText from '../AppText/AppText'

const mergeClasses = (...classes) => classes.filter(Boolean).join(' ')

export default function AppFieldGroup(props) {
	const {
		label,
		optionalLabel,
		required,
		hint,
		error,
		children,
		className,
		labelClassName,
		contentClassName,
		hintClassName,
		errorClassName,
	} = props

	return (
		<View className={mergeClasses('flex flex-col gap-1', className)}>
			{label && (
				<View>
					<AppText variant='label' className={mergeClasses('w-full', labelClassName)}>
						{optionalLabel ? `${label} (${optionalLabel})` : label}
						{required ? ' *' : ''}
					</AppText>
				</View>
			)}

			<View className={contentClassName}>{children}</View>

			{hint && !error && (
				<View>
					<Text className={mergeClasses('font-sans text-xs leading-4 text-[#A49A8E]', hintClassName)}>{hint}</Text>
				</View>
			)}

			{error && (
				<View>
					<Text className={mergeClasses('font-sans text-xs leading-4 text-red-500', errorClassName)}>{error}</Text>
				</View>
			)}
		</View>
	)
}

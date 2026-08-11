import AppFieldGroup from '../AppFieldGroup/AppFieldGroup'

const mergeClasses = (...classes) => classes.filter(Boolean).join(' ')

export default function AppDropdown(props) {
	const {
		label,
		optionalLabel,
		required,
		hint,
		error,
		value,
		onChange,
		placeholder,
		options = [],
		disabled,
		wrapperClassName,
		labelClassName,
		selectClassName,
		disabledSelectClassName = 'h-12 w-full rounded-lg !border border-[#A49A8E] bg-[#A49A8E] px-3 pr-10 text-white flex items-center',
		defaultSelectClassName = 'h-12 w-full rounded-lg !border border-[#B0A69B] px-3 pr-10 text-[#1E120D]',
	} = props

	const hasSelectedValue = value !== undefined && value !== null && value !== ''
	const disabledDescendantClasses = disabled
		? '[&_select]:!bg-[#A49A8E] [&_select]:!border-[#A49A8E] [&_select]:!text-white [&_[role="combobox"]]:!bg-[#A49A8E] [&_[role="combobox"]]:!border-[#A49A8E] [&_[role="combobox"]]:!text-white'
		: '[&_select]:bg-transparent [&_[role="combobox"]]:bg-transparent'
	const resolvedSelectClassName = mergeClasses(
		disabled ? disabledSelectClassName : defaultSelectClassName,
		hasSelectedValue || disabled ? '' : 'text-[#B0A69B]',
		'appearance-none bg-none [background-image:none]',
		'[&_select]:appearance-none [&_select]:[background-image:none] [&_select]:pr-10 [&_select]:text-inherit [&_select]:h-12 [&_select]:leading-[48px]',
		'[&_[role="combobox"]]:appearance-none [&_[role="combobox"]]:[background-image:none] [&_[role="combobox"]]:pr-10 [&_[role="combobox"]]:text-inherit [&_[role="combobox"]]:h-12 [&_[role="combobox"]]:flex [&_[role="combobox"]]:items-center',
		'[&_[class*="value"]]:flex [&_[class*="value"]]:items-center [&_[class*="placeholder"]]:flex [&_[class*="placeholder"]]:items-center',
		disabledDescendantClasses,
		'[&_[class*="indicator"]]:hidden [&_[class*="arrow"]]:hidden [&_[class*="chevron"]]:hidden',
		'[&::-ms-expand]:hidden',
		selectClassName,
	)

	const handleChange = (nextValue) => {
		const resolvedValue = nextValue?.target?.value ?? nextValue ?? ''
		onChange?.(resolvedValue)
	}

	const selectedOption = options.find((option) => option?.value === value)
	const displayValue = selectedOption?.label || placeholder

	return (
		<AppFieldGroup
			label={label}
			optionalLabel={optionalLabel}
			required={required}
			hint={hint}
			error={error}
			className={wrapperClassName}
			labelClassName={labelClassName}>
			<View className='relative'>
				{disabled ? (
					<View className={mergeClasses(disabledSelectClassName, selectClassName)}>
						<Text className='truncate font-sans text-sm text-white'>{displayValue}</Text>
					</View>
				) : (
					<Select
						value={value}
						onChange={handleChange}
						placeholder={placeholder}
						disabled={disabled}
						dropdownIcon={null}
						className={resolvedSelectClassName}>
						{options.map((option, index) => (
							<Select.Item
								key={`${option?.value ?? 'option'}-${index}`}
								value={option?.value}>
								{option?.label}
							</Select.Item>
						))}
					</Select>
				)}

				<View className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2'>
					<svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1' strokeLinecap='round' strokeLinejoin='round' className={disabled ? 'text-white' : 'text-[#1E120D]'}>
						<path d='M6 9l6 6 6-6' />
					</svg>
				</View>
			</View>
		</AppFieldGroup>
	)
}

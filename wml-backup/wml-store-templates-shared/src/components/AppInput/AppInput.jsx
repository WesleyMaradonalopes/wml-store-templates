import CustomInput from '../CustomInput/CustomInput'
import AppFieldGroup from '../AppFieldGroup/AppFieldGroup'

const mergeClasses = (...classes) => classes.filter(Boolean).join(' ')

export default function AppInput(props) {
	const {
		label,
		optionalLabel,
		required,
		hint,
		error,
		disabled,
		wrapperClassName,
		labelClassName,
		inputClassName,
		disabledInputClassName = 'h-12 rounded-lg !border !border-[#D9D3CD] !bg-[#ECE8E4] px-3 !text-[#A49A8E]',
		defaultInputClassName = 'h-12 rounded-lg !border border-[#B0A69B] px-3 text-[#1E120D]',
		placeholderTextColor = '#B0A69B',
		...rest
	} = props

	const resolvedInputClassName = mergeClasses(inputClassName, disabled ? disabledInputClassName : defaultInputClassName)

	return (
		<AppFieldGroup
			label={label}
			optionalLabel={optionalLabel}
			required={required}
			hint={hint}
			error={error}
			className={wrapperClassName}
			labelClassName={labelClassName}>
			<CustomInput
				{...rest}
				disabled={disabled}
				error={error}
				className={resolvedInputClassName}
				placeholderTextColor={placeholderTextColor}
			/>
		</AppFieldGroup>
	)
}

const mergeClasses = (...classes) => classes.filter(Boolean).join(' ')

const VARIANT_CLASS_MAP = {
	'title-lg': 'font-serif text-[28px] leading-[32px] text-[#1E120D]',
	'title-md': 'font-serif text-[24px] leading-[28px] text-[#1E120D]',
	title: 'font-sans text-[18px] font-medium leading-[22px] text-[#1E120D]',
	subtitle: 'font-sans text-sm font-medium leading-5 text-[#575756]',
	label: 'font-sans text-xs font-medium leading-4 text-[#575756]',
	value: 'font-sans text-base font-medium leading-6 text-[#A49A8E]',
	body: 'font-sans text-sm leading-5 text-[#1E120D]',
	muted: 'font-sans text-sm leading-5 text-[#A49A8E]',
	link: 'font-sans text-sm font-medium leading-5 text-[#575756] underline',
}

export default function AppText(props) {
	const { children, variant = 'body', className, ...rest } = props

	return (
		<Text className={mergeClasses(VARIANT_CLASS_MAP[variant] || VARIANT_CLASS_MAP.body, className)} {...rest}>
			{children}
		</Text>
	)
}

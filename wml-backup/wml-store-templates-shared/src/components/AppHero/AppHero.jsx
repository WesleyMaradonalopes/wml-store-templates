const mergeClasses = (...classes) => classes.filter(Boolean).join(' ')

export default function AppHero(props) {
	const {
		title,
		subtitle,
		className,
		backgroundImage,
		backgroundOverlay,
	} = props

	const hasSubtitle = subtitle !== undefined && subtitle !== null && subtitle !== false && subtitle !== ''
	const hasBackgroundImage = typeof backgroundImage === 'string' && backgroundImage
	const titleClassName = hasBackgroundImage
		? 'font-serif text-[28px] leading-[32px] text-white'
		: 'font-serif text-[22px] leading-[26px] text-white'
	const subtitleContainerClassName = hasBackgroundImage ? 'mt-3' : 'mt-2'
	const subtitleTextClassName = hasBackgroundImage
		? 'font-sans text-sm leading-[21px] text-center text-white'
		: 'font-sans text-xs leading-[18px] text-center text-white'

	const backgroundStyle = hasBackgroundImage
		? {
			backgroundImage: backgroundOverlay
				? `${backgroundOverlay}, url('${backgroundImage}')`
				: `url('${backgroundImage}')`,
			backgroundSize: 'cover',
			backgroundPosition: 'center',
			overflow: 'hidden',
		}
		: undefined

	return (
		<View
			className={mergeClasses('-mx-4 flex items-center justify-center bg-[#A49A8E] px-4 py-8', className)}
			style={backgroundStyle}>
			<View className='w-full text-center'>
				{title ? (
					<Text className={titleClassName}>
						{title}
					</Text>
				) : null}

				{hasSubtitle && (
					<View className={subtitleContainerClassName}>
						<Text className={subtitleTextClassName}>{subtitle}</Text>
					</View>
				)}
			</View>
		</View>
	)
}
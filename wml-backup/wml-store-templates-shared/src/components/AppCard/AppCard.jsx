import { useState } from 'react'
import AppText from '../AppText/AppText'

const mergeClasses = (...classes) => classes.filter(Boolean).join(' ')

const isPrimitiveContent = (content) => typeof content === 'string' || typeof content === 'number'

const renderHeadingContent = (content, variant, className) => {
	if (content === undefined || content === null || content === false) {
		return null
	}

	if (isPrimitiveContent(content)) {
		return (
			<View className='w-full'>
				<AppText variant={variant} className={className}>{content}</AppText>
			</View>
		)
	}

	return <View className={mergeClasses('w-full', className)}>{content}</View>
}

export default function AppCard(props) {
	const {
		children,
		title,
		subtitle,
		onClick,
		onToggle,
		className,
		padding = 'p-4',
		maxWidth = 'max-w-[360px]',
		borderColor = 'border-[#E6E1DC]',
		backgroundClassName = 'bg-white',
		roundedClassName = 'rounded-2xl',
		headerClassName,
		titleClassName,
		subtitleClassName,
		headerSpacingClassName = 'mb-6',
		interactive = false,
		withShadow = false,
		expandable = false,
		defaultExpanded = false,
		expanded,
		...rest
	} = props

	const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
	const isControlledExpanded = typeof expanded === 'boolean'
	const isExpanded = expandable ? (isControlledExpanded ? expanded : internalExpanded) : true
	const showHeader = title !== undefined || subtitle !== undefined
	const showSubtitle = !!subtitle

	const handleToggle = () => {
		if (!expandable) {
			return
		}

		const nextExpanded = !isExpanded
		if (!isControlledExpanded) {
			setInternalExpanded(nextExpanded)
		}

		onToggle?.(nextExpanded)
	}

	const handleCardClick = () => {
		if (expandable) {
			return
		}

		onClick?.()
	}

	return (
		<View
			onClick={handleCardClick}
			className={mergeClasses(
				'mx-auto w-full border',
				padding,
				maxWidth,
				borderColor,
				backgroundClassName,
				roundedClassName,
				interactive || expandable ? 'active:opacity-90' : '',
				withShadow ? 'shadow-sm' : '',
				className,
			)}
			{...rest}>
			{showHeader && (
				expandable ? (
					<View
						onClick={handleToggle}
						className={mergeClasses('flex w-full flex-row items-start justify-between gap-3', headerSpacingClassName, headerClassName)}>
						<View className='flex-1'>
							<View className='w-full'>{renderHeadingContent(title, 'title', titleClassName)}</View>
							{showSubtitle && (
								<View className={mergeClasses('w-full', title ? 'mt-2' : '')}>
									{renderHeadingContent(subtitle, 'subtitle', subtitleClassName)}
								</View>
							)}
						</View>
						<View className='flex h-5 w-5 items-center justify-center'>
							<svg
								width='16'
								height='16'
								viewBox='0 0 16 16'
								fill='none'
								stroke='currentColor'
								strokeWidth='1'
								strokeLinecap='round'
								strokeLinejoin='round'
								className='text-[#0F0805]'>
								<path d={isExpanded ? 'M12 10l-4-4-4 4' : 'M4 6l4 4 4-4'} />
							</svg>
						</View>
					</View>
				) : (
					<View className={mergeClasses('flex w-full flex-col', headerSpacingClassName, headerClassName)}>
						<View className='w-full'>{renderHeadingContent(title, 'title', titleClassName)}</View>
						{showSubtitle && (
							<View className={mergeClasses('w-full', title ? 'mt-2' : '')}>
								{renderHeadingContent(subtitle, 'subtitle', subtitleClassName)}
							</View>
						)}
					</View>
				)
			)}
			{expandable ? (
				<View
					className={mergeClasses(
						'overflow-hidden transition-[max-height] duration-300 ease-in-out',
						isExpanded ? 'max-h-[5000px]' : 'max-h-0',
					)}>
					{children}
				</View>
			) : (
				children
			)}
		</View>
	)
}

import { Text, View } from 'eitri-luminus'
import { useEffect, useState } from 'react'

export default function CollapsableView(props) {
	const {
		children,
		title,
		willStartCollapsed,
		titleClassName = 'text-lg',
		showChevron = false,
	} = props
	const [collapsed, setCollapsed] = useState(!!willStartCollapsed)

	useEffect(() => {
		setCollapsed(!!willStartCollapsed)
	}, [willStartCollapsed])

	const toggleCollapsedState = () => {
		setCollapsed(!collapsed)
	}
	return (
		<View
			borderTopWidth={'hairline'}
			className='border-neutral-content p-2'>
			<View
				onClick={toggleCollapsedState}
				className='flex flex-row items-center justify-between'>
				<Text className={titleClassName}>{title}</Text>

				{showChevron && (
					<View className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : 'rotate-0'}`}>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M6.99954 3.92C6.95026 3.9199 6.90143 3.92941 6.85589 3.94796C6.81035 3.96651 6.769 3.99375 6.73419 4.02811L1.23011 9.44877C1.19524 9.48308 1.16757 9.52383 1.14868 9.56867C1.12979 9.61352 1.12002 9.66159 1.12 9.71014C1.11997 9.75869 1.12966 9.80677 1.14851 9.85163C1.16736 9.89649 1.19504 9.93726 1.22989 9.9716C1.26473 10.0059 1.3061 10.0332 1.35164 10.0518C1.39718 10.0704 1.44599 10.08 1.49529 10.08C1.54459 10.08 1.59338 10.0705 1.63894 10.0519C1.68449 10.0334 1.72593 10.0061 1.7608 9.97183L7 4.81248L12.2392 9.97183C12.3096 10.0411 12.4051 10.08 12.5047 10.08C12.6043 10.08 12.6997 10.041 12.7701 9.9716C12.8405 9.90224 12.88 9.80819 12.88 9.71014C12.88 9.61209 12.8403 9.51807 12.7699 9.44877L7.26534 4.02811C7.23048 3.9937 7.18904 3.96643 7.14342 3.94787C7.09779 3.92932 7.0489 3.91984 6.99954 3.92Z" fill="#1E120D"/>
						</svg>
					</View>
				)}
			</View>
			{!collapsed && <View className='my-2'>{children}</View>}
		</View>
	)
}

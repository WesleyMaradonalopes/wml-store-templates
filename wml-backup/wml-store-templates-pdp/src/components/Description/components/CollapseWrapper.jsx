import { useEffect, useState } from 'react'

// Ícone de mais (seção recolhida) - estilo HOPE
const PlusIcon = ({ width = 24, height = 24, color = '#374151' }) => (
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M8.05493 11.6449C7.9986 11.645 7.9428 11.6341 7.89076 11.6129C7.83871 11.5917 7.79146 11.5606 7.75168 11.5213L1.4613 5.32627C1.42144 5.28705 1.38982 5.24049 1.36823 5.18923C1.34665 5.13798 1.33547 5.08305 1.33545 5.02756C1.33542 4.97208 1.3465 4.91713 1.36804 4.86586C1.38957 4.81459 1.42121 4.76799 1.46104 4.72874C1.50086 4.68949 1.54814 4.65835 1.60018 4.63709C1.65223 4.61584 1.70801 4.60488 1.76435 4.60486C1.8207 4.60483 1.87646 4.61574 1.92852 4.63695C1.98059 4.65816 2.02794 4.68926 2.0678 4.72848L8.05545 10.6249L14.0431 4.72848C14.1236 4.64928 14.2328 4.60481 14.3465 4.60486C14.4603 4.60491 14.5694 4.64947 14.6499 4.72874C14.7303 4.80801 14.7755 4.9155 14.7754 5.02756C14.7754 5.13962 14.7301 5.24707 14.6496 5.32627L8.3587 11.5213C8.31886 11.5606 8.2715 11.5918 8.21936 11.613C8.16722 11.6342 8.11134 11.645 8.05493 11.6449Z" fill="#0F0805" />
	</svg>
)

// Ícone de menos (seção expandida) - estilo HOPE
const MinusIcon = ({ width = 24, height = 24, color = '#374151' }) => (
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M7.99926 4.48002C7.94294 4.47991 7.88714 4.49077 7.83509 4.51197C7.78305 4.53318 7.73579 4.56431 7.69601 4.60358L1.40563 10.7986C1.36578 10.8378 1.33415 10.8844 1.31257 10.9356C1.29098 10.9869 1.27981 11.0418 1.27979 11.0973C1.27976 11.1528 1.29083 11.2077 1.31237 11.259C1.33391 11.3103 1.36555 11.3569 1.40537 11.3961C1.4452 11.4354 1.49247 11.4665 1.54452 11.4878C1.59656 11.509 1.65235 11.52 1.70869 11.52C1.76503 11.52 1.8208 11.5091 1.87286 11.4879C1.92493 11.4667 1.97228 11.4356 2.01214 11.3964L7.99979 5.5L13.9874 11.3964C14.0679 11.4756 14.1771 11.5201 14.2909 11.52C14.4047 11.52 14.5138 11.4754 14.5942 11.3961C14.6746 11.3169 14.7198 11.2094 14.7198 11.0973C14.7197 10.9853 14.6744 10.8778 14.5939 10.7986L8.30304 4.60358C8.26319 4.56425 8.21584 4.53308 8.1637 4.51187C8.11155 4.49066 8.05568 4.47984 7.99926 4.48002Z" fill="#0F0805" />
	</svg>
)

export default function CollapseWrapper(props) {
	const { children, title, defaultCollapsed } = props

	const [collapsed, setCollapsed] = useState(true)

	useEffect(() => {
		setCollapsed(defaultCollapsed)
	}, [defaultCollapsed])

	return (
		<View className='w-full overflow-x-hidden'>
			<View
				onClick={() => setCollapsed(!collapsed)}
				className='cursor-pointer'>
				<View className='flex w-full items-center justify-between py-2 font-sans text-primary'>
					<Text
						className="text-[16px] font-serif leading-[22px] text-[#0F0805]"
						style={{ fontFamily: 'PlayfairDisplay-Regular' }}
					>
						{title}
					</Text>
					<View className='transition-transform duration-200'>
						{collapsed ? (
							<PlusIcon
								width={12}
								height={12}
								color='#374151'
							/>
						) : (
							<MinusIcon
								width={12}
								height={12}
								color='#374151'
							/>
						)}
					</View>
				</View>
			</View>
			{!collapsed && <View className='pb-1'>{children}</View>}
		</View>
	)
}

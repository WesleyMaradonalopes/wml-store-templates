import { Text, View } from 'eitri-luminus'

export default function GroupsWrapper(props) {
	const { title, subtitle, icon, children, onPress, className, valueInCents } = props

	return (
		<View className={`rounded-[16px] border border-[#EFEDEA] bg-white px-[17px] py-4 shadow-sm ${className || ''}`}>
			<View
				onClick={onPress}
				className='flex w-full flex-col'>
				<View className='flex flex-row items-center gap-1 border-b border-[#ECE8E4] py-2'>
					<View>{icon}</View>
					<View className='flex flex-1 flex-col'>
						<Text className='text-[14px] font-semibold leading-[150%] text-[#0F0805]'>{title}</Text>
						{subtitle && <Text className='text-[14px] font-medium leading-[150%] text-[#575756]'>{subtitle}</Text>}
					</View>
				</View>
			</View>
			{children && <View>{children}</View>}
		</View>
	)
}

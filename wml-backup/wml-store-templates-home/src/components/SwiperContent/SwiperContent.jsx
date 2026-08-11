import { Text, View } from 'eitri-luminus'

export default function SwiperContent(props) {
	const { title, children } = props
	return (
		<View className='flex flex-col gap-2'>
			{title && (
				<View className='px-4'>
					<Text className='text-lg font-bold'>{title}</Text>
				</View>
			)}
			<View className='flex flex-row overflow-x-scroll'>
				<View className={`flex flex-row gap-4 px-4`}>{children}</View>
			</View>
		</View>
	)
}

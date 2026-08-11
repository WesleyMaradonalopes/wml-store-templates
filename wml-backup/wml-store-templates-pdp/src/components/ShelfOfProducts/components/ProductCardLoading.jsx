import { Loading } from 'wml-store-templates-shared'
export default function ProductCardLoading(props) {
	const { width, gap } = props
	return (
		<View className='flex justify-center'>
			<View className='w-[50%] p-8 pr-1'>
				<View className='min-h-341 border border-neutral-content p-2'>
					<View className='flex flex-col items-center justify-center p-2'>
						<Loading
							inline
							width='80px'
						/>
					</View>
				</View>
			</View>
			<View
				width='50%'
				className='p-8 pl-1'>
				<View
					minHeight='341px'
					className='border border-neutral-content p-2'>
					<View className='flex flex-col items-center justify-center p-2'>
						<Loading
							inline
							width='80px'
						/>
					</View>
				</View>
			</View>
		</View>
	)
}

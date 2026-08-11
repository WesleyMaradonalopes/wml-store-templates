import { Skeleton, Text, View } from 'eitri-luminus'

export default function InfoCard(props) {
	const { customerData, isLoading = false } = props
	const initial = (customerData?.firstName ?? customerData?.email)?.charAt(0)?.toLocaleUpperCase() || '?'

	return (
		<View className='relative'>
			{isLoading && (
				<View className='absolute flex h-full w-full py-4'>
					<Skeleton className='h-full w-full rounded-xl bg-gray-300' />
				</View>
			)}
			<View className='py-4'>
				<View className='flex w-full items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
					<View className='flex h-14 w-14 items-center justify-center rounded-full bg-primary'>
						<Text className='text-2xl font-bold text-white'>
							{initial}
						</Text>
					</View>
					<View className='flex flex-1 flex-col gap-1'>
						{customerData?.firstName && (
							<Text className='text-lg font-bold text-gray-800'>
								{`${customerData.firstName} ${customerData.lastName}`}
							</Text>
						)}

						{customerData?.email && <Text className='text-sm text-gray-600'>{customerData.email}</Text>}
					</View>
				</View>
			</View>
		</View>
	)
}

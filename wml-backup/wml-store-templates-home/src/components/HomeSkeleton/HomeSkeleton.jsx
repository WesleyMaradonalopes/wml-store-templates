import { Skeleton, View } from 'eitri-luminus'

export default function HomeSkeleton(props) {
	const { show } = props
	return (
		<View className={`p-4 ${show ? 'block' : 'hidden'}`}>
			<View className='flex flex-col gap-4'>
				<Skeleton className='min-h-[200px] w-full rounded-lg !bg-[#E5E7EB]' />
				<View className='flex flex-row gap-4'>
					<Skeleton className='min-h-[200px] w-full rounded-lg !bg-[#E5E7EB]' />
					<Skeleton className='min-h-[200px] w-full rounded-lg !bg-[#E5E7EB]' />
				</View>
				<Skeleton className='h-screen w-full rounded-lg !bg-[#E5E7EB]' />
			</View>
		</View>
	)
}

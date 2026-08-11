import { Image } from 'eitri-luminus'

export default function ProfileCardButton(props) {
	const { icon, label, description, onClick } = props

	return (
		<View
			className='flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm'
			onClick={onClick}>
			<View className='flex flex-row items-center gap-3'>
				<View className='flex h-11 w-11 items-center justify-center rounded-full bg-[#f6f3ef]'>
					<Image
						src={icon}
						width={22}
						height={22}
					/>
				</View>
				<View className='flex flex-1 flex-col gap-1'>
					<Text className='text-base font-semibold text-gray-900'>{label}</Text>
					{description && <Text className='text-xs text-gray-600'>{description}</Text>}
				</View>
			</View>
			<View className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500'>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					width='16'
					height='16'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='1.5'
					strokeLinecap='round'
					className='text-gray-500'>
					<line
						x1='5'
						y1='12'
						x2='19'
						y2='12'></line>
					<polyline points='12 5 19 12 12 19'></polyline>
				</svg>
			</View>
		</View>
	)
}

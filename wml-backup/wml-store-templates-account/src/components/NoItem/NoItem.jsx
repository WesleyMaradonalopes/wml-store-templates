import imgBox from '../../assets/images/box-01.svg'

export default function NoItem(props) {
	const { title, subtitle } = props

	return (
		<View className='flex flex-col items-center justify-center gap-4 p-6'>
			{/*<Icon*/}
			{/*  iconKey='package'*/}
			{/*  color='primary-700'*/}
			{/*  width={48}*/}
			{/*  height={48}*/}
			{/*/>*/}
			<Text className='w-full text-center text-sm font-bold'>{title}</Text>
			<Text className='w-full text-center text-sm font-medium'>{subtitle}</Text>
		</View>
	)
}

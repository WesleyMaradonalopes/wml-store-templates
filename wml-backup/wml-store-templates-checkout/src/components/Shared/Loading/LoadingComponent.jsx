import { Loading, View } from 'eitri-luminus'

export default function LoadingComponent(props) {
	const { isLoading, fullScreen, text } = props

	if (typeof isLoading === 'boolean' && !isLoading) return null

	if (fullScreen) {
		return (
			<View className='fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white opacity-90'>
				<Loading className='loading-lg' />
				{text && (
					<View className='mt-2 max-w-[200px] text-center'>
						<Text className=''>{text}</Text>
					</View>
				)}
			</View>
		)
	}

	return (
		<View>
			<Loading />
		</View>
	)
}

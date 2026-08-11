import { View, Loading } from 'eitri-luminus'

export default function LoadingComponent(props) {
	const { isLoading, fullScreen } = props

	if (typeof isLoading === 'boolean' && !isLoading) return null

	if (fullScreen) {
		return (
			<View className='fixed inset-0 z-[999] flex items-center justify-center bg-neutral-500 opacity-90'>
				<Loading className='loading-lg' />
			</View>
		)
	}

	return (
		<View>
			<Loading />
		</View>
	)
}

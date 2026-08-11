export default function Spacing(props) {
	const { height, width } = props

	return <View className={`h-${height || '50'} w-${width || 'full'}`}></View>
}

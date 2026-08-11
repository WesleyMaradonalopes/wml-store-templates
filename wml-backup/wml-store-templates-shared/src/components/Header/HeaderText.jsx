import { Text, View } from 'eitri-luminus'
export default function HeaderText(props) {
	const { text } = props
	return (
		<View>
			<Text className='text-header-content text-xl font-serif font-normal'>{text}</Text>
		</View>
	)
}

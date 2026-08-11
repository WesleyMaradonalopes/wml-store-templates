import { View } from 'eitri-luminus'
export default function SelectableTouchable(props) {
	const { addCategory, removeCategory, checked, value, categoryKey, name } = props
	const handleCheck = (value) => {
		if (checked) {
			removeCategory({
				key: categoryKey,
				value,
			})
		} else {
			addCategory(value)
		}
	}
	return (
		<View
			onClick={() =>
				handleCheck({
					key: categoryKey,
					value,
				})
			}
			className='flex items-center'>
			<Checkbox defaultChecked={checked} />
			{`${name}`}
		</View>
	)
}

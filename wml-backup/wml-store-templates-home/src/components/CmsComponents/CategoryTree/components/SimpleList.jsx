import { Text, View } from 'eitri-luminus'
export default function SimpleList(props) {
	const { currentShelf, chooseCategory } = props
	const totalLength = currentShelf?.content?.length
	const half = totalLength % 2 === 0 ? totalLength / 2 : (totalLength + 1) / 2
	return (
		<View className='flex px-8'>
			<View width='50%'>
				{currentShelf?.content?.slice(0, half).map((category) => (
					<View
						key={category.title}
						onClick={() => chooseCategory(category)}
						borderBottomWidth='hairline'
						width='100%'
						className='border-neutral py-1'>
						<Text fontFamily='Baloo 2'>{category?.title}</Text>
					</View>
				))}
			</View>
			<View width='50%'>
				{currentShelf?.content?.slice(half, totalLength).map((category) => (
					<View
						key={category.title}
						onClick={() => chooseCategory(category)}
						borderBottomWidth='hairline'
						width='100%'
						className='border-neutral py-1'>
						<Text fontFamily='Baloo 2'>{category?.title}</Text>
					</View>
				))}
			</View>
		</View>
	)
}

export default function Breadcrumb({ product }) {
	const { categoryTree = [] } = product ?? {}

	if (categoryTree.length === 0) return null

	return (
		<View className='h-7 px-4 py-2 text-xs leading-none'>
			<View className='line-clamp-1 overflow-hidden'>
				<Text className='font-semibold leading-none'>Home</Text>
				{categoryTree.map(({ name }, index) => (
					<View key={`${name}-${index}`}>
						<Text className='font-normal'>{' > '}</Text>
						<Text className='font-semibold'>{name}</Text>
					</View>
				))}
				<Text className='font-normal'>{' > '}</Text>
				<Text className='font-normal'>{product.productName}</Text>
			</View>
		</View>
	)
}

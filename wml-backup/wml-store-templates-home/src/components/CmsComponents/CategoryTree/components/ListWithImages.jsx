import { Image, Text, View } from 'eitri-luminus'

export default function ListWithImages(props) {
	const { currentShelf, chooseCategory } = props

	const ITEMS_PER_ROW = 3.5
	const GAP = 16 // px

	const totalGap = Math.ceil(ITEMS_PER_ROW - 1) * GAP
	const calculatedWidth = `calc((100% - ${totalGap}px) / ${ITEMS_PER_ROW})`

	return (
		<View className='relative'>
			<View
				// after:absolute after:right-0 after:top-0 after:z-50 after:h-full after:w-8 after:bg-gradient-to-r after:from-transparent after:to-white
				className='flex overflow-x-auto px-4'
				style={{
					gap: `${GAP}px`,
				}}>
				{currentShelf?.content?.map((category) => (
					<View
						key={category.title}
						onClick={() => chooseCategory(category)}
						className='flex shrink-0 flex-col gap-1'
						style={{
							width: calculatedWidth,
							// backgroundColor: category.color,
						}}>
						<View
							data-no-thumbnail={category.thumbnail ? undefined : ''}
							style={{ backgroundColor: category.color }}
							className='flex aspect-[83/113] w-full shrink-0 grow items-center justify-center'>
							<Image
								src={category.thumbnail}
								className='h-auto w-full object-contain'
							/>
						</View>

						<Text className='h-7 text-center text-sm font-normal leading-none text-primary'>
							{category?.title}
						</Text>
					</View>
				))}
			</View>
		</View>
	)
}

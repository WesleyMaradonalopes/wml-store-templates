import { useSameColorProducts } from '../../hooks/colors/useSameColorProducts'
import ColorsModal from '../ColorsModal/ColorsModal'

const COLOR_ATTRIBUTE_NAME = 'Cor em Atributo de Produto'

export default function Similars(props) {
	const { product, onProductChange } = props

	const { properties = [], productId } = product ?? {}
	const similarProducts = useSameColorProducts(product, COLOR_ATTRIBUTE_NAME, true)

	const [property] = properties.filter((property) => property.name === COLOR_ATTRIBUTE_NAME) ?? []
	const [currentColor] = property?.values ?? []

	const [showColorsModal, setShowColorsModal] = useState(false)

	const handleColorClick = (product) => {
		if (product.productId === productId) return
		onProductChange(product)
	}

	if (similarProducts.length === 0) return null
	if (!currentColor) return null

	const reordered = [...similarProducts].sort((a, b) => {
		const aColor = a.properties.find(
			(property) => property.name === COLOR_ATTRIBUTE_NAME
		)?.values?.[0]

		const bColor = b.properties.find(
			(property) => property.name === COLOR_ATTRIBUTE_NAME
		)?.values?.[0]

		return (
			(aColor === currentColor ? -1 : 0) -
			(bColor === currentColor ? -1 : 0)
		)
	})

	const colorsShowed = reordered?.slice(0, 6)
	const remainder = reordered?.slice(6)

	return (
		<View className='flex flex-col gap-2'>
			{/* Header */}
			<View className='flex flex-row items-center gap-1 font-sans text-xs text-primary'>
				<Text className=''>Cor:</Text>
				<Text className='font-semibold'>{currentColor}</Text>
			</View>

			{/* Colors */}
			<View className='flex flex-row flex-wrap gap-2'>
				{colorsShowed.map((product) => {
					const [colorProperty] =
						product.properties.filter((property) => property.name === COLOR_ATTRIBUTE_NAME) ?? []
					const [colorName] = colorProperty?.values ?? []

					const isSelected = colorName === currentColor

					return (
						<View
							key={product.productId}
							data-selected={isSelected ? '' : undefined}
							className='h-[34px] w-[34px] flex rounded-full border border-transparent p-[4.28px] data-[selected]:border-primary  '>
							<View
								onClick={() => handleColorClick(product)}
								style={{
									backgroundColor: '#ccc',
									backgroundImage: `url("https://lojabl.vtexassets.com/arquivos/${colorName}.gif")`,
									backgroundSize: 'cover',
									backgroundPosition: 'center',
									backgroundRepeat: 'no-repeat',
								}}
								className='h-full w-full rounded-full'
							/>
						</View>
					)
				})}

				{remainder?.length > 0 &&
					<View
						onClick={() => setShowColorsModal(true)}
						className="h-[34px] w-[100px] border border-[#D2C9C0] rounded-full flex flex-row items-center justify-center gap-1"
					>
						<Text className="text-[10px] font-normal text-[#0F0805] flex flex-row items-center gap-[4px]">
							Ver+{remainder.length} cores
							<svg width="4" height="7" viewBox="0 0 4 7" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M0.49999 0.50004L3.41666 3.41671L0.49999 6.33337" stroke="#0F0805" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</Text>
					</View>
				}

				{showColorsModal &&
					<ColorsModal
						open={showColorsModal}
						onClose={() => setShowColorsModal(false)}
						similars={reordered}
					>
					</ColorsModal>
				}
			</View>
		</View>
	)
}

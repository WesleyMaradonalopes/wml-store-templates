import Description from './Description'
import Information from './Information'

export default function DescriptionComponent(props) {
	const { product } = props

	return (
		<View className='flex w-full flex-col'>
			<View className='border-b border-t border-[#E5E5E5] px-4 py-2'>
				<Description description={product?.description} />
			</View>

			<View className='border-b border-[#E5E5E5] px-4 py-2'>
				<Information product={product} />
			</View>
		</View>
	)
}

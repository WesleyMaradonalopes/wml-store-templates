import { BottomInset } from 'wml-store-templates-shared'

export default function FixedBottom(props) {
	const { children, offSetHeight, className, wrapperClassName } = props

	return (
		<View>
			<View className={`fixed bottom-0 left-0 z-10 w-full border-t border-gray-300 bg-white shadow-sm ${wrapperClassName || ''}`}>
				<View className={`p-4 ${className}`}>{children}</View>
				<BottomInset />
			</View>

			<View
				style={{ height: offSetHeight || 'auto' }}
				className='w-full'
			/>

			<BottomInset />
		</View>
	)
}

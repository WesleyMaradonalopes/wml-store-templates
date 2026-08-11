import { View, Text } from 'eitri-luminus'

export default function CustomCheckbox(props) {
	const { checked, onChange, label, align, justify, color = '#000000' } = props

	return (
		<View
			onClick={() => onChange(!checked)}
			className={`flex flex-row ${align === 'center' ? 'items-center' : 'items-start'} ${justify === 'center' ? 'justify-center' : 'justify-start'}`}>
			<View
				className='w-5 h-5 border rounded flex items-center justify-center flex-shrink-0'
				style={{
					borderColor: checked ? color : '#D1D5DB',
					backgroundColor: checked ? color : 'transparent',
				}}>
				{checked && (
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<polyline points="20,6 9,17 4,12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
				)}
			</View>
			{label && (
				<View
					onClick={() => onChange(!checked)}
					className='ml-2'>
					<Text className='text w-full'>{label}</Text>
				</View>
			)}
		</View>
	)
}

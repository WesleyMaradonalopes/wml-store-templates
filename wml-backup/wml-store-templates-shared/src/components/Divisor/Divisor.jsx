export default function Divisor(props) {
	const { width, height, backgroundColor } = props

	return (
		<View
			width={width || '100%'}
			height={height || '1px'}
			backgroundColor={backgroundColor || 'neutral-300'}
		/>
	)
}

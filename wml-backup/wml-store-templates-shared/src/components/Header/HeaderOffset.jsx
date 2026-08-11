export default function HeaderOffset(props) {
	const { topInset, height } = props

	return (
		<>
			{topInset && <View topInset={'auto'} />}
			<View style={{ height: height || 'auto' }} />
		</>
	)
}

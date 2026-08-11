export default function Alert(props) {
	const { message, colorMessage, backgroundColor, iconKey, colorIcon } = props

	return (
		<View className={`mt-2 ${backgroundColor} flex items-center gap-3.5 rounded p-2`}>
			<Image
				src={iconKey}
				className={`${colorIcon}`}
				width={20}
				height={20}
			/>
			<Text className={`text-${colorMessage}`}>{message}</Text>
		</View>
	)
}

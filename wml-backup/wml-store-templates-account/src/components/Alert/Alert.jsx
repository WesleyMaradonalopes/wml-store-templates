// /Users/calindra/Workspace/Eitri/eitri-shopping-template/shopping-vtex-template-account/src/components/Alert/Alert.jsx
export default function Alert(props) {
	const { message, type = 'negative', duration = 5, onDismiss, show } = props

	const [visible, setVisible] = useState(false)
	const [isAnimatingOut, setIsAnimatingOut] = useState(false)

	useEffect(() => {
		if (show) {
			setVisible(true)
			setIsAnimatingOut(false)

			const hideTimer = setTimeout(() => {
				setIsAnimatingOut(true) // Inicia a animação de saída
				const dismissTimer = setTimeout(() => {
					setVisible(false)
					if (typeof onDismiss === 'function') {
						onDismiss()
					}
				}, 300) // Duração da animação de saída

				return () => clearTimeout(dismissTimer)
			}, duration * 1000)

			return () => clearTimeout(hideTimer)
		}
	}, [show, duration, onDismiss])

	if (!visible) {
		return null
	}

	const alertConfig = {
		positive: {
			container: 'bg-green-100 border-green-200',
			text: 'text-green-800',
			icon: (
				<svg
					xmlns='http://www.w3.org/2000/svg'
					className='h-6 w-6 shrink-0 stroke-current'
					fill='none'
					viewBox='0 0 24 24'>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth='2'
						d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
					/>
				</svg>
			),
		},
		warning: {
			container: 'bg-yellow-100 border-yellow-200',
			text: 'text-yellow-800',
			icon: (
				<svg
					xmlns='http://www.w3.org/2000/svg'
					className='h-6 w-6 shrink-0 stroke-current'
					fill='none'
					viewBox='0 0 24 24'>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth='2'
						d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
					/>
				</svg>
			),
		},
		negative: {
			container: 'bg-red-100 border-red-200',
			text: 'text-red-800',
			icon: (
				<svg
					xmlns='http://www.w3.org/2000/svg'
					className='h-6 w-6 shrink-0 stroke-current'
					fill='none'
					viewBox='0 0 24 24'>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						strokeWidth='2'
						d='M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
					/>
				</svg>
			),
		},
	}

	const currentConfig = alertConfig[type]

	return (
		<View className='pointer-events-none fixed bottom-0 left-0 right-0 z-50 p-4'>
			<View
				className={`flex w-full items-center gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out ${
					currentConfig.container
				} ${isAnimatingOut ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
				<View className={currentConfig.text}>{currentConfig.icon}</View>
				<Text className={`font-semibold ${currentConfig.text}`}>{message}</Text>
			</View>
			<View bottomInset />
		</View>
	)
}

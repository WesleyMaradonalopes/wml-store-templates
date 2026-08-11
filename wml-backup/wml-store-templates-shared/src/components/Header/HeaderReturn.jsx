import Eitri from 'eitri-bifrost'

export default function HeaderReturn(props) {
	const { backPage, onClick, className, bordered = false } = props

	const onBack = () => {
		if (typeof onClick === 'function') {
			return onClick()
		} else {
			if (backPage) {
				Eitri.navigation.back(backPage)
			} else {
				Eitri.navigation.back()
			}
		}
	}

	if (bordered) {
		return (
			<View
				className={`flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 ${className || ''}`}
				onClick={onBack}>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					width='20'
					height='20'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='2'
					strokeLinecap='round'
					strokeLinejoin='round'
					className='text-header-content'>
					<polyline points='15 18 9 12 15 6'></polyline>
				</svg>
			</View>
		)
	}

	return (
		<View
			className={`flex h-8 w-8 items-center justify-center rounded-full border border-[#CEC5BA] ${className || ''}`}
			onClick={onBack}>
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='24'
				height='24'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='1'
				strokeLinecap='round'
				strokeLinejoin='round'
				className='text-header-content'>
				<polyline points='15 18 9 12 15 6'></polyline>
			</svg>
		</View>
	)
}

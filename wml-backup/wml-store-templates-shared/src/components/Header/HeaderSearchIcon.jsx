import { View } from 'eitri-luminus'

export default function HeaderSearchIcon(props) {
	const { onClick } = props

	return (
		<View onClick={onClick}>
			<svg
				xmlns='http://www.w3.org/2000/svg'
				width='27'
				height='27'
				viewBox='0 0 24 24'
				fill='none'
				stroke='currentColor'
				strokeWidth='1'
				strokeLinecap='round'
				strokeLinejoin='round'
				className=''>
				<circle
					cx='11'
					cy='11'
					r='8'></circle>
				<line
					x1='21'
					y1='21'
					x2='16.65'
					y2='16.65'></line>
			</svg>
		</View>
	)
}

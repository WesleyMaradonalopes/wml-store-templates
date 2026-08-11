import VisaSvg from './Networks/Visa.svg'
import MastercardSvg from './Networks/Mastercard.svg'
import HipercardSvg from './Networks/Hipercard.svg'
import EloSvg from './Networks/Elo.svg'
import DinersSvg from './Networks/Diners.svg'
import AmericanExpressSvg from './Networks/AmericanExpress.svg'
import GooglePayIcon from './../../../assets/images/GPay_Acceptance_Mark_800.png'

export default function CardIcon(props) {
	const iconKey = props.iconKey
	const { width, height, className = '' } = props

	let icon = null

	if (iconKey === 'Visa') {
		icon = VisaSvg
	}
	if (iconKey === 'Mastercard') {
		icon = MastercardSvg
	}
	if (iconKey === 'American Express') {
		icon = AmericanExpressSvg
	}
	if (iconKey === 'Hipercard') {
		icon = HipercardSvg
	}
	if (iconKey === 'Elo') {
		icon = EloSvg
	}

	if (iconKey === 'Diners') {
		icon = DinersSvg
	}

	if (iconKey === 'WH Google Pay') {
		icon = GooglePayIcon
		return (
			<Image
				src={icon}
				className={`w-[100px] rounded ${className}`}
			/>
		)
	}

	if (!icon) {
		return null
	}

	return (
		<Image
			src={icon}
			width={width}
			height={height}
			className={`aspect-[39/25] rounded ${className}`}
		/>
	)
}

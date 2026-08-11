import Pix from './MethodIcons/Pix'
import Boleto from './MethodIcons/Boleto'
import Card from './MethodIcons/Card'

export default function MethodIcon(props) {
	const method = props.iconKey

	if (method === 'Boleto Bancário') {
		return <Boleto />
	}

	if (method === 'Pix') {
		return <Pix />
	}

	if (method === 'Cartão de Crédito') {
		return <Card />
	}

	return ''
}

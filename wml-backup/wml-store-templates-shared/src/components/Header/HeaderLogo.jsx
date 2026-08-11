import Eitri from 'eitri-bifrost'
import { Image, View } from 'eitri-luminus'

import { getRemoteAppConfigProperty } from '../../utils/getRemoteConfigStyleProperty'
import { navigateToHome } from '../../services/NavigationService'

export default function HeaderLogo({ src, transparent = false, disableClick = false, onClick = navigateToHome }) {
	const [logoURL, setLogoURL] = useState(src)

	useEffect(() => {
		if (!src) setLogoUrlFromConfigs()
	}, [])

	const setLogoUrlFromConfigs = async () => {
		try {
			const logoFromAppConfigs = await getRemoteAppConfigProperty('headerLogo')
			console.log({ logoFromAppConfigs })

			setLogoURL(logoFromAppConfigs)
		} catch (error) {
			console.error('Erro ao obter configurações remotas:', error)
		}
	}

	if (!logoURL) {
		return null
	}


	return (
		<View onClick={disableClick ? undefined : onClick}>
			<Image
				id='header-logo'
				src={logoURL}
				className='aspect-[75/19] h-auto w-[75px]'
				style={transparent ? { filter: 'brightness(0) invert(1)' } : undefined}
			/>
		</View>
	)
}

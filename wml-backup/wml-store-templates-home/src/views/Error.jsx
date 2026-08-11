import Eitri from 'eitri-bifrost'

import { GenericError } from 'wml-store-templates-shared'
import { trackScreenError } from '../services/TrackingService'

export default function Error() {
	useEffect(() => {
		trackScreenError()
	}, [])

	const navigateToHome = () => {
		Eitri.navigation.navigate({
			path: 'Home',
		})
	}

	return (
		<Page
			topInset
			bottomInset
			className='font-sans text-base text-primary'>
			<GenericError onPress={navigateToHome} />
		</Page>
	)
}

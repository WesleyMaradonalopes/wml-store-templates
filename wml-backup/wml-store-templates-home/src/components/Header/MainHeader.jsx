import { HeaderContentWrapper } from 'wml-store-templates-shared'
import Eitri from 'eitri-bifrost'

import { useLocalShoppingCart } from '../../providers/LocalCart'

export default function MainHeader({ transparentOnScroll = false, scrollThreshold }) {
	const { cart } = useLocalShoppingCart()

	const goToSearch = () => {
		Eitri.navigation.navigate({
			path: '/Search',
		})
	}

	return (
		<HeaderContentWrapper
			transparentOnScroll={transparentOnScroll}
			scrollThreshold={scrollThreshold}
			searchProps={{
				searchCollapsed: true,
				navigateToSearchOnClick: true,
				onClick: goToSearch,
			}}
			cartProps={{
				cart
			}}
		/>
	)
}

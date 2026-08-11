import Eitri from 'eitri-bifrost'

import { Loading, HeaderContentWrapper, BottomInset, HeaderCenteredLogoBar } from 'wml-store-templates-shared'

import { getCmsContent } from '../../services/CmsService'
import CmsContentRender from '../../components/CmsContentRender/CmsContentRender'
import { useLocalShoppingCart } from '../../providers/LocalCart'
import { trackScreenLandingPage } from '../../services/TrackingService'

export default function LandingPage(props) {
	const { cart } = useLocalShoppingCart()
	const [cmsContent, setCmsContent] = useState(null)
	const [isLoading, setIsLoading] = useState(true)
	const pageTitle = props?.location?.state?.title ?? ''
	const pageIcon = props?.location?.state?.icon ?? ''
	const seeAllAction = props?.location?.state?.seeAllAction ?? null
	const sourceCategoryItem = props?.location?.state?.sourceCategoryItem ?? null
	const openInBottomBar = !!props?.location?.state?.openInBottomBar


	useEffect(() => {
		loadCms()
		trackScreenLandingPage(pageTitle)
	}, [])

	const loadCms = async () => {
		try {
			const landingPageName = props?.location?.state?.landingPageName
			const { sections } = await getCmsContent('landingPage', landingPageName)
			setCmsContent(sections)
			setIsLoading(false)
		} catch (e) {
			setIsLoading(false)
		}
	}

	const goToSearch = () => {
		Eitri.navigation.navigate({
			path: '/Search',
		})
	}

	return (
		<Page
			bottomInset
			topInset
			className='font-sans text-base text-primary p-6'>
			<HeaderContentWrapper showDefaultActions={false}>
				<HeaderCenteredLogoBar onSearchClick={goToSearch} />
			</HeaderContentWrapper>

			<Loading
				fullScreen
				isLoading={isLoading}
			/>
			<CmsContentRender
				cmsContent={cmsContent}
				pageTitle={pageTitle}
				pageIcon={pageIcon}
				seeAllAction={seeAllAction}
				sourceCategoryItem={sourceCategoryItem}
			/>
			<BottomInset />
		</Page>
	)
}

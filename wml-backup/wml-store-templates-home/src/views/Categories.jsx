import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import { Loading, HeaderContentWrapper, HeaderLogo, HeaderSearchIcon, HeaderCart } from 'wml-store-templates-shared'

import { getCmsContent } from '../services/CmsService'
import CmsContentRender from '../components/CmsContentRender/CmsContentRender'
import { trackScreenCategories } from '../services/TrackingService'
import { useLocalShoppingCart } from '../providers/LocalCart'

export default function Categories() {
	const { t } = useTranslation()
	const [cmsContent, setCmsContent] = useState(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		loadCms()
		trackPage()

		Eitri.navigation.addOnResumeListener(() => {
			trackScreenCategories()
		})
	}, [])

	const loadCms = async () => {
		const { sections } = await getCmsContent('categories', 'categorias')
		setCmsContent(sections)
		setIsLoading(false)
	}

	const { cart } = useLocalShoppingCart()

	const trackPage = async () => {
		const startParams = await Eitri.getInitializationInfos()
		if (!startParams?.tabIndex) {
			trackScreenCategories()
		}
	}

	const goToSearch = () => {
		Eitri.navigation.navigate({
			path: '/Search',
		})
	}

	return (
		<Page
			title='Categorias'
			bottomInset
			topInset
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper
				compact
				height={52}
				showDefaultActions={false}
				cartProps={{ cart }}>
				<HeaderLogo />
				<View className='flex-1' />
				<View className='flex items-center gap-4'>
					<HeaderSearchIcon onClick={goToSearch} />
					<HeaderCart cart={cart} />
				</View>
			</HeaderContentWrapper>

			<Loading
				fullScreen
				isLoading={isLoading}
			/>

			<CmsContentRender cmsContent={cmsContent} />
			<View
				bottomInset={'auto'}
				className='w-full'
			/>
		</Page>
	)
}

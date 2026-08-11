import Eitri from 'eitri-bifrost'
import { View, Text, Image } from 'eitri-luminus'
import { VscChevronRight } from "react-icons/vsc";

import { getMappedComponent } from '../../utils/getMappedComponent'
import { processActions, resolveSeeAllAction } from '../../services/ResolveCmsActions'

const categorySpacingComponents = ['CategoryAccordeon', 'CategoryListSwipe']

export default function CmsContentRender(props) {
	const { cmsContent, pageTitle, pageIcon, seeAllAction, sourceCategoryItem } = props

	const [key, setKey] = useState(new Date().getTime())
	const firstCategorySpacingComponentIndex = cmsContent?.findIndex((content) => categorySpacingComponents.includes(content.name))

	const hasCategoryName = (name) => cmsContent?.some(
		(content) => content.name === name
	)

	const isLandingPage = !!pageTitle
	const hasCategorySection = categorySpacingComponents.some((name) => hasCategoryName(name))
	const showCategoryHeader = isLandingPage && hasCategorySection
	const showCategoryContainer = hasCategoryName('CategoryAccordeon') || showCategoryHeader

	const handleSeeAll = () => {
		const action = resolveSeeAllAction({
			seeAllAction,
			sourceCategoryItem,
			cmsContent,
			pageTitle,
		})

		if (!action) return
		processActions({ action, title: pageTitle })
	}

	useEffect(() => {
		if (cmsContent) {
			Eitri.navigation.addOnResumeListener(() => {
				const currentTime = new Date().getTime()
				setKey(currentTime)
			})
		}
	}, [cmsContent])

	return (
		<>
			<View className={`flex w-full flex-col pb-4 ${showCategoryContainer ? "p-2 bg-white rounded-2xl gap-4" : "gap-2"}`}>
				{showCategoryHeader && (
					<View
						className='flex w-full flex-row items-center justify-between bg-white border-b border-neutral-100 py-2'>
						<View className='flex flex-row items-center gap-4'>
							<VscChevronRight className={`h-6 w-6 transition-transform duration-200 ease-in-out rotate-180`} onClick={() => Eitri.navigation.back()} />
							{pageIcon && (
								<Image
									className='max-w-[30px]'
									src={pageIcon}
								/>
							)}
							<Text
								className='whitespace-nowrap py-1 text-lg font-medium uppercase'>
								{pageTitle}
							</Text>
						</View>
						<View
							className='h-[28px] min-h-0 border border-[#0F0805] rounded-full px-4 flex items-center justify-center text-sm'
							onClick={handleSeeAll}>
							Ver tudo
						</View>
					</View>
				)}
				{cmsContent?.map((content, index) => {
				const componentProps = {
					isLandingPage,
					...(index === firstCategorySpacingComponentIndex && { hasTopSpacing: false }),
				}
					return getMappedComponent(content, key, componentProps)
				})}
			</View>
		</>
	)
}

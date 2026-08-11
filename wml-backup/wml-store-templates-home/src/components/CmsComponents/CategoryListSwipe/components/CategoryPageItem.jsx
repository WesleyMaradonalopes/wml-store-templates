import Eitri from 'eitri-bifrost'

import { HeaderReturn, HeaderContentWrapper, HeaderText } from 'wml-store-templates-shared'

import CategoryTitle from './CategoryTitle'
import { useLocalShoppingCart } from '../../../../providers/LocalCart'

export default function CategoryPageItem(props) {
	const { item, goToItem, isLandingPage } = props

	const { cart } = useLocalShoppingCart()

	const [showSubItems, setShowSubItems] = useState(false)

	useEffect(() => {
		if (showSubItems) {
			Eitri.navigation.addBackHandler(() => {
				setShowSubItems(false)
				return false
			})
		} else {
			Eitri.navigation.clearBackHandlers()
		}
	}, [showSubItems])

	const handleItemPress = (item) => {
		if (item.subcategories && item.subcategories.length > 0) {
			setShowSubItems(true)
		} else {
			goToItem(item)
		}
	}

	return (
		<>
			<CategoryTitle
				icon={item.icon}
				title={item.title}
				hasSubItems={item.subcategories && item.subcategories.length > 0}
				onClick={() => handleItemPress(item)}
				isLandingPage={isLandingPage}
			/>
			<View
				className={`fixed flex h-screen flex-col ${showSubItems ? 'left-0' : 'left-[100vw]'} transition-left top-0 bottom-0 right-0  z-[9999] duration-300`}>

				<View onClick={() => setShowSubItems(false)} topInset={'auto'} className={`flex flex-row items-center backdrop-blur-none bg-white m-0 p-4 gap-4`}>
					<HeaderReturn />
					<HeaderText text={item.title}>{item.title}</HeaderText>
				</View>

				<View
					bottomInset={'auto'}
					className='flex-1 overflow-y-auto bg-base-100'>
					<View className='flex flex-col gap-4 p-4'>
						{item?.action && (
							<CategoryTitle
								icon={item.icon}
								hasSubItems={false}
								title={`Ver tudo em ${item.title}`}
								onClick={() => goToItem(item)}
							/>
						)}
						{item?.subcategories?.map((subItem, index) => (
							<CategoryTitle
								key={subItem.title}
								icon={subItem.icon}
								hasSubItems={false}
								title={subItem.title}
								onClick={() => handleItemPress(subItem)}
							/>
						))}
					</View>
				</View>
			</View>
		</>
	)
}

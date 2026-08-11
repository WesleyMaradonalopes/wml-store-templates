import { View } from 'eitri-luminus'

import CategoryPageItem from './components/CategoryPageItem'
import { processActions } from '../../../services/ResolveCmsActions'

export default function CategoryListSwipe(props) {
	const { data, hasTopSpacing, isLandingPage } = props

	const openItem = (item) => {
		processActions(item)
	}

	if (!data?.content) return null

	const listItems = data.content.map((item) => (
		<CategoryPageItem
			key={item.title}
			item={item}
			goToItem={openItem}
			isLandingPage={isLandingPage}
		/>
	))

	if (isLandingPage) {
		return (
			<View className={`flex w-full flex-col gap-4 px-4 overflow-hidden ${hasTopSpacing ? 'mt-2' : ''}`}>
				{listItems}
			</View>
		)
	}

	const listItemsWithBorder = data.content.map((item, index) => (
		<View
			key={item.title}
			className={index < data.content.length - 1 ? 'border-b border-neutral-100' : ''}>
			<CategoryPageItem
				item={item}
				goToItem={openItem}
				isLandingPage={isLandingPage}
			/>
		</View>
	))

	return (
		<View className={`max-w-screen flex flex-col gap-0 overflow-x-hidden px-3 ${hasTopSpacing ? 'mt-4' : ''}`}>
			<View className='flex flex-col overflow-hidden gap-0 rounded-xl bg-white px-4 shadow-sm'>
				{listItemsWithBorder}
			</View>
		</View>
	)
}

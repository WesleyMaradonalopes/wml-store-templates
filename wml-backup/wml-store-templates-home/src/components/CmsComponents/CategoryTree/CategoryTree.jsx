import Eitri from 'eitri-bifrost'
import { Text, View } from 'eitri-luminus'

import { useEffect, useState } from 'react'
import { Vtex } from 'eitri-shopping-vtex-shared'

import { resolveNavigation } from '../../../services/NavigationService'
import { processActions } from '../../../services/ResolveCmsActions'
import ListWithImages from './components/ListWithImages'
import SimpleList from './components/SimpleList'
export default function CategoryTree(props) {
	const { data } = props
	const [currentShelf, setCurrentShelf] = useState(null)
	const legacySearch = Vtex?.configs?.searchOptions?.legacySearch
	useEffect(() => {
		if (data?.shelves) {
			setCurrentShelf(data.shelves[0])
		}
	}, [data?.shelves])
	const onChooseShelf = (shelf) => {
		setCurrentShelf(shelf)
	}
	const chooseCategory = (category) => {
		if (category?.action) {
			processActions(category)
			return
		}

		if (legacySearch) {
			Eitri.navigation.navigate({
				path: 'ProductCatalog',
				state: {
					facets: category.facets,
					title: category.title,
				},
			})
			return
		}
		resolveNavigation(category.facets, category.title)
	}
	return (
		<View className='flex flex-col gap-4 py-4'>
			{/* Tabs */}
			<View className='flex w-full overflow-x-auto px-2'>
				{(data.shelves?.length > 1 || (data.shelves?.length === 1 && data.shelves[0].title)) && (
					<View className='flex h-10 gap-2'>
						{data.shelves?.map((shelf) => (
							<View key={shelf.title}>
								{shelf.title && (
									<View
										onClick={() => onChooseShelf(shelf)}
										data-active={shelf.title === currentShelf?.title}
										className='flex items-center justify-center rounded-full border border-primary px-4 text-primary data-[active=true]:bg-primary data-[active=true]:text-white'>
										<Text className='text-sm font-normal'>{shelf.title}</Text>
									</View>
								)}
							</View>
						))}
					</View>
				)}
			</View>

			{/* Content */}
			{currentShelf &&
				(currentShelf.showAsSimpleItem ? (
					<SimpleList
						currentShelf={currentShelf}
						chooseCategory={chooseCategory}
					/>
				) : (
					<ListWithImages
						currentShelf={currentShelf}
						chooseCategory={chooseCategory}
					/>
				))}
		</View>
	)
}

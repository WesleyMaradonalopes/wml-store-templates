import { RichText } from 'wml-store-templates-shared'

import Banner from '../components/CmsComponents/Banner/Banner'
import ProductShelf from '../components/CmsComponents/ProductShelf/ProductShelf'
import ProductTiles from '../components/CmsComponents/ProductTiles/ProductTiles'
import CategoryTree from '../components/CmsComponents/CategoryTree/CategoryTree'
import LastSeenProducts from '../components/CmsComponents/LastSeenProducts/LastSeenProducts'
import CategoryListSwipe from '../components/CmsComponents/CategoryListSwipe/CategoryListSwipe'
import ProductInfiniteScroll from '../components/CmsComponents/ProductInfiniteScroll/ProductInfiniteScroll'
import BlogPostShelf from '../components/CmsComponents/Blog/BlogPostShelf'
import HighlightedProductShelf from '../components/CmsComponents/HighlightedProductShelf/HighlightedProductShelf'
import CategoryAccordion from '../components/CmsComponents/CategoryAccordion/CategoryAccordion'

const componentMap = {
	MultipleImageBanner: Banner,
	RichText: RichText,
	ProductTiles: ProductTiles,
	ProductShelf: ProductShelf,
	CategoryTree: CategoryTree,
	LastSeenProducts: LastSeenProducts,
	CategoryListSwipe: CategoryListSwipe,
	ProductInfiniteScroll: ProductInfiniteScroll,
	WordPressCardList: BlogPostShelf,
	HighlightedProductShelf: HighlightedProductShelf,
	CategoryAccordeon: CategoryAccordion
}

const shouldReloadOnResume = (componentName) => {
	const componentsToReload = ['LastSeenProducts']
	return componentsToReload.includes(componentName)
}

export const getMappedComponent = (content, reloadKey, componentProps = {}) => {
	const Component = componentMap[content.name]
	if (!Component) {
		console.error(`Component ${content.name} does not exist in the component map.`)
		return null
	}

	const key = content.id + (shouldReloadOnResume(content.name) ? reloadKey : '')

	try {
		return (
			<Component
				key={key}
				data={content.data}
				{...componentProps}
			/>
		)
	} catch (error) {
		console.error(`Error rendering component ${content.name}:`, error)
		return null
	}
}

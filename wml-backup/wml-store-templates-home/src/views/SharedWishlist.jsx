import { useState, useEffect } from 'react'
import { HeaderContentWrapper, HeaderReturn, BottomInset } from 'wml-store-templates-shared'
import { useLocalShoppingCart } from '../providers/LocalCart'
import ProductCard from '../components/ProductCard/ProductCard'
import { getProductById } from '../services/ProductService'

function extractTagFromDeeplink(deeplink) {
	try {
		return new URL(deeplink).searchParams.get('tag')
	} catch {
		return null
	}
}

function decodeTag(tag) {
	try {
		const raw = decodeURIComponent(escape(atob(tag)))
		const [name = '', productIdsPart] = raw.split('|')
		const productIds = productIdsPart?.split(',').filter(Boolean) ?? []
		return { name, productIds }
	} catch {
		return { name: '', productIds: [] }
	}
}

function SharedWishlistItem({ productId }) {
	const [product, setProduct] = useState(null)

	useEffect(() => {
		getProductById(productId)
			.then(setProduct)
			.catch((e) => console.error('Erro ao buscar produto', e))
	}, [productId])

	if (!product) return null
	return <ProductCard product={product} />
}

export default function SharedWishlist(props) {
	const deeplink = props?.location?.state?.deeplink
	const tag = extractTagFromDeeplink(deeplink) ?? ''
	const { name, productIds } = decodeTag(tag)
	const { cart } = useLocalShoppingCart()
	const title = name ? `Favoritos de ${name}` : 'Lista de favoritos compartilhada'

	return (
		<Page
			title='Favoritos compartilhados'
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<View className='min-w-0 flex-1 overflow-hidden'>
					<Text className='text-header-content block w-full overflow-hidden text-ellipsis whitespace-nowrap text-xl font-bold'>{title}</Text>
				</View>
			</HeaderContentWrapper>

			{productIds.length > 0 ? (
				<View className='grid grid-cols-2 gap-x-2 gap-y-4 p-4'>
					{productIds.map((productId) => (
						<SharedWishlistItem
							key={productId}
							productId={productId}
						/>
					))}
				</View>
			) : (
				<View className='flex flex-col items-center justify-center p-8'>
					<Text className='text-center text-sm text-secondary'>Nenhum produto encontrado no link compartilhado.</Text>
				</View>
			)}

			<BottomInset />
		</Page>
	)
}

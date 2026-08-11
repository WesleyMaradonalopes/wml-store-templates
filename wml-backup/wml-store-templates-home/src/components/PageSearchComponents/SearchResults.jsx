import { View, Text } from 'eitri-luminus'

import { Loading } from 'wml-store-templates-shared'

import ProductCard from '../ProductCard/ProductCard'
import SearchTermPills from '../CmsComponents/SearchTermPills/SearchTermPills'

export default function SearchResults(props) {
	const { searchResults, isLoading, onTermClick, searchTerm } = props

	if (searchResults.length === 0 && !isLoading) {
		return (
			<View className='py-4 gap-8 flex flex-col mx-4'>
				<View className='flex flex-col items-start justify-center gap-4 py-4 px-4 border border-[#EFEDEA;] rounded-2xl bg-white'>
					<Text className='font-serif w-full text-left text-lg font-semibold text-[#1E120D]'>
						Nenhum resultado encontrado
					</Text>
					<Text
						className='w-full text-left text-[#575756]'
						style={{
							fontFamily: 'Montserrat',
							fontWeight: 500,
							fontSize: 14,
							lineHeight: 20,
							letterSpacing: '0%',
						}}>
						Infelizmente, não encontramos nenhum resultado para{' '}
						<Text className='font-bold'>{`"${searchTerm || ''}"`}</Text>.
					</Text>
				</View>

				<View className='px-2 py-4 border border-[#EFEDEA;] rounded-2xl bg-white'>
					<SearchTermPills onTermClick={onTermClick} />
				</View>
			</View>
		)
	}

	return (
		<View className='flex flex-col gap-4 p-4'>
			<View className='grid grid-cols-2 gap-x-2 gap-y-6'>
				{searchResults.map((product, index) => {
					const isLarge = (index + 1) % 5 === 0
					return (
						<View
							key={product.productId}
							className={`w-full ${isLarge ? 'col-span-2' : ''}`}>
							<ProductCard product={product} />
						</View>
					)
				})}
			</View>

			{isLoading && (
				<View className='flex items-center justify-center'>
					<Loading />
				</View>
			)}
		</View>
	)
}

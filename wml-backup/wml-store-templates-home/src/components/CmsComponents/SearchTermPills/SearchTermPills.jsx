import { View, Text } from 'eitri-luminus'
import { useEffect, useState } from 'react'
import { getTopSearches } from '../../../services/CatalogService'

export default function SearchTermPills({ title = 'Em alta', onTermClick }) {
	const [apiTerms, setApiTerms] = useState([])

	useEffect(() => {
		getTopSearches()
			.then((result) => {
				if (result?.length) {
					setApiTerms(result)
				}
			})
			.catch(() => { })
	}, [])

	if (!apiTerms?.length) return null

	const handleTermClick = (term) => {
		if (typeof onTermClick === 'function') {
			onTermClick(term)
		}
	}

	return (
		<View className='flex flex-col gap-3 px-4'>
			<Text className='text-lg font-serif text-[#1E120D]'>{title}</Text>
			<View className='flex flex-row flex-wrap gap-2'>
				{apiTerms.map((item) => {
					const term = typeof item === 'string' ? item : item?.term
					if (!term) return null

					return (
						<View
							key={term}
							className='rounded-full border border-neutral-300 px-4 py-2'
							onClick={() => handleTermClick(term)}>
							<Text className='text-[14px] font-montserrat font-medium capitalize text-[#0F0805]'>{term}</Text>
						</View>
					)
				})}
			</View>
		</View>
	)
}

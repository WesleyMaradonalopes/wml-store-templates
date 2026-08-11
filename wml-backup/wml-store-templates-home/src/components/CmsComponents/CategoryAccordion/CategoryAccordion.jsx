import { useState } from 'react'
import { Text, View, Image } from 'eitri-luminus'
import { IoChevronForwardSharp } from "react-icons/io5";

import {processActions} from "../../../services/ResolveCmsActions";

function CategoryFlag({ label }) {
	if (!label) return null

	return (
		<View className='flex h-[18px] w-[80px] shrink-0 items-center justify-center rounded-full border border-[#575756]'>
			<Text className='text-xs font-normal text-[#575756]'>{label}</Text>
		</View>
	)
}

export default function CategoryAccordeon(props) {
	const { data, hasTopSpacing } = props

	const [isExpanded, setIsExpanded] = useState(data?.isExpanded === true)
	const [openIndex, setOpenIndex] = useState(null)

	const toggleAccordion = index => {
		setOpenIndex(openIndex === index ? null : index)
	}

	const goToCategoryPage = category => {
		processActions(category)
	}

	return (
		<View
			className={`flex w-full flex-col gap-4 px-4 bg-white ${hasTopSpacing ? 'mt-2' : ''}`}>
			{data?.title && (
				<View
					className='flex w-full flex-row items-center justify-between'
					onClick={() => setIsExpanded(prev => !prev)}>
					<Text
						className='whitespace-nowrap py-2 text-lg font-bold'>
						{data.title}
					</Text>
					<IoChevronForwardSharp className={`h-6 w-6 transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-90' : 'rotate-0'}`} />
				</View>
			)}
			{isExpanded && (
				<View className='flex w-full flex-col gap-4'>
					{data?.content?.map((category, index) => (
						<View key={index}>
							<View
								className='flex w-full flex-row items-center justify-between border-l-2 border-l-neutral-300 py-2 pl-2'>
								<View
									className='flex w-full flex-row items-center gap-4'
									onClick={() => goToCategoryPage(category)}>
									{category.imageUrl && <Image src={category.imageUrl} className='h-6 w-6' />}
									<Text
										className={`whitespace-nowrap p-1 text-md ${category.flag ? 'font-semibold' : 'font-regular'} ${category.title.includes('Ver tudo') && 'underline'}`}>
										{category.title}
									</Text>
									<CategoryFlag label={category.flag} />
								</View>
								{Array.isArray(category.subcategories) && category.subcategories.length > 0 && (
									<View
										onClick={() => toggleAccordion(index)}
										className='flex w-full flex-row justify-end'>
										<IoChevronForwardSharp className={`h-6 w-6 transition-transform duration-200 ease-in-out ${openIndex === index ? 'rotate-90' : 'rotate-0'}`} />
									</View>
								)}
							</View>
							{openIndex === index && (
								<View
									className='flex flex-col gap-4 p-1'>
									{category.subcategories.map((subcategory, subIndex) => (
										<View
											key={subIndex}>
											<View onClick={() => goToCategoryPage(subcategory)}>
												<Text
													className='p-1 text-sm font-normal uppercase'>
													{subcategory.title}
												</Text>
											</View>
										</View>
									))}
								</View>
							)}
						</View>
					))}
				</View>
			)}
		</View>
	)
}

import { useTranslation } from 'eitri-i18n'
import { View, Text, HTMLRender } from 'eitri-luminus'

import { useState } from 'react'

import CollapseWrapper from './components/CollapseWrapper'

export default function Description(props) {
	const { description } = props

	const [showMore, setShowMore] = useState(false)
	const isLongDescription = description?.length > 100

	const { t } = useTranslation()

	const toggleShowMore = () => {
		setShowMore(!showMore)
	}

	return (
		<CollapseWrapper
			title={t('description.txtDescription')}
			defaultCollapsed={false}>
			<View className='relative overflow-y-hidden'>
				<HTMLRender className='font-montserrat !font-normal !text-xs !leading-[16.8px] !tracking-[0px]' html={description} />
			</View>
		</CollapseWrapper>
	)
}

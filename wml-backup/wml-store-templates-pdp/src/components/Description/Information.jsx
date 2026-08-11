import { useTranslation } from 'eitri-i18n'
import { View, Text, HTMLRender } from 'eitri-luminus'

import { App } from 'eitri-shopping-vtex-shared'

import CollapseWrapper from './components/CollapseWrapper'

export default function Information(props) {
	const { t } = useTranslation()
	const { product } = props
	const { properties = [] } = product ?? {}
	const { values: [composition] = [] } = properties.find((property) => property.name === 'Composição') ?? {}
	const { values: [care] = [] } = properties.find((property) => property.name === 'Cuidados') ?? {}

	return (
		<CollapseWrapper
			title={t('information.txtCompositionAndCare')}
			defaultCollapsed={true}>
			<View className='flex flex-col gap-2 lowercase'>
				<Text className='font-montserrat font-normal text-xs leading-[16.8px] tracking-[0px]' >{composition}</Text>
				<Text className='font-montserrat font-normal text-xs leading-[16.8px] tracking-[0px]' >{care}</Text>
			</View>
		</CollapseWrapper>
	)
}

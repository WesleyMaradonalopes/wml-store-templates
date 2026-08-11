import { Text, View } from 'eitri-luminus'

export default function RichText(props) {
	const { data } = props
	const { content, useAsTitle } = data ?? {}

	const { blocks } = (() => {
		try {
			return JSON.parse(content || '{}')
		} catch (error) {
			console.error(error)
			return {}
		}
	})()

	return (
		<View
			data-as-title={useAsTitle ? '' : undefined}
			className='flex w-full flex-col px-4'>
			<Text className='font-montserrat font-bold text-[16px]'>{data.title}</Text>
			<View className='flex flex-col'>
				{blocks?.map((cont, index) => (
					<Text
						key={index}
						className='font-sans text-sm font-light'>
						{cont.text}
					</Text>
				))}
			</View>
		</View>
	)
}

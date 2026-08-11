import { Image, Text, View } from 'eitri-luminus'
import { VscChevronRight } from "react-icons/vsc";

export default function CategoryTitle(props) {
	const { onClick, title, icon, isLandingPage } = props

	return (
		<View
			onClick={onClick}
			className={`flex w-full flex-row items-center justify-between bg-white ${isLandingPage ? '' : 'h-12 uppercase text-lg'}`}>
			<View className='flex w-full flex-row items-center gap-4'>
				{icon && (
					<Image
						className={isLandingPage ? 'h-6 w-6' : 'max-w-[30px]'}
						src={icon}
					/>
				)}
				<Text className={isLandingPage ? 'whitespace-nowrap py-2 text-lg font-bold' : 'font-montserrat text-[14px] font-medium'}>
					{title}
				</Text>
			</View>
			{!isLandingPage && (
				<VscChevronRight
					className='h-6 w-6'
					// strokeWidth={1}
				/>
			)}
		</View>
	)
}

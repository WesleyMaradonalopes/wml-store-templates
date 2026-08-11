import { View, Text, HTMLRender } from 'eitri-luminus'

import CustomModal from '../CustomModal/CustomModal'

export default function SizebayModal(props) {
	const { frameUrl, showModal, onClose } = props

	const handleContentClick = (e) => {
		e.stopPropagation()
	}

	return (
		<CustomModal
			open={showModal}
			onClose={onClose}>
			<View className='flex h-full w-full flex-col'>
				{/* Top inset */}
				<View topInset={'auto'} />

				{/* Content */}
				<View
					onClick={handleContentClick}
					className='relative flex h-screen w-full flex-col overflow-hidden rounded-t-lg bg-base-100'>
					{/* Close button */}
					<View
						onClick={onClose}
						className='absolute right-3 top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-neutral-900'>
						<Text
							color='neutral-900'
							fontSize='small'
							fontWeight='bold'
							padding='small'>
							X
						</Text>
					</View>

					{/* <View topInset /> */}
					<HTMLRender
						className='flex-1'
						allowUnsafeIframe={true}
						html={`<iframe allow="fullscreen; autoplay; playsinline; picture-in-picture; clipboard-read; clipboard-write;" style="height: 100%; width: 100%; border: none;" src="${frameUrl}" />`}
					/>
				</View>

				{/* Bottom inset */}
				<View bottomInset />
			</View>
		</CustomModal>
	)
}

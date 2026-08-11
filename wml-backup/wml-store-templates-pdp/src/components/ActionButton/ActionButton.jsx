import { useTranslation } from 'eitri-i18n'
import { Text, View } from 'eitri-luminus'

import { useState } from 'react'

import { BottomInset } from 'wml-store-templates-shared'


import { formatPrice } from '../../utils/utils'

export default function ActionButton({
	isVisible,
	modalContent,
	currentSku,
	product
}) {
	const { t } = useTranslation()

	const [showQuickAddModal, setShowQuickAddModal] = useState(false)
	const { sellers = [] } = currentSku ?? {}
	const [mainSeller] = sellers.filter((seller) => seller.sellerDefault) ?? sellers
	const price = mainSeller?.commertialOffer?.Price

	return (
		<>
			<View
				className={`fixed bottom-0 left-0 right-0 z-[999] border-t border-gray-300 bg-white transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
			>
				<View className="px-5 py-[14.5px] flex flex-row items-center justify-between bg-[#1A1A1A4D] backdrop-blur-[50px]">

					<View className="flex flex-col gap-1 w-[50%]">
						<Text
							className="text-[12px] font-medium text-white line-clamp-2"
						>
							{product.productName}
						</Text>

						<Text className="text-[16px] font-semibold text-white leading-[120%]">
							{formatPrice(price)}
						</Text>
					</View>

					<View
						onClick={() => setShowQuickAddModal(true)}
						className="w-[134px] h-[40px] bg-white rounded-[8px] flex flex-row items-center justify-center gap-2"
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path fillRule="evenodd" clipRule="evenodd" d="M11.5 1C12.5971 1 13.528 1.39185 14.2919 2.17631C15.0559 2.96077 15.4374 3.91687 15.4374 5.04324V5.82703H19.3748V22H3.62515V5.82703H7.56258V5.04324C7.56258 3.91685 7.94414 2.96078 8.70812 2.17631C9.4721 1.39185 10.403 1 11.5 1ZM4.44832 6.67235V21.1547H18.5517V6.67235H4.44832ZM11.5 1.84532C10.6186 1.84532 9.87891 2.15117 9.28151 2.76446C8.68403 3.37796 8.38574 4.13809 8.38574 5.04324V5.82703H14.6143V5.04324C14.6143 4.13809 14.3159 3.37796 13.7185 2.76446C13.1211 2.15115 12.3813 1.84532 11.5 1.84532Z" fill="#0F0805" />
						</svg>

						<Text className="text-[#0F0805] text-sm font-semibold">
							Adicionar
						</Text>
					</View>
				</View>
				<View className="bg-[#1A1A1A4D] backdrop-blur-[50px]">
					<BottomInset />
				</View>
			</View>

			<CustomModal
				open={showQuickAddModal}
				onClose={() => setShowQuickAddModal(false)}
			>
				<View
					onClick={(e) => e.stopPropagation()}
					className='relative flex w-full flex-col'>
					<View
						onClick={() => setShowQuickAddModal(false)}
						className="absolute top-[10px] right-[14px]">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M20.4235 3.50012C20.4334 3.50014 20.4435 3.50216 20.4528 3.50598C20.462 3.50982 20.4702 3.51558 20.4772 3.52258C20.4841 3.52951 20.4899 3.53769 20.4938 3.547C20.4976 3.55625 20.4996 3.56635 20.4996 3.57629C20.4996 3.58626 20.4976 3.5963 20.4938 3.60559C20.4899 3.61494 20.4841 3.62306 20.4772 3.63L12.4615 11.6447L12.108 11.9982L12.4615 12.3527L20.4762 20.3702C20.4905 20.3845 20.4987 20.4037 20.4987 20.424C20.4986 20.4442 20.4904 20.4634 20.4762 20.4777C20.4619 20.4919 20.4427 20.5001 20.4225 20.5001C20.4023 20.5001 20.3831 20.4919 20.3688 20.4777L12.3531 12.463L11.9996 12.1095L11.6461 12.463L3.63049 20.4777C3.61617 20.492 3.59606 20.5001 3.57581 20.5001C3.55563 20.5001 3.53636 20.4919 3.52209 20.4777C3.50773 20.4633 3.49966 20.444 3.49963 20.424C3.49963 20.4039 3.50776 20.3846 3.52209 20.3702L11.5387 12.3527L11.8922 11.9982L11.5387 11.6447L3.52307 3.63C3.50867 3.61561 3.50061 3.59638 3.50061 3.57629C3.50064 3.55625 3.5087 3.53695 3.52307 3.52258C3.53738 3.50834 3.55658 3.50012 3.57678 3.50012C3.59699 3.50014 3.6162 3.50832 3.63049 3.52258L11.6461 11.5372L11.9996 11.8907L12.3531 11.5372L20.3698 3.52258C20.3768 3.51559 20.385 3.5098 20.3942 3.50598C20.4034 3.50215 20.4134 3.50012 20.4235 3.50012Z" fill="#0F0805" stroke="#0F0805" />
						</svg>
					</View>
					{modalContent}
				</View>
			</CustomModal>
		</>
	)
}

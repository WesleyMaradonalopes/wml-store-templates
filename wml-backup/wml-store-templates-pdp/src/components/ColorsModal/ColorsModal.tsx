import { View, Text, Image } from 'eitri-luminus'
import { BottomInset } from 'wml-store-templates-shared'
import { openProduct } from '../../services/NavigationService'

import CustomModal from '../CustomModal/CustomModal'

export default function ColorsModal(props: any) {
	const { open, onClose, similars } = props

	return (
		<>
			<CustomModal open={open} onClose={onClose}>
				<View className="flex w-full flex-col bg-base-100 rounded-t-[16px] pt-[10px] px-[34px] pb-4">

					<View className="flex w-full flex-row items-center justify-between">
						<Text className="text-[14px] font-medium text-[#0F0805]">
							Ver cores ({similars?.length})
						</Text>

						<View
							role="button"
							aria-label="Fechar modal"
							onClick={onClose}
							className="flex h-[24px] w-[24px] items-center justify-center bg-base-100"
						>
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M20.4234 3.50012C20.4334 3.50014 20.4435 3.50216 20.4527 3.50598C20.4619 3.50982 20.4701 3.51558 20.4771 3.52258C20.4841 3.52951 20.4899 3.53769 20.4937 3.547C20.4976 3.55625 20.4996 3.56635 20.4996 3.57629C20.4996 3.58626 20.4976 3.5963 20.4937 3.60559C20.4899 3.61494 20.4841 3.62306 20.4771 3.63L12.4615 11.6447L12.108 11.9982L12.4615 12.3527L20.4762 20.3702C20.4904 20.3845 20.4986 20.4037 20.4986 20.424C20.4986 20.4442 20.4904 20.4634 20.4762 20.4777C20.4619 20.4919 20.4426 20.5001 20.4225 20.5001C20.4023 20.5001 20.383 20.4919 20.3687 20.4777L12.3531 12.463L11.9996 12.1095L11.6461 12.463L3.63046 20.4777C3.61614 20.492 3.59603 20.5001 3.57578 20.5001C3.5556 20.5001 3.53633 20.4919 3.52206 20.4777C3.5077 20.4633 3.49963 20.444 3.4996 20.424C3.4996 20.4039 3.50773 20.3846 3.52206 20.3702L11.5387 12.3527L11.8922 11.9982L11.5387 11.6447L3.52304 3.63C3.50864 3.61561 3.50058 3.59638 3.50058 3.57629C3.50061 3.55625 3.50867 3.53695 3.52304 3.52258C3.53735 3.50834 3.55655 3.50012 3.57675 3.50012C3.59696 3.50014 3.61617 3.50832 3.63046 3.52258L11.6461 11.5372L11.9996 11.8907L12.3531 11.5372L20.3697 3.52258C20.3768 3.51559 20.3849 3.5098 20.3941 3.50598C20.4034 3.50215 20.4134 3.50012 20.4234 3.50012Z" fill="#0F0805" stroke="#0F0805" />
							</svg>
						</View>
					</View>

					<View className="mt-3 max-h-[60vh] overflow-y-auto pb-2">
						<View className="grid grid-cols-3 gap-x-[11px] gap-y-[15px]">
							{similars?.map((similar: any, index: number) => (
								<View key={index} className="flex flex-col gap-1" onClick={() => openProduct(similar)}>
									<Image
										src={similar?.items?.[0]?.images?.[0]?.imageUrl}
										className="w-full h-auto rounded-[8px] object-contain"
									/>
									<Text className="text-[10px] font-medium text-[#0F0805]">
										{
											similar?.properties?.find(
												(item: any) => item.name === "Cor em Atributo de Produto"
											)?.values?.[0]
										}
									</Text>
								</View>
							))}
						</View>
					</View>

					<BottomInset />
				</View>
			</CustomModal>
		</>
	)
}

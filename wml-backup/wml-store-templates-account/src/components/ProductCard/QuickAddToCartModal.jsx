import Eitri from 'eitri-bifrost'
import { View, Text, Button } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'
import {useState, useEffect} from 'react'
import { isSkuAvailable } from 'wml-store-templates-shared'

import CustomModal from '../CustomModal/CustomModal'
import QuickSkuSelector from './QuickSkuSelector'

export default function QuickAddToCartModal(props) {
	const { open, onClose, product, currentSku, onSkuChange, onConfirm, loading } = props
	const [userHasSelected, setUserHasSelected] = useState(false)
	const { t } = useTranslation()

	const isCurrentSkuAvailable = isSkuAvailable(currentSku)

	useEffect(() => {
		if (open) {
			Eitri.bottomBar.hide()
			return () => {
				Eitri.bottomBar.show()
			}
		}
	}, [open])

	useEffect(() => {
        if (!open) {
            setUserHasSelected(false)
        }
    }, [open])

	if (!open || !product) return null

	const handleConfirm = () => {
		if (!userHasSelected || loading || !isCurrentSkuAvailable) {
			return
		}
		onConfirm()
	}

	const handleContainerClick = (event) => {
		event.stopPropagation()
	}

	return (
		<CustomModal
			open={open}
			onClose={onClose}>
			<View
				onClick={handleContainerClick}
				className='relative flex w-full flex-col'>
				<View
					onClick={onClose}
					className='absolute right-[14px] top-[10px] z-10'>
					<svg
						width='24'
						height='24'
						viewBox='0 0 24 24'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'>
						<path
							d='M20.4235 3.50012C20.4334 3.50014 20.4435 3.50216 20.4528 3.50598C20.462 3.50982 20.4702 3.51558 20.4772 3.52258C20.4841 3.52951 20.4899 3.53769 20.4938 3.547C20.4976 3.55625 20.4996 3.56635 20.4996 3.57629C20.4996 3.58626 20.4976 3.5963 20.4938 3.60559C20.4899 3.61494 20.4841 3.62306 20.4772 3.63L12.4615 11.6447L12.108 11.9982L12.4615 12.3527L20.4762 20.3702C20.4905 20.3845 20.4987 20.4037 20.4987 20.424C20.4986 20.4442 20.4904 20.4634 20.4762 20.4777C20.4619 20.4919 20.4427 20.5001 20.4225 20.5001C20.4023 20.5001 20.3831 20.4919 20.3688 20.4777L12.3531 12.463L11.9996 12.1095L11.6461 12.463L3.63049 20.4777C3.61617 20.492 3.59606 20.5001 3.57581 20.5001C3.55563 20.5001 3.53636 20.4919 3.52209 20.4777C3.50773 20.4633 3.49966 20.444 3.49963 20.424C3.49963 20.4039 3.50776 20.3846 3.52209 20.3702L11.5387 12.3527L11.8922 11.9982L11.5387 11.6447L3.52307 3.63C3.50867 3.61561 3.50061 3.59638 3.50061 3.57629C3.50064 3.55625 3.5087 3.53695 3.52307 3.52258C3.53738 3.50834 3.55658 3.50012 3.57678 3.50012C3.59699 3.50014 3.6162 3.50832 3.63049 3.52258L11.6461 11.5372L11.9996 11.8907L12.3531 11.5372L20.3698 3.52258C20.3768 3.51559 20.385 3.5098 20.3942 3.50598C20.4034 3.50215 20.4134 3.50012 20.4235 3.50012Z'
							fill='#0F0805'
							stroke='#0F0805'
						/>
					</svg>
				</View>

				<View className='rounded-t-[16px] bg-white'>
					<View className='mx-[34px] mb-[22px] mt-[13px]'>
						<Text className='font-sans text-sm leading-[150%] text-[#0F0805]'>
							<Text className='font-normal'>Tamanho: </Text>
							<Text className='font-semibold'>Escolha um tamanho</Text>
						</Text>
					</View>

					<View className='mt-4 px-[34px]'>
						<QuickSkuSelector
							product={product}
							currentSku={currentSku}
							onSkuChange={onSkuChange}
							onInteraction={() => setUserHasSelected(true)}
						/>
					</View>

					<View className='mt-8 px-[34px] pb-[16px]'>
						<Button
							className={`w-full rounded-pill transition-all duration-300 ${
								!userHasSelected || loading || !isCurrentSkuAvailable ? 'opacity-40 grayscale-[50%]' : 'opacity-100'
							}`}
							onClick={handleConfirm}>
							<Text className='font-sans text-sm font-semibold text-base-100'>
								{loading
									? t('productCardQuickAdd.loading', 'Adicionando à sacola...')
									: t('productCardQuickAdd.add', 'Adicionar à sacola')}
							</Text>
						</Button>
					</View>
				</View>
			</View>
		</CustomModal>
	)
}

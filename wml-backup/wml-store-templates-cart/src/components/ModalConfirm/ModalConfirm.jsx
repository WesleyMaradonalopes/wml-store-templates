import { useTranslation } from 'eitri-i18n'
import { Text, View } from 'eitri-luminus'

import { CustomButton } from 'wml-store-templates-shared'

export default function ModalConfirm(props) {
	const { t } = useTranslation()
	const { text, showModal, removeItem, closeModal } = props

	if (!showModal) return null

	return (
		<View
			className='fixed inset-0 z-[9999] flex items-center justify-center !bg-black/70 !opacity-100'
			onClick={() => {
				if (typeof closeModal === 'function') closeModal()
			}}>
			<View className='mx-auto flex w-11/12 max-w-xs flex-col items-center rounded bg-base-100 p-4'>
				<Text className='mb-6 text-center text-lg font-bold text-base-content'>{text}</Text>
				<View className='flex w-full flex-col gap-3'>
					<CustomButton
						label={t('modal.confirm.delete')}
						className='btn-error btn-block'
						onClick={removeItem}
					/>
					<CustomButton
						variant='outlined'
						label={t('modal.confirm.cancel')}
						onClick={closeModal}
					/>
				</View>
			</View>
		</View>
	)
}

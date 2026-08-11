import { View } from 'eitri-luminus'

export default function CustomModal(props) {
	const { children, open, onClose } = props

	if (!open) return null

	return (
		<View
			data-modal-active={open ? '' : undefined}
			className='data-[modal-active]:[html]:bg-red-500 fixed inset-0 z-[9999] flex items-end justify-center !bg-black/70 !opacity-100 [html:has(&[data-modal-active])]:overflow-hidden'
			onClick={() => {
				if (typeof onClose === 'function') onClose()
			}}>
			{children}
		</View>
	)
}

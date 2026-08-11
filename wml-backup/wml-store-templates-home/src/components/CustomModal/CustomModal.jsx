import { View } from 'eitri-luminus'
import { createPortal } from 'react-dom'

export default function CustomModal(props) {
	const { children, open, onClose } = props

	if (!open) return null

	const modal = (
		<View
			data-modal-active={open ? '' : undefined}
			className='fixed inset-0 z-[9999] flex items-end justify-center !bg-black/70 !opacity-100 [html:has(&[data-modal-active])]:overflow-hidden'
			onClick={() => {
				if (typeof onClose === 'function') onClose()
			}}>
			{children}
		</View>
	)

	if (typeof document !== 'undefined') {
		return createPortal(modal, document.body)
	}

	return modal
}

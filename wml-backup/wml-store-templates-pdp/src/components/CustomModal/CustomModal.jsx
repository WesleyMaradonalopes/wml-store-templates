import { View } from 'eitri-luminus'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

let openModalCount = 0
let previousStyles = null
let previousScrollY = 0

function lockPageScroll() {
	if (typeof document === 'undefined') return false

	const html = document.documentElement
	const body = document.body

	if (!html || !body) return false

	if (openModalCount === 0) {
		previousScrollY = typeof window !== 'undefined' ? window.scrollY || 0 : 0

		previousStyles = {
			bodyOverflow: body.style.overflow,
			htmlOverflow: html.style.overflow,
			bodyOverscrollBehavior: body.style.overscrollBehavior,
			htmlOverscrollBehavior: html.style.overscrollBehavior,
			bodyPosition: body.style.position,
			bodyTop: body.style.top,
			bodyLeft: body.style.left,
			bodyRight: body.style.right,
			bodyWidth: body.style.width,
		}

		body.style.overflow = 'hidden'
		html.style.overflow = 'hidden'
		body.style.overscrollBehavior = 'none'
		html.style.overscrollBehavior = 'none'

		// iOS-friendly scroll lock: keeps the page in place without blocking modal interactions.
		body.style.position = 'fixed'
		body.style.top = `-${previousScrollY}px`
		body.style.left = '0'
		body.style.right = '0'
		body.style.width = '100%'
	}

	openModalCount += 1

	return true
}

function unlockPageScroll() {
	if (typeof document === 'undefined') return

	const html = document.documentElement
	const body = document.body

	if (!html || !body) return

	openModalCount = Math.max(openModalCount - 1, 0)

	if (openModalCount > 0) return

	body.style.overflow = previousStyles?.bodyOverflow || ''
	html.style.overflow = previousStyles?.htmlOverflow || ''
	body.style.overscrollBehavior = previousStyles?.bodyOverscrollBehavior || ''
	html.style.overscrollBehavior = previousStyles?.htmlOverscrollBehavior || ''
	body.style.position = previousStyles?.bodyPosition || ''
	body.style.top = previousStyles?.bodyTop || ''
	body.style.left = previousStyles?.bodyLeft || ''
	body.style.right = previousStyles?.bodyRight || ''
	body.style.width = previousStyles?.bodyWidth || ''

	previousStyles = null

	if (typeof window !== 'undefined') {
		window.scrollTo(0, previousScrollY)
	}
}

export default function CustomModal(props) {
	const { children, open, onClose } = props
	const hasScrollLockRef = useRef(false)

	useEffect(() => {
		if (!open) {
			if (hasScrollLockRef.current) {
				unlockPageScroll()
				hasScrollLockRef.current = false
			}

			return
		}

		hasScrollLockRef.current = lockPageScroll()

		return () => {
			if (hasScrollLockRef.current) {
				unlockPageScroll()
				hasScrollLockRef.current = false
			}
		}
	}, [open])

	if (!open) return null

	const modalContent = (
		<View
			className='fixed inset-0 z-[9999] flex items-end justify-center !bg-black/70 !opacity-100'
			style={{ zIndex: 2147483647 }}
			onClick={() => {
				if (typeof onClose === 'function') onClose()
			}}>
			{children}
		</View>
	)

	if (typeof document === 'undefined' || !document.body) {
		return modalContent
	}

	return createPortal(modalContent, document.body)
}

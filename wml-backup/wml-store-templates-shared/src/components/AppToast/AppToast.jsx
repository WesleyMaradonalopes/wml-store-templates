import { useEffect, useRef, useState } from 'react'

const TOAST_DURATION_MS = 2200
const TOAST_EXIT_DURATION_MS = 300

const scheduleEnterAnimation = (callback) => {
	if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
		return window.requestAnimationFrame(callback)
	}

	return setTimeout(callback, 0)
}

const cancelEnterAnimation = (animationId) => {
	if (!animationId) return

	if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
		window.cancelAnimationFrame(animationId)
		return
	}

	clearTimeout(animationId)
}

const DEFAULT_ICON = (
	<svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='text-white'>
		<path d='M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93' />
		<path d='M14 11a5 5 0 0 0-7.07 0l-1.41 1.41a5 5 0 1 0 7.07 7.07L14 18.07' />
		<line x1='8' y1='16' x2='16' y2='8' />
	</svg>
)

export default function AppToast(props) {
	const {
		toastData = null,
		durationMs = TOAST_DURATION_MS,
		onClose = () => {},
		icon = DEFAULT_ICON,
		containerClassName = 'fixed inset-0 z-[9999] flex items-center justify-center px-6',
		toastClassName = 'flex w-[174px] flex-col items-center rounded-xl px-4 py-3 text-center',
		textClassName = 'w-full font-sans text-xs leading-4 text-[#ECE8E4]',
		backgroundColor = '#0F0805CC',
	} = props

	const triggerId = toastData?.triggerId ?? toastData?.id
	const message = toastData?.message ?? ''
	const visible = Boolean(message)

	const [renderedMessage, setRenderedMessage] = useState(message)
	const [isToastVisible, setIsToastVisible] = useState(Boolean(message))
	const toastAutoCloseTimeoutRef = useRef(null)
	const toastEnterAnimationRef = useRef(null)
	const toastUnmountTimeoutRef = useRef(null)

	useEffect(() => {
		return () => {
			if (toastAutoCloseTimeoutRef.current) {
				clearTimeout(toastAutoCloseTimeoutRef.current)
			}

			if (toastEnterAnimationRef.current) {
				cancelEnterAnimation(toastEnterAnimationRef.current)
			}

			if (toastUnmountTimeoutRef.current) {
				clearTimeout(toastUnmountTimeoutRef.current)
			}
		}
	}, [])

	useEffect(() => {
		if (visible && message) {
			if (toastAutoCloseTimeoutRef.current) {
				clearTimeout(toastAutoCloseTimeoutRef.current)
			}

			if (toastEnterAnimationRef.current) {
				cancelEnterAnimation(toastEnterAnimationRef.current)
			}

			if (toastUnmountTimeoutRef.current) {
				clearTimeout(toastUnmountTimeoutRef.current)
			}

			setRenderedMessage(message)
			setIsToastVisible(false)

			toastEnterAnimationRef.current = scheduleEnterAnimation(() => {
				setIsToastVisible(true)
				toastEnterAnimationRef.current = null
			})

			toastAutoCloseTimeoutRef.current = setTimeout(() => {
				onClose()
				toastAutoCloseTimeoutRef.current = null
			}, durationMs)

			return
		}

		if (!visible && renderedMessage) {
			if (toastAutoCloseTimeoutRef.current) {
				clearTimeout(toastAutoCloseTimeoutRef.current)
				toastAutoCloseTimeoutRef.current = null
			}

			setIsToastVisible(false)

			if (toastUnmountTimeoutRef.current) {
				clearTimeout(toastUnmountTimeoutRef.current)
			}

			toastUnmountTimeoutRef.current = setTimeout(() => {
				setRenderedMessage('')
				toastUnmountTimeoutRef.current = null
			}, TOAST_EXIT_DURATION_MS)
		}
	}, [durationMs, message, onClose, renderedMessage, triggerId, visible])

	if (!renderedMessage) return null

	return (
		<View className={`pointer-events-none ${containerClassName}`}>
			<View
				className={`transition-all duration-300 ease-out ${
					isToastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
				}`}>
				<View className={toastClassName} style={{ backgroundColor }}>
					<View className='mb-2 flex w-full items-center justify-center'>
						{icon}
					</View>
					<Text className={textClassName}>{renderedMessage}</Text>
				</View>
			</View>
		</View>
	)
}

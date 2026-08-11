import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'eitri-luminus'
import BottomInset from '../BottomInset/BottomInset'

const TOAST_DURATION_MS = 3000
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

export default function Toast(props) {
	const {
		toastData = null,
		bottomClassName = 'bottom-[90px]',
		widthClassName = 'w-[85%]',
		showBottomInset = false,
		durationMs = TOAST_DURATION_MS,
		style,
		onClose = () => {}
	} = props

	const triggerId = toastData?.triggerId ?? toastData?.id
	const message = toastData?.message ?? ''
	const type = toastData?.type
	const visible = Boolean(toastData?.message)

	const [renderedMessage, setRenderedMessage] = useState(toastData?.message)
	const [renderedType, setRenderedType] = useState(toastData?.type)
	const [isToastVisible, setIsToastVisible] = useState(false)
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
			setRenderedType(type)
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
				setRenderedType(undefined)
				toastUnmountTimeoutRef.current = null
			}, TOAST_EXIT_DURATION_MS)
		}
	}, [durationMs, message, onClose, renderedMessage, triggerId, visible])

	if (!renderedMessage) return null

	const backgroundClass = renderedType === 'success' ? 'bg-green-700' : 'bg-red-600'

	return (
		<View className={`fixed ${bottomClassName} left-[0px] right-[0px] z-[9999] pointer-events-none`} style={style}>
			<View
				className={`w-full flex justify-center items-center p-4 transition-all duration-300 ease-out ${
					showBottomInset ? 'mb-2 ' : ''
				}${isToastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
				<View
					className={`flex justify-center rounded-lg ${backgroundClass} px-4 py-3 ${widthClassName} shadow-lg`}>
					<Text className='text-white text-xs font-medium text-center'>{renderedMessage}</Text>
				</View>
			</View>
			{showBottomInset && <BottomInset />}
		</View>
	)
}

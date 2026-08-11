import { useKeenSlider } from './keenslider/react.es'
import { Children, cloneElement, forwardRef, isValidElement, useImperativeHandle } from 'react'

const CONTAINER_STYLE = {
	alignContent: 'flex-start',
	display: 'flex',
	overflow: 'hidden',
	position: 'relative',
	userSelect: 'none',
	WebkitUserSelect: 'none',
	MozUserSelect: 'none',
	msUserSelect: 'none',
	WebkitTouchCallout: 'none',
	touchAction: 'pan-y',
	WebkitTapHighlightColor: 'transparent',
	width: '100%'
}

const SLIDE_STYLE = {
	flex: '0 0 100%',
	position: 'relative',
	overflow: 'hidden',
	minWidth: '100%',
	width: '100%',
	minHeight: '100%'
}

function SliderWithRef(props, ref) {
	const { options, autoPlay, autoPlayTimeout, plugins, children, className = '', style } = props

	const _plugins = plugins || []
	if (autoPlay)
		_plugins.push(slider => {
			let timeout
			let mouseOver = false
			function clearNextTimeout() {
				clearTimeout(timeout)
			}
			function nextTimeout() {
				clearTimeout(timeout)
				if (mouseOver) return
				timeout = setTimeout(() => {
					slider.next()
				}, autoPlayTimeout || 5000)
			}
			slider.on('created', nextTimeout)
			slider.on('dragStarted', clearNextTimeout)
			slider.on('animationEnded', nextTimeout)
			slider.on('updated', nextTimeout)
		})

	const [sliderRef, sliderInstanceRef] = useKeenSlider(options, _plugins)

	useImperativeHandle(ref, () => ({
		goTo(index) {
			sliderInstanceRef.current?.moveToIdx(index)
		},
		goNext() {
			sliderInstanceRef.current?.next()
		},
		goPrev() {
			sliderInstanceRef.current?.prev()
		}
	}), [])

	const containerStyle = {
		...CONTAINER_STYLE,
		...(options?.rtl && { flexDirection: 'row-reverse' }),
		...(options?.vertical && { flexWrap: 'wrap' })
	}

	const slides = Children.map(children, child => {
		if (!isValidElement(child)) return child
		const existing = child.props.className || ''
		const className = existing.includes('keen-slider__slide') ? existing : `${existing} keen-slider__slide`.trim()
		return cloneElement(child, {
			className,
			style: { ...SLIDE_STYLE, ...child.props.style }
		})
	})

	return (
		<div
			ref={sliderRef}
			className={`keen-slider ${className}`.trim()}
			style={{ ...containerStyle, ...style }}>
			{slides}
		</div>
	)
}

export default forwardRef(SliderWithRef)

import { useKeenSlider } from './keenslider/react.es'
import { Children, cloneElement, isValidElement } from 'react'

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
	position: 'relative',
	overflow: 'hidden',
	width: '100%',
	minHeight: '100%'
}

export default function Slider(props) {
	const { options, autoPlay, autoPlayTimeout, plugins, children } = props

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

	const [sliderRef] = useKeenSlider(options, _plugins)

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
			className='keen-slider'
			style={containerStyle}>
			{slides}
		</div>
	)
}

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Função para gerar ID único
const generateUniqueId = () => `carousel-${Math.random().toString(36).substr(2, 9)}`

const CustomCarousel = forwardRef(function CustomCarousel(
	{ children, autoPlay = false, interval = 3000, loop = true, onSlideChange = () => {}, initialSlide = 0, className = '' },
	ref,
) {
	const [isDragging, setIsDragging] = useState(false)
	const [startX, setStartX] = useState(0)
	const [currentX, setCurrentX] = useState(0)
	const [dragOffset, setDragOffset] = useState(0)
	const [carouselId] = useState(generateUniqueId())
	const containerRef = useRef(null)

	const slides = React.Children.toArray(children)
	const totalSlides = slides.length

	const [currentSlide, setCurrentSlide] = useState(() => {
		// Inicializa o slide atual com base no initialSlide, garantindo que esteja dentro dos limites
		if (totalSlides <= 0) return 0
		if (loop) {
			return ((initialSlide % totalSlides) + totalSlides) % totalSlides
		}
		return Math.min(Math.max(initialSlide, 0), totalSlides - 1)
	})

	const clampSlide = useCallback(
		(slideIndex) => {
			if (totalSlides <= 0) return 0
			if (loop) {
				return ((slideIndex % totalSlides) + totalSlides) % totalSlides
			}

			return Math.min(Math.max(slideIndex, 0), totalSlides - 1)
		},
		[loop, totalSlides],
	)

	const goToSlide = useCallback(
		(targetSlide) => {
			const nextIndex = clampSlide(targetSlide)

			if (nextIndex !== currentSlide) {
				onSlideChange(nextIndex, currentSlide)
				setCurrentSlide(nextIndex)
			}
		},
		[clampSlide, currentSlide, onSlideChange],
	)

	// Função para ir para o próximo slide
	const nextSlide = useCallback(() => {
		goToSlide(currentSlide + 1)
	}, [currentSlide, goToSlide])

	// Função para ir para o slide anterior
	const prevSlide = useCallback(() => {
		goToSlide(currentSlide - 1)
	}, [currentSlide, goToSlide])

	useImperativeHandle(ref, () => ({
		goPrev: prevSlide,
		goNext: nextSlide,
		goTo: goToSlide,
	}))

	useEffect(() => {
		setCurrentSlide(clampSlide(initialSlide))
	}, [initialSlide, clampSlide])

	// Auto play
	useEffect(() => {
		if (autoPlay && !isDragging) {
			const timer = setInterval(nextSlide, interval)
			return () => clearInterval(timer)
		}
	}, [autoPlay, interval, nextSlide, isDragging])

	// Handlers para touch/mouse events
	const handleStart = (clientX) => {
		setIsDragging(true)
		setStartX(clientX)
		setCurrentX(clientX)
		setDragOffset(0)
	}

	const handleMove = (clientX) => {
		if (!isDragging) return

		const diff = clientX - startX
		setCurrentX(clientX)
		setDragOffset(diff)
	}

	const handleEnd = () => {
		if (!isDragging) return

		const diff = currentX - startX
		const threshold = 50 // Minimum distance to trigger slide change

		if (Math.abs(diff) > threshold) {
			if (diff > 0) {
				prevSlide()
			} else {
				nextSlide()
			}
		}

		setIsDragging(false)
		setDragOffset(0)
	}

	// Touch events
	const handleTouchStart = (e) => {
		if (e.touches.length !== 1) {
			setIsDragging(false)
			setDragOffset(0)
			return
		}

		handleStart(e.touches[0].clientX)
	}

	const handleTouchMove = (e) => {
		if (!isDragging || e.touches.length !== 1) {
			return
		}

		e.preventDefault()
		handleMove(e.touches[0].clientX)
	}

	const handleTouchEnd = () => {
		if (!isDragging) return

		handleEnd()
	}

	// Mouse events (para desktop)
	const handleMouseDown = (e) => {
		e.preventDefault()
		handleStart(e.clientX)
	}

	const handleMouseMove = (e) => {
		handleMove(e.clientX)
	}

	const handleMouseUp = () => {
		handleEnd()
	}

	const handleMouseLeave = () => {
		if (isDragging) {
			handleEnd()
		}
	}

	// Calcular transform
	const getTransform = () => {
		const slideOffset = -currentSlide * 100
		const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
		const dragOffsetPercent = dragOffset ? (dragOffset / containerWidth) * 100 : 0
		return `translateX(${slideOffset + dragOffsetPercent}%)`
	}

	return (
		<View
			ref={containerRef}
			className={`relative w-full overflow-hidden ${className}`}
			style={{ touchAction: 'pan-y pinch-zoom' }}>
			{/* Container dos slides */}
			<View
				id={`${carouselId}-container`}
				className='flex h-full transition-transform duration-300 ease-out'
				style={{
					transform: getTransform(),
					transitionDuration: isDragging ? '0ms' : '300ms',
				}}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
				onMouseDown={handleMouseDown}
				onMouseMove={isDragging ? handleMouseMove : undefined}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}>
				{slides.map((slide, index) => (
					<View
						key={index}
						id={`${carouselId}-slide-${index}`}
						className='h-full w-full flex-shrink-0'>
						{slide}
					</View>
				))}
			</View>
		</View>
	)
})

export default CustomCarousel

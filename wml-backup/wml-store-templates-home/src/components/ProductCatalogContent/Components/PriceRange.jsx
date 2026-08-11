import { View, Text, TextInput } from 'eitri-luminus'
import { useState, useRef, useCallback, useEffect } from 'react'
import { CustomInput } from 'wml-store-templates-shared'
import { formatPrice } from '../../../utils/utils'

export default function PriceRange({
	initialMin = 20,
	initialMax = 80,
	onChange,
	rangeMin = 0,
	rangeMax = 100,
	step = 1
}) {
	const [minValue, setMinValue] = useState(initialMin)
	const [maxValue, setMaxValue] = useState(initialMax)
	const [isDragging, setIsDragging] = useState(null)

	const sliderRef = useRef(null)
	const minThumbRef = useRef(null)
	const maxThumbRef = useRef(null)
	const minValueRef = useRef(initialMin)
	const maxValueRef = useRef(initialMax)

	// Sync with props when they change
	useEffect(() => {
		setMinValue(initialMin)
		setMaxValue(initialMax)
		minValueRef.current = initialMin
		maxValueRef.current = initialMax
	}, [initialMin, initialMax])

	const getValueFromPosition = useCallback(
		clientX => {
			if (!sliderRef.current) return 0
			const rect = document.getElementById('slider').getBoundingClientRect()
			const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
			const value = Math.round((percentage * (rangeMax - rangeMin) + rangeMin) / step) * step

			return Math.max(rangeMin, Math.min(rangeMax, value))
		},
		[rangeMin, rangeMax, step]
	)

	const handleMouseDown = thumb => e => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(thumb)

		const handleMouseMove = e => {
			const newValue = getValueFromPosition(e.clientX)

			if (thumb === 'min') {
				const clamped = Math.min(newValue, maxValueRef.current - step)
				setMinValue(clamped)
				minValueRef.current = clamped
			} else {
				const clamped = Math.max(newValue, minValueRef.current + step)
				setMaxValue(clamped)
				maxValueRef.current = clamped
			}
		}

		const handleMouseUp = () => {
			setIsDragging(null)
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
			if (onChange) {
				onChange(`${minValueRef.current}:${maxValueRef.current}`)
			}
		}

		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)
	}

	const handleTouchStart = thumb => e => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(thumb)

		const handleTouchMove = e => {
			const touch = e.touches[0]
			const newValue = getValueFromPosition(touch.clientX)

			if (thumb === 'min') {
				const clamped = Math.min(newValue, maxValueRef.current - step)
				setMinValue(clamped)
				minValueRef.current = clamped
			} else {
				const clamped = Math.max(newValue, minValueRef.current + step)
				setMaxValue(clamped)
				maxValueRef.current = clamped
			}
		}

		const handleTouchEnd = () => {
			setIsDragging(null)
			document.removeEventListener('touchmove', handleTouchMove)
			document.removeEventListener('touchend', handleTouchEnd)
			if (onChange) {
				onChange(`${minValueRef.current}:${maxValueRef.current}`)
			}
		}

		document.addEventListener('touchmove', handleTouchMove)
		document.addEventListener('touchend', handleTouchEnd)
	}

	const minPercentage = ((minValue - rangeMin) / (rangeMax - rangeMin)) * 100
	const maxPercentage = ((maxValue - rangeMin) / (rangeMax - rangeMin)) * 100

	return (
		<View className='w-full bg-white'>
			<View className='mb-4'>
				<View className='relative flex h-6 items-center px-2'>
					{/* Track */}
					<View
						ref={sliderRef}
						id='slider'
						className='relative h-2 w-full cursor-pointer rounded-full bg-gray-200'>
						{/* Active range */}
						<View
							className='absolute h-2 rounded-full bg-primary'
							style={{
								left: `${minPercentage}%`,
								width: `${maxPercentage - minPercentage}%`,
							}}
						/>

						{/* Min thumb */}
						<View
							ref={minThumbRef}
							id='min-thumb'
							className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 transform cursor-grab rounded-full border-4 border-primary bg-white transition-transform ${
								isDragging === 'min' ? 'scale-110 cursor-grabbing shadow-lg' : 'hover:scale-105'
							}`}
							style={{ left: `${minPercentage}%`, transform: 'translateX(-50%) translateY(-50%)' }}
							onMouseDown={handleMouseDown('min')}
							onTouchStart={handleTouchStart('min')}
						/>

						{/* Max thumb */}
						<View
							ref={maxThumbRef}
							id='max-thumb'
							className={`absolute top-1/2 h-6 w-6 -translate-y-1/2 transform cursor-grab rounded-full border-4 border-primary bg-white transition-transform ${
								isDragging === 'max' ? 'scale-110 cursor-grabbing shadow-lg' : 'hover:scale-105'
							}`}
							style={{ left: `${maxPercentage}%`, transform: 'translateX(-50%) translateY(-50%)' }}
							onMouseDown={handleMouseDown('max')}
							onTouchStart={handleTouchStart('max')}
						/>
					</View>
				</View>

				{/* Scale indicators */}
				<View className='mt-2 flex justify-between text-xs text-gray-400'>
					<View>{formatPrice(rangeMin)}</View>
					<View>{formatPrice(Math.floor(rangeMin + (rangeMax - rangeMin) * 0.5))}</View>
					<View>{formatPrice(rangeMax)}</View>
				</View>
			</View>

			{/* Input fields */}
			<View className='flex w-full justify-between'>
				<View>
					<Text className='mb-1 block text-sm font-medium text-gray-700'>Valor Mínimo</Text>
					<Text className='block text-sm font-medium text-gray-700'>{formatPrice(minValue)}</Text>
				</View>
				<View>
					<Text className='mb-1 block text-sm font-medium text-gray-700'>Valor Máximo</Text>
					<Text className='block text-sm font-medium text-gray-700'>{formatPrice(maxValue)}</Text>
				</View>
			</View>
		</View>
	)
}

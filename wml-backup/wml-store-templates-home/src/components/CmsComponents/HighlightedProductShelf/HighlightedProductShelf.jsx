import Eitri from 'eitri-bifrost'

import { useState, useEffect } from 'react'
import { LuChevronRight } from 'react-icons/lu'

import { getProductsService } from '../../../services/ProductService'
import ProductCard from '../../ProductCard/ProductCard'

// Hook customizado para countdown
const useCountdown = (endDate, enabled) => {
	const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })

	useEffect(() => {
		if (!enabled || !endDate) return

		const calculateTime = () => {
			const diff = new Date(endDate) - new Date()
			if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 }

			return {
				d: Math.floor(diff / (1000 * 60 * 60 * 24)),
				h: Math.floor((diff / (1000 * 60 * 60)) % 24),
				m: Math.floor((diff / (1000 * 60)) % 60),
				s: Math.floor((diff / 1000) % 60),
			}
		}

		setTime(calculateTime())
		const timer = setInterval(() => setTime(calculateTime()), 1000)

		return () => clearInterval(timer)
	}, [endDate, enabled])

	return time
}

// Componente Timer
const CountdownTimer = ({ time, textColor }) => {
	const pad = (n) => String(n).padStart(2, '0')

	const timeUnits = [
		{ value: time.d, label: 'dias' },
		{ value: time.h, label: 'horas' },
		{ value: time.m, label: 'minutos' },
		{ value: time.s, label: 'segundos' },
	]

	return (
		<View
			className='mb-4 flex items-center justify-center gap-1'
			style={{ color: textColor }}>
			{timeUnits.map((unit, index) => (
				<View
					key={`${unit.label}-${index}`}
					className='flex'>
					<View className='flex flex-col items-center'>
						<Text className='text-4xl font-bold'>{pad(unit.value)}</Text>
						<Text className='text-xs'>{unit.label}</Text>
					</View>
					{index < timeUnits.length - 1 && (
						<View className='mx-2 flex flex-col items-center'>
							<Text className='text-4xl font-bold'>:</Text>
							<Text>&nbsp;</Text>
						</View>
					)}
				</View>
			))}
		</View>
	)
}

// Componente principal
export default function HighlightedProductShelf({ data }) {
	const [products, setProducts] = useState([])
	const [isLoading, setIsLoading] = useState(false)
	const time = useCountdown(data?.endDate, data?.showTimer)

	useEffect(() => {
		fetchProducts()
	}, [])

	const fetchProducts = async () => {
		if (!data) return

		setIsLoading(true)
		try {
			const params = {
				facets: data.facets || [],
				query: data.term ?? '',
				sort: data.sort ?? '',
				to: data.numberOfItems || 8,
			}

			const result = await getProductsService(params)
			if (result?.products) {
				setProducts(result.products)
			}
		} catch (error) {
			console.error('Error fetching products:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const onSeeMore = () => {
		Eitri.navigation.navigate({
			path: 'ProductCatalog',
			state: {
				params: {
					facets: data.facets || [],
					query: data.term ?? '',
					sort: data.sort ?? '',
				},
				title: data.title,
			},
		})
	}

	if (!data) return null

	return (
		<View
			className='bg-primary py-4'
			style={{ backgroundColor: data.backgroundColor }}>
			<View
				className='mb-4 flex items-center justify-between px-4'
				style={{ color: data.textColor }}>
				<Text className='font-bold'>{data.title}</Text>
				<View
					className='flex items-center gap-1'
					onClick={onSeeMore}>
					<Text className='text-sm'>Veja mais</Text>
					<LuChevronRight />
				</View>
			</View>

			{data.showTimer && (
				<CountdownTimer
					time={time}
					textColor={data.textColor}
				/>
			)}

			<View className='flex overflow-x-auto'>
				<View className='flex gap-4 px-4'>
					{isLoading ? (
						<Text>Carregando...</Text>
					) : (
						products.map((product) => (
							<ProductCard
								key={product.productId}
								product={product}
								className='min-w-[50vw]'
							/>
						))
					)}
				</View>
			</View>
		</View>
	)
}

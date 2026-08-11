import { View, Text, Select, Button, Divider } from 'eitri-luminus'

import { getOpinions, getRecommendationsSummaries, getRootInfo } from '../../services/TrustVox'
import RatingStars from '../Rating/RatingStars'

export default function Reviews(props) {
	const { product } = props

	const [sortBy, setSortBy] = useState('recent')
	const [ratingDistribution, setRatingDistribution] = useState([])
	const [reviews, setReviews] = useState([])
	const [recommendationSummary, setRecommendationSummary] = useState(null)
	const [rootData, setRootData] = useState(null)
	const [filterParam, setFilterParam] = useState('order_by=-created_at')

	const page = useRef(1)

	useEffect(() => {
		fetchReviews(product?.productId)
		fetchOpinions(product?.productId)
		fetchRecommendationsSummaries(product?.productId)
	}, [])

	const fetchReviews = async (productId) => {
		try {
			if (!productId) return
			const rootInfo = await getRootInfo(productId)

			const histogram = [5, 4, 3, 2, 1].map((star) => {
				const histogramCount = rootInfo?.rate?.histogram[`${star}`]
				const totalCount = rootInfo?.rate?.count

				const percentage = (histogramCount / totalCount) * 100

				return {
					stars: star,
					percentage: percentage,
				}
			})

			setRatingDistribution(histogram)
			setRootData(rootInfo)
		} catch (e) {
			console.error('FetchReviews ===>', e)
		}
	}

	const fetchOpinions = async (productId) => {
		if (!productId) return
		const opinions = await getOpinions(productId, page.current)
		setReviews([...reviews, ...opinions?.items])
	}

	const fetchRecommendationsSummaries = async (productId) => {
		try {
			if (!productId) return
			const recommendationSummary = await getRecommendationsSummaries(productId)
			setRecommendationSummary(recommendationSummary)
		} catch (e) {
			console.error('Error ===>', e)
		}
	}

	const fetchMoreOpinions = async () => {
		page.current++
		await fetchOpinions(product.productId)
	}

	const sortOpinions = async (sortBy) => {
		page.current = 1
		sortBy.current = sortBy
		setReviews([])
		setSortBy(sortBy)
		await fetchOpinions(product.productId)
	}

	const StarIcon = ({ filled }) => (
		<svg
			className={`h-5 w-5 ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
			fill='currentColor'
			viewBox='0 0 20 20'>
			<path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
		</svg>
	)

	const SmallStarIcon = ({ filled }) => (
		<svg
			className={`h-3 w-3 ${filled ? 'text-yellow-400' : 'text-gray-400'}`}
			fill='currentColor'
			viewBox='0 0 20 20'>
			<path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
		</svg>
	)

	const ThumbsUpIcon = () => (
		<svg
			className='h-4 w-4'
			fill='none'
			stroke='currentColor'
			viewBox='0 0 24 24'>
			<path
				strokeLinecap='round'
				strokeLinejoin='round'
				strokeWidth={2}
				d='M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5'
			/>
		</svg>
	)

	const CheckIcon = () => (
		<svg
			className='h-4 w-4'
			fill='none'
			stroke='currentColor'
			viewBox='0 0 24 24'>
			<path
				strokeLinecap='round'
				strokeLinejoin='round'
				strokeWidth={2}
				d='M5 13l4 4L19 7'
			/>
		</svg>
	)

	if (!reviews?.length > 0) {
		return
	}

	return (
		<View className='bg-white pt-6'>
			{/* <View className='px-4'>
			</View> */}
			<Text className={'flex justify-center px-4 text-center text-lg font-bold'}>
				Veja o que estão falando sobre este produto
			</Text>
			{/* Header com Rating Geral */}

			<View className='bg-white p-4 shadow-sm'>
				<View className='mb-4 flex items-start justify-between'>
					<View>
						<View className='mb-1 text-5xl font-bold text-gray-900'>{rootData?.rate?.average}</View>
						<View className='text-sm text-gray-500'> {rootData?.rate?.best}</View>
						<View className='mt-2 flex items-center'>
							<RatingStars
								ratingValue={rootData?.rate?.average}
								ratingsCount={rootData?.rate?.count}
							/>
						</View>
					</View>

					{/* Rating Distribution */}
					<View className='ml-6 flex-1'>
						{ratingDistribution.map((item) => (
							<View
								key={item.stars}
								className='mb-1 flex items-center gap-2'>
								<Text className='w-3 text-xs text-gray-600'>{item.stars}</Text>
								<SmallStarIcon filled={true} />
								<View className='h-2 flex-1 overflow-hidden rounded-full bg-gray-200'>
									<View
										className='h-full rounded-full bg-yellow-400'
										style={{ width: `${item.percentage}%` }}
									/>
								</View>
							</View>
						))}
					</View>
				</View>

				{/* Recomendação */}
				<View className='flex items-center gap-3 border-t border-gray-100 pt-4'>
					<View className='relative'>
						<svg className='h-16 w-16 -rotate-90 transform'>
							<circle
								cx='32'
								cy='32'
								r='28'
								stroke='#e5e7eb'
								strokeWidth='4'
								fill='none'
							/>
							<circle
								cx='32'
								cy='32'
								r='28'
								stroke='#f59e0b'
								strokeWidth='4'
								fill='none'
								strokeDasharray={`${(2 * Math.PI * 28 * recommendationSummary?.percentage) / 100} ${2 * Math.PI * 28}`}
								strokeLinecap='round'
							/>
						</svg>
						<View className='absolute inset-0 flex items-center justify-center'>
							<Text className='text-lg font-bold text-gray-900'>
								{recommendationSummary?.percentage}%
							</Text>
						</View>
					</View>
					<View className='text-sm text-gray-700'>
						dos clientes recomendam
						<br />
						este produto
					</View>
				</View>

				{/* Selo ReclameAQUI */}
				<View className='mt-4 flex items-center gap-2 border-t border-gray-100 pt-4'>
					<Image
						src={'https://static.trustvox.com.br/sincero/img/ra-icon.svg'}
						height={'16px'}
					/>
					<Text className='text-xs text-gray-600'>Avaliações confiáveis do</Text>
					<Image
						src={'https://static.trustvox.com.br/sincero/img/logo-reclameaqui.svg'}
						height={'16px'}
					/>
				</View>
			</View>

			{/* Filtro */}
			{/*<View className='bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between'>*/}
			{/*	<Text className='text-sm font-medium text-gray-700'>Ordernar por:</Text>*/}
			{/*	<Select*/}
			{/*		value={sortBy}*/}
			{/*		onChange={e => sortOpinions(e.target.value)}*/}
			{/*		className='text-sm border border-gray-300 rounded px-3 py-2 bg-white text-gray-700 h-[36px]'>*/}
			{/*		<Select.Item value='order_by=-created_at'>Mais recentes</Select.Item>*/}
			{/*		<Select.Item value='positive=true&order_by=-created_at'>Positivas</Select.Item>*/}
			{/*		<Select.Item value='rating'>Negativas</Select.Item>*/}
			{/*		<Select.Item value='rating'>Mais úteis</Select.Item>*/}
			{/*	</Select>*/}
			{/*</View>*/}

			<View
				id='reviews'
				className='space-y-4 py-4'>
				{reviews?.map((review) => (
					<View
						key={review.id}
						className='rounded-lg bg-white p-4 shadow-sm'>
						{/* Header da Review */}
						<View className='mb-3 flex items-start gap-3'>
							{/*<View className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">*/}
							{/*	<Text className="text-sm font-medium text-gray-600">{review?.user?.name}</Text>*/}
							{/*</View>*/}
							<View className='min-w-0 flex-1'>
								<View className='text-sm font-medium text-gray-900'>{review?.user?.name}</View>
								{!review.third_party && (
									<View className='mt-1 flex w-fit items-center gap-2 rounded bg-[#e2f3ea] px-2 py-1'>
										<Text className='flex items-center gap-1 text-xs text-gray-800'>
											Compra Verificada
										</Text>
									</View>
								)}
								<View className='mt-1 text-xs text-gray-500'>{review.created_at}</View>
							</View>
						</View>

						{/* Rating */}
						<View className='mb-2 flex items-center gap-1'>
							<RatingStars ratingValue={review.rate} />
						</View>

						{/* Texto da Review */}
						<View>
							{review.opinion_title && (
								<Text className='mb-2 block font-medium text-gray-900'>{review.opinion_title}</Text>
							)}
							{review.opinion && (
								<Text className='block text-sm leading-relaxed text-gray-700'>{review.opinion}</Text>
							)}
							{review.review_photos?.length > 0 && (
								<View className={'flex gap-1'}>
									{review.review_photos?.map((p) => (
										<Image
											key={p.id}
											src={p.image}
											className={'w-16 rounded object-cover'}
										/>
									))}
								</View>
							)}
						</View>

						{/* Recomendação */}
						{review.recommends === 'yes' && (
							<View className='mt-3 flex w-fit items-center gap-1 rounded bg-gray-100 px-2 py-1 text-green-600'>
								<CheckIcon />
								<Text className='text-sm font-medium text-green-600'>Recomendo este produto</Text>
							</View>
						)}

						{/*/!* Botão Útil *!/*/}
						{/*<View className='mt-4 pt-3 border-t border-gray-100'>*/}
						{/*	<Button className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors'>*/}
						{/*		<Text>Útil</Text>*/}
						{/*		<ThumbsUpIcon />*/}
						{/*		<Text>{review.helpful}</Text>*/}
						{/*	</Button>*/}
						{/*</View>*/}
					</View>
				))}

				{rootData?.opinions_count?.total > reviews?.length && (
					<View className={'flex justify-center'}>
						<View
							className={'flex w-[70%] justify-center border border-black py-2'}
							onClick={fetchMoreOpinions}>
							Ver mais
						</View>
					</View>
				)}
			</View>
		</View>
	)
}

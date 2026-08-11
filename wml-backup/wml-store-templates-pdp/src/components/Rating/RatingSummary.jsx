import { View } from 'eitri-luminus'

import { getRootInfo } from '../../services/TrustVox'
import RatingStars from './RatingStars'

export default function RatingSummary(props) {
	const { product } = props
	const [rating, setRating] = useState(null)

	useEffect(() => {
		init(product?.productId)
	}, [])

	const scrollToReviews = async () => {
		try {
			const reviewsElement = document.getElementById('reviews')
			if (reviewsElement) {
				document.documentElement.style.scrollBehavior = 'smooth'
				document.body.style.scrollBehavior = 'smooth'

				reviewsElement.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
				})
			}
		} catch (e) {
			console.error('error on scrollToReviews', e)
		}
	}

	const init = async (productId) => {

		try {
			if (!productId) return
			const res = await getRootInfo(productId)
			setRating({
				average: res?.rate?.average,
				count: res?.rate?.count,
			})
		} catch (e) {
			console.error('error on rating', e)
		}
	}

	if (!rating || rating?.count === 0) {
		return null
	}

	return (
		<View onClick={scrollToReviews}>
			<RatingStars
				ratingValue={rating?.average}
				ratingsCount={rating?.count}
			/>
		</View>
	)
}

import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import { Loading } from 'wml-store-templates-shared'

import BlogCard from './BlogCard'
import SwiperContent from '../../SwiperContent/SwiperContent'

export default function BlogPostShelf(props) {
	const { data } = props
	const { t } = useTranslation()

	const [posts, setPosts] = useState([])
	const [isLoading, setIsLoading] = useState(true)

	const url = data?.postUrl

	useEffect(() => {
		getPosts()
	}, [])

	const getPosts = async () => {
		try {
			const _url = `${url}/wp-json/wp/v2/posts?_embed&per_page=${data?.numberOfItems}`
			const result = await Eitri.http.get(_url)
			setPosts(result.data)
		} catch (error) {
			console.error('Error fetching posts:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const navigateToSeeMore = () => {
		Eitri.navigation.navigate({ path: 'BlogHome', state: { blogUrl: url } })
	}

	const navigateToBlog = (postId) => {
		Eitri.navigation.navigate({ path: 'BlogPost', state: { blogUrl: url, postId: postId } })
	}

	return (
		<SwiperContent
			paddingHorizontal='large'
			title={data.title}
			gap='16px'>
			{isLoading ? (
				<View className='flex w-screen flex-row justify-center'>
					<Loading />
				</View>
			) : (
				<>
					{posts.map((post, index) => {
						let postImg = ''
						postImg = post._embedded['wp:featuredmedia'][0]?.source_url

						return (
							<BlogCard
								key={post.id}
								postImg={postImg}
								post={post}
								handleClick={() => navigateToBlog(post.id)}
							/>
						)
					})}

					<View
						className='flex h-full w-[120px] flex-col items-center justify-center p-4'
						onClick={navigateToSeeMore}>
						<Text className='text-primary-500 mb-[4px] font-bold'>{t('blogPostShelf.seeMore')}</Text>
						<Text className='text-primary-500 font-bold'>+</Text>
					</View>
				</>
			)}
		</SwiperContent>
	)
}

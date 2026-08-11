import { View } from 'eitri-luminus'
export default function InfiniteScroll(props) {
	const { children, onScrollEnd, ...rest } = props
	const [scrollEnded, setScrollEnded] = useState(false)
	useEffect(() => {
		const handleScroll = () => {
			if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
				setScrollEnded(true)
			}
		}
		window.addEventListener('scroll', handleScroll)
		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	}, [])
	useEffect(() => {
		if (scrollEnded) {
			onScrollEnd()
		}
		setScrollEnded(false)
	}, [scrollEnded])
	return <View>{children}</View>
}

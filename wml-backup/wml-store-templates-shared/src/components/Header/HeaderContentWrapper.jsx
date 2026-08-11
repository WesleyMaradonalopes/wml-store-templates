import { getRemoteAppConfigProperty } from '../../utils/getRemoteConfigStyleProperty'
import HeaderCarousel from './HeaderCarousel'
import HeaderContent from './HeaderContent'
import HeaderOffset from './HeaderOffset'
import { DIMENSIONS } from '../../utils/constants'

export default function HeaderContentWrapper({
	children,
	searchProps,
	compactTitleProps,
	showDefaultActions = true,
	showAccountAction = false,
	showTopBlackBar = false,
	showHeaderCarousel = false,
	showTopInset = true,
	cartProps,
	scrollEffect,
	scrollEffectMaxTranslate,
	height,
	className,
	containerClassName,
	transparentOnScroll = false,
	scrollThreshold = 200,
	compact = false,
}) {
	const [safeAreaTop, setSafeAreaTop] = useState(0)
	const [translate, setTranslate] = useState('')
	const [isScrolled, setIsScrolled] = useState(false)

	const [headerHeight, setHeaderHeight] = useState(height ?? (compact ? 52 : DIMENSIONS.HEADER_HEIGHT))
	const safeAreaTopRef = useRef()
	const scrollHandler = useRef()

	safeAreaTopRef.current = safeAreaTop

	const _height = Math.max(0, headerHeight - 2)

	useEffect(() => {
		initScrollEffect()
	}, [])

	useEffect(() => {
		const headerElement = document.getElementById('header')
		if (!headerElement) return
		const observer = new ResizeObserver(([entry]) => {
			setHeaderHeight(entry.target?.offsetHeight)
		})
		observer.observe(headerElement)
		return () => observer.disconnect()
	}, [])

	const initScrollEffect = async () => {
		if (typeof scrollEffect === 'boolean' && !scrollEffect) return

		if (!scrollEffect && !transparentOnScroll) {
			const headerScrollEffect = await getRemoteAppConfigProperty('headerScrollEffect')
			if (!headerScrollEffect) {
				return
			}
		}

		if (transparentOnScroll) {
			loadSafeAreas()
			window.addEventListener('scroll', scrollHandler.current)
			return () => {
				window.removeEventListener('scroll', scrollHandler.current)
			}
		}

		loadSafeAreas()
		window.addEventListener('scroll', scrollHandler.current)
		return () => {
			window.removeEventListener('scroll', scrollHandler.current)
		}
	}

	const loadSafeAreas = async () => {
		const { EITRI } = window
		if (EITRI) {
			const { superAppData } = await EITRI.miniAppConfigs
			const { safeAreaInsets } = superAppData
			const { top } = safeAreaInsets
			setSafeAreaTop(top)
		}
	}

	let ticking = false
	let lastScrollTop = window.document.documentElement.scrollTop

	if (!scrollHandler.current) {
		scrollHandler.current = () => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					let currentScrollTop = window.document.documentElement.scrollTop

					if (transparentOnScroll) {
						setIsScrolled(currentScrollTop > scrollThreshold)
					} else {
						const distance = currentScrollTop - lastScrollTop
						if (Math.abs(distance) > .8) {
							if (distance > 0 && currentScrollTop > safeAreaTopRef.current) {
								setTranslate(scrollEffectMaxTranslate ?? '-100%')
							} else if (currentScrollTop < lastScrollTop) {
								setTranslate('0')
							}
						}
					}

					lastScrollTop = Math.max(currentScrollTop, 0)

					ticking = false
				})

				ticking = true
			}
		}
	}

	const containerBaseClass = 'fixed top-0 left-0 right-0 z-[9900] transition-all duration-300 ease-in-out w-full'
	const containerTransparentClass = 'bg-transparent'
	const containerSolidClass = 'bg-white shadow-md backdrop-blur-sm'

	return (
		<>
			<View
				id='header-container'
				style={transparentOnScroll ? {} : { transform: `translateY(${translate})` }}
				className={`${containerBaseClass} ${transparentOnScroll
					? isScrolled
						? containerSolidClass
						: containerTransparentClass
					: `${containerSolidClass}`
				} ${containerClassName || ''}`}>
				{showTopInset && (
					<View
						topInset={'auto'}
						className={showTopBlackBar ? 'bg-black' : 'bg-transparent'}
					/>
				)}

				{showHeaderCarousel && <HeaderCarousel />}

				<HeaderContent
					id='header'
					className={`flex w-screen items-center gap-3 px-4 ${compact ? 'h-[52px] max-h-[52px] py-0' : 'min-h-[60px] py-[8px]'} ${className || ''}`}
					customChildren={children}
					searchProps={searchProps}
					compactTitleProps={compactTitleProps}
					showDefaultActions={showDefaultActions}
					showAccountAction={showAccountAction}
					cartProps={cartProps}
					transparent={transparentOnScroll && !isScrolled}
					compact={compact}
				/>
			</View>
			{!transparentOnScroll && (
				<HeaderOffset
					height={_height}
					topInset={'auto'}
				/>
			)}
		</>
	)
}

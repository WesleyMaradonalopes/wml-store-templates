import Eitri from 'eitri-bifrost'
import { Text, Video, View } from 'eitri-luminus'
import { Widde } from 'eitri-shopping-addons-integrations'
import { useEffect, useRef, useState } from 'react'
import { PiPlay, PiSpeakerHigh, PiSpeakerSlash, PiXCircleLight, PiXThin } from 'react-icons/pi'
import CustomModal from '../CustomModal/CustomModal'

const VIDEO_EXTENSION_REGEX = /\.(mp4|webm|mov|m4v|ogv|ogg)(\?.*)?$/i
const CARD_WIDTH = 96
const OPEN_LEFT_OFFSET = 12
const INITIAL_TOP = 16
const FLOATING_Z_INDEX = 91

const isVideoUrl = (url) => typeof url === 'string' && VIDEO_EXTENSION_REGEX.test(url)

const clamp = (value, max) => Math.max(0, Math.min(value, max))

function mapStoryMedia(story) {
	const { gifs = [], videos = [], thumbnailExposed } = story?.media || {}

	const gif = gifs.find(isVideoUrl)
	if (!gif) return null

	const full = videos.find(url => /\.mp4(\?.*)?$/i.test(url)) || videos.find(isVideoUrl) || gif

	return { key: story?.key || gif, gif, full, thumb: thumbnailExposed || null }
}

export default function WiddeVideo(props) {
	const { product } = props

	const [stories, setStories] = useState([])
	const [minimized, setMinimized] = useState(false)
	const [fullscreen, setFullscreen] = useState(false)
	const [activeIndex, setActiveIndex] = useState(0)
	const [progress, setProgress] = useState(0)
	const [pos, setPos] = useState({ x: OPEN_LEFT_OFFSET, y: INITIAL_TOP })
	const [muted, setMuted] = useState(true)
	const drag = useRef(null)
	const mutedRef = useRef(true)

	useEffect(() => {
		setStories([])
		setMinimized(false)
		setFullscreen(false)
		setActiveIndex(0)
		setProgress(0)
		setPos({ x: OPEN_LEFT_OFFSET, y: INITIAL_TOP })

		if (product?.linkText) {
			loadWiddeStories()
		}
	}, [product?.linkText])

	useEffect(() => {
		if (!fullscreen || typeof document === 'undefined') return
		let video = null
		let timer = null
		let tries = 0

		const onTimeUpdate = () => {
			if (video?.duration) setProgress(video.currentTime / video.duration)
		}
		const onEnded = () => navigateStories(1)
		const attach = () => {
			const byId = document.getElementById('widde-fs-video')
			video =
				(byId && byId.tagName === 'VIDEO' ? byId : byId?.querySelector?.('video')) || null

			if (!video) {
				const all = document.querySelectorAll('video')
				video = all.length ? all[all.length - 1] : null
			}

			if (video) {
				setProgress(0)
				video.muted = mutedRef.current
				video.addEventListener('timeupdate', onTimeUpdate)
				video.addEventListener('ended', onEnded)
			} else if (tries++ < 20) {
				timer = setTimeout(attach, 50)
			}
		}

		attach()

		return () => {
			if (timer) clearTimeout(timer)
			if (video) {
				video.removeEventListener('timeupdate', onTimeUpdate)
				video.removeEventListener('ended', onEnded)
			}
		}
	}, [fullscreen, activeIndex, stories.length])

	const loadWiddeStories = async () => {
		try {
			const remoteConfig = await Eitri.environment.getRemoteConfigs()
			if (remoteConfig?.widde?.enable !== true) return

			const domain = remoteConfig?.providerInfo?.domain || remoteConfig?.providerInfo?.host
			if (!domain) return
			const storeBaseUrl = domain.startsWith('http') ? domain : `https://${domain}`

			const response = await Widde.getStoriesByProductUrl(`${storeBaseUrl}/${product.linkText}/p`)
			const lazy = response?.data?.storiesCollections?.collection?.storiesWithLazyLoad
			const rawStories = Array.isArray(lazy) ? lazy : lazy?.stories || []

			setStories(rawStories.map(mapStoryMedia).filter(Boolean))
		} catch (e) {
			console.error('Erro ao carregar stories Widde', e)
		}
	}

	const handlePointerDown = (e) => {
		e.currentTarget.setPointerCapture?.(e.pointerId)
		drag.current = { moved: false, px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y }
	}

	const handlePointerMove = (e) => {
		const d = drag.current
		if (!d) return

		const dx = e.clientX - d.px
		const dy = e.clientY - d.py
		if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true

		const box = e.currentTarget.parentElement?.getBoundingClientRect()
		const card = e.currentTarget.getBoundingClientRect()
		setPos(
			box
				? { x: clamp(d.ox + dx, box.width - card.width), y: clamp(d.oy + dy, box.height - card.height) }
				: { x: d.ox + dx, y: d.oy + dy }
		)
	}

	const handlePointerUp = (e) => {
		const d = drag.current
		drag.current = null
		e.currentTarget.releasePointerCapture?.(e.pointerId)

		if (d && !d.moved) {
			setActiveIndex(0)
			setProgress(0)
			setMuted(true)
			mutedRef.current = true
			setFullscreen(true)
		}
	}

	const minimize = () => {
		setMinimized(true)
	}

	const expand = () => {
		setPos(prev => ({ x: OPEN_LEFT_OFFSET, y: prev.y }))
		setMinimized(false)
	}

	const toggleMuted = () => {
		const next = !muted
		setMuted(next)
		mutedRef.current = next
		const el = document.getElementById('widde-fs-video')
		const video = el?.tagName === 'VIDEO' ? el : el?.querySelector?.('video')
		if (video) video.muted = next
	}

	const navigateStories = (delta) => {
		const next = activeIndex + delta
		if (next < 0) return
		if (next >= stories.length) return setFullscreen(false)
		setActiveIndex(next)
	}

	const first = stories[0]
	if (!product?.linkText || !first) return null
	const activeStory = stories[activeIndex] || first

	if (minimized) {
		return (
			<View
				role='button'
				aria-label='Reabrir vídeo do produto'
				onClick={expand}
				className='absolute flex cursor-pointer flex-col items-center justify-center rounded-r-md bg-white shadow-md'
				style={{
					left: '0px',
					top: '0px',
					zIndex: FLOATING_Z_INDEX,
					padding: '8px',
				}}>
				<PiPlay
					size={20}
					color='#000000'
				/>
				<Text className='mt-2 max-h-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-base text-[#373739] [writing-mode:vertical-rl]'>
					Vídeo do produto
				</Text>
			</View>
		)
	}

	return (
		<>
			<View
				className='absolute cursor-grab touch-none select-none active:cursor-grabbing'
				style={{
					left: `${pos.x}px`,
					top: `${pos.y}px`,
					width: `${CARD_WIDTH}px`,
					zIndex: FLOATING_Z_INDEX,
				}}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerCancel={handlePointerUp}>
				<View
					role='button'
					aria-label='Minimizar vídeo'
					onPointerDown={(e) => e.stopPropagation()}
					onClick={minimize}
					className='absolute -left-2 -top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-md'>
					<PiXThin />
				</View>

				<View style={{ pointerEvents: 'none' }}>
					<Video
						source={first.gif}
						thumbnail={first.thumb}
						width='100%'
						autoPlay
						muted
						loop
						playsInline
						className='rounded-xl object-cover shadow-lg'
					/>
				</View>
			</View>

			<CustomModal
				open={fullscreen}
				onClose={() => setFullscreen(false)}>
				<View
					onClick={(e) => e.stopPropagation()}
					className='relative h-full w-full'>
					<View className='flex h-full w-full items-center justify-center'>
						<Video
							key={activeStory.key}
							id='widde-fs-video'
							source={activeStory.full || activeStory.gif}
							thumbnail={activeStory.thumb}
							width='100%'
							autoPlay
							muted={muted}
							playsInline
							className='h-full w-full object-cover'
						/>
					</View>

					{stories.length > 1 && (
						<>
							<View
								onClick={() => navigateStories(-1)}
								className='absolute left-0 top-0 z-10 h-full w-1/3'
							/>
							<View
								onClick={() => navigateStories(1)}
								className='absolute right-0 top-0 z-10 h-full w-1/3'
							/>
						</>
					)}

					<View className='absolute left-4 right-4 top-[120px] z-20 flex gap-1'>
						{stories.map((story, index) => {
							const fill = index < activeIndex ? 1 : index === activeIndex ? progress : 0
							return (
								<View
									key={story.key}
									className='h-1 flex-1 overflow-hidden rounded-full'
									style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}>
									<View
										className='h-full rounded-full bg-white'
										style={{ width: `${Math.min(1, Math.max(0, fill)) * 100}%` }}
									/>
								</View>
							)
						})}
					</View>

					<View
						className='absolute right-4 top-[144px] z-20 flex flex-col items-center gap-5 rounded-full backdrop-blur-sm'
						style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px' }}>
						<View
							role='button'
							aria-label='Fechar vídeo'
							onClick={() => setFullscreen(false)}
							className='cursor-pointer'>
							<PiXCircleLight
								size={30}
								color='#ffffff'
							/>
						</View>

						<View
							role='button'
							aria-label={muted ? 'Ativar som' : 'Desativar som'}
							onClick={toggleMuted}
							className='cursor-pointer'>
							{muted ? (
								<PiSpeakerSlash
									size={30}
									color='#ffffff'
								/>
							) : (
								<PiSpeakerHigh
									size={30}
									color='#ffffff'
								/>
							)}
						</View>
					</View>
				</View>
			</CustomModal>
		</>
	)
}

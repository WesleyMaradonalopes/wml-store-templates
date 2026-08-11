export default function BlogCard(props) {
	const { postImg, post, handleClick, width, textWidth } = props

	const category = post?._embedded['wp:term'][0][0].name.toUpperCase()
	const author = post?._embedded?.author[0].name
	const publishedDate = new Date(post?.date).toLocaleDateString('pt-BR')

	const excerpt = post.excerpt.rendered.replace('<p>', '').replace('</p>', '')
	return (
		<View
			key={post.id}
			className={`min-h-[290px] w-[283px]`}
			onClick={handleClick}>
			<View className='flex w-full flex-col rounded-2xl shadow-md'>
				<View className='relative'>
					<View className=''>
						<Image
							src={postImg}
							className={`h-[168px] w-full rounded object-cover object-top`}
							alt={post.title.rendered}
						/>
					</View>
					<View className='absolute bottom-2 left-4 w-fit rounded-full bg-blue-500 px-2'>
						<Text className='!text-[14px] text-white'>{category}</Text>
					</View>
				</View>
				<View className='flex h-full flex-col p-4'>
					<View className='h-[48px]'>
						<Text className='line-clamp-2 font-bold'>{post.title.rendered}</Text>
					</View>

					<View>
						<Text
							className={`line-clamp-3 max-w-[${textWidth || '231px'}] text-support-01 mb-[4px] text-sm font-normal`}>
							{excerpt}
						</Text>
					</View>

					<Text className='mt-auto !text-[10px]'>{`Publicado ${author ? `por ${author}` : ''} em ${publishedDate}`}</Text>
				</View>
			</View>
		</View>
	)
}

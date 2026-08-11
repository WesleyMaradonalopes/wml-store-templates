import WishlistIcon from './components/WishlistIcon'
import Loading from '../Loading/LoadingComponent'

export default function ProductCardDefault(props) {
	const {
		listPrice,
		image,
		name,
		price,
		width,
		installments,
		disableCartAction,
		hideCartAction,
		loadingCartOp,
		loadingWishlistOp,
		isOnWishlist,
		isUnavailable,
		showListItem,
		actionLabel,
		badge,
		onPressOnCard,
		onPressCartButton,
		onPressOnWishlist,
		className,
	} = props
	return (
		<View className={`relative rounded bg-white drop-shadow-[0px_0px_6px_rgba(0,0,0,0.2)] ${className}`}>
			<View className='flex flex-col rounded-sm p-2'>
				{/*{badge ? (*/}
				{/*	<View className="max-h-[27px] min-h-[27px] rounded-full w-fit bg-green-300 px-4 py-1">*/}
				{/*		<Text className="font-bold">{badge}</Text>*/}
				{/*	</View>*/}
				{/*) : (*/}
				{/*	<View className="h-[27px]" />*/}
				{/*)}*/}

				<View className='relative flex h-[160px] max-h-[160px] min-h-[160px] w-full flex-col items-center justify-center'>
					<Image
						className='h-full w-full rounded object-contain'
						src={image}
					/>
					<View className='absolute right-[5px] top-[5px] z-[10] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white'>
						<WishlistIcon filled={isOnWishlist} />
					</View>
				</View>

				<View className='mt-2 flex min-h-[48px] justify-between gap-4'>
					<Text className='line-clamp-3 text-xs font-medium'>{name}</Text>
				</View>

				<View className='mt-1 flex flex-col gap-2'>
					<View className='flex items-center gap-1'>
						{showListItem && listPrice && (
							<Text className='font-sans text-base font-normal line-through'>{listPrice}</Text>
						)}

						<Text className={`text-sm font-medium ${isUnavailable ? 'text-neutral-500' : 'text-primary-700'}`}>
							{isUnavailable ? 'Indisponivel' : price}
						</Text>
					</View>

					{installments ? (
						<Text className='text-xs font-bold text-neutral-500'>{installments}</Text>
					) : (
						<View className='h-[16px]' />
					)}
				</View>

				{!hideCartAction && (
					<View
						onClick={onPressCartButton}
						className={`z-[10] mt-2 flex h-[36px] w-full items-center justify-center rounded-full border border-[0.5px] ${
							disableCartAction
								? 'border-neutral-300 bg-neutral-200'
								: 'border-primary-700 bg-primary-700 bg-primary'
						}`}>
						{loadingCartOp ? (
							<Loading width='36px' />
						) : (
							<Text className={`text-xs font-medium ${disableCartAction ? 'text-neutral-500' : 'text-primary-content'}`}>
								{actionLabel}
							</Text>
						)}
					</View>
				)}
			</View>

			<View
				className='absolute bottom-0 left-0 right-0 top-0'
				onClick={onPressOnCard}
			/>
		</View>
	)
}

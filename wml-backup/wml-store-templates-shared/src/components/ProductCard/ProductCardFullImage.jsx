import { Text, View, Image } from 'eitri-luminus'

import WishlistIcon from './components/WishlistIcon'
import Loading from '../Loading/LoadingComponent'
import addToCartTrigger from '../../assets/add-to-cart-trigger.svg'

export default function ProductCardFullImage(props) {
	const {
		listPrice,
		image,
		name,
		price,
		disableCartAction,
		hideCartAction,
		loadingCartOp,
		isUnavailable,
		isOnWishlist,
		isNewProduct = false,
		showListItem,
		actionLabel,
		onPressOnCard,
		onPressCartButton,
		onPressOnWishlist,
		className,
		compactSpacing = false,
		cartQuantity = 0,
	} = props

	const _onPressOnWishlist = (e) => {
		e.stopPropagation()
		onPressOnWishlist()
	}

	const priceNumber = Number(
		price.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
	);

	const listPriceNumber = Number(
		listPrice.replace("R$", "").replace(/\./g, "").replace(",", ".").trim()
	);

	const discountPercentage = Math.round(
		(1 - priceNumber / listPriceNumber) * 100
	);

	return (
		<View
			onClick={onPressOnCard}
			className={`relative ${className}`}>
			<View className={`flex w-full flex-col rounded`}>
				{/* Image */}
				<View
					className={`relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl`}>
					<Image
						className={`h-auto w-full`}
						src={image}
					/>

					{/* Wishlist button */}
					<View
						onClick={_onPressOnWishlist}
						className='absolute right-[7px] top-[7px] z-[10]'>
						<WishlistIcon
							filled={isOnWishlist}
							size={'22'}
						/>
					</View>
				</View>

				{(discountPercentage > 0 || isNewProduct) && (
					<View className='absolute left-[5px] top-[5px] z-[10] flex flex-row items-center gap-1'>
						{discountPercentage > 0 && (
							<View className='min-h-[25px] w-auto items-center justify-center rounded-2xl bg-[#cf242c] px-2'>
								<Text className='text-xs font-semibold leading-[16.8px] text-white'>
									{discountPercentage}%
								</Text>
							</View>
						)}

						{isNewProduct && (
							<View className='min-h-[25px] w-auto items-center justify-center rounded-2xl bg-[#FCFAF5] px-2'>
								<Text className='text-xs font-normal leading-[16.8px] text-[#1E120D]'>
									Novo
								</Text>
							</View>
						)}
					</View>
				)}

				{/* Name */}
				<View className='mt-2 min-h-[40px] w-full'>
					<Text className='line-clamp-2 text-sm font-normal capitalize leading-5 text-primary'>
						{name}
					</Text>
				</View>

				{/* Pricing row with add-to-cart */}
				<View className={`${compactSpacing ? 'mt-1.5' : 'mt-3'} flex items-end justify-between`}>
					{/* Pricing */}
					<View className='flex flex-col gap-1'>
						<View className='flex items-center gap-1'>
							{showListItem && listPrice && (
								<Text className='font-sans text-sm font-medium leading-none line-through text-[#A49A8E]'>
									{listPrice}
								</Text>
							)}

							<Text className={`text-sm font-medium leading-none ${isUnavailable ? 'text-neutral-500' : 'text-black'}`}>
								{isUnavailable ? 'Indisponivel' : price}
							</Text>
						</View>
					</View>

					{/* Add to cart icon */}
					{!hideCartAction && (
						<View
							onClick={(event) => {
								event?.stopPropagation?.()
								onPressCartButton?.(event)
							}}
							aria-label={actionLabel}
							className={`flex flex-shrink-0 items-center justify-center rounded-lg px-2 ${disableCartAction ? 'bg-white' : 'transparent'
								}`}>
							{loadingCartOp ? (
								<Loading width='20px' />
							) : disableCartAction ? (
								<Text className='text-[10px] font-medium uppercase leading-none text-neutral-500'>
									Indisponivel
								</Text>
							) : (
								<View className='relative flex h-[21px] w-[15px] items-center'>
									<Image
										src={addToCartTrigger}
										className='h-full w-full object-contain'
									/>
									{cartQuantity > 0 && (
										<View className='pointer-events-none absolute inset-x-0 bottom-0 top-[26%] flex items-center justify-center'>
											<Text className='text-[9px] font-medium leading-none text-primary'>{cartQuantity}</Text>
										</View>
									)}
								</View>
							)}
						</View>
					)}
				</View>
			</View>
		</View>
	)
}

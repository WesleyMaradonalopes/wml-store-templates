import { View, TextInput } from 'eitri-luminus'

import searchIcon from '../../assets/search.svg'

// Receive search ref from parent
export default function HeaderSearch({
	searchTerm,
	setSearchTerm,
	onSubmit,
	onFocus,
	autoFocus = false,
	showUnderline = true,
	showSearchClose = false,
	large = false,
	inputRef,
	onClear,
	onClick,
	transparent = false,
}) {
	const wrapperClassName = showUnderline
		? `flex min-h-12 w-full flex-1 items-center gap-2 border-b  ${transparent ? 'border-white' : 'border-primary'}`
		: `flex ${large ? 'h-11' : 'h-10'} w-full flex-1 items-center gap-2 rounded-full bg-neutral-100 px-3`
	const hasSearchTerm = !!searchTerm
	const isNavigationButton = typeof onClick === 'function'

	const handleClear = (event) => {
		event?.stopPropagation?.()
		if (typeof setSearchTerm === 'function') {
			setSearchTerm('')
		}
		if (typeof onClear === 'function') {
			onClear()
		}
	}

	const handleInputKeyDown = (event) => {
		if (event?.key === 'Enter' && typeof onSubmit === 'function') {
			onSubmit()
		}
	}

	const handleSearchIconClick = () => {
		if (isNavigationButton) return
		inputRef?.current?.focus?.()
	}

	const renderClearButton = () => {
		if (!hasSearchTerm) return null

		return (
			<View
				className='flex h-6 w-6 items-center justify-center rounded-full'
				onClick={handleClear}>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					width='14'
					height='14'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='1'
					strokeLinecap='round'
					strokeLinejoin='round'>
					<line x1='18' y1='6' x2='6' y2='18'></line>
					<line x1='6' y1='6' x2='18' y2='18'></line>
				</svg>
			</View>
		)
	}

	return (
		<View
			className={wrapperClassName}
			onClick={isNavigationButton ? onClick : undefined}>
			<View
				className='flex h-8 w-8 items-center justify-center'
				onClick={handleSearchIconClick}>
				<Image
					src={searchIcon}
					className='h-4 w-4'
					style={transparent ? { filter: 'brightness(0) invert(1)' } : undefined}
				/>
			</View>

			<View className='h-full flex-1'>
				<TextInput
					ref={isNavigationButton ? undefined : inputRef}
					autoFocus={isNavigationButton ? false : autoFocus}
					readOnly={isNavigationButton}
					value={searchTerm}
					onFocus={isNavigationButton ? undefined : onFocus}
					onKeyDown={handleInputKeyDown}
					onChange={(e) => {
						if (!isNavigationButton && typeof setSearchTerm === 'function') {
							setSearchTerm(e.target.value)
						}
					}}
					placeholder='O que você procura?'
					className={`h-full w-full border-none bg-transparent p-0 text-[14px] text-primary placeholder-neutral-400 focus:outline-none${isNavigationButton ? ' pointer-events-none' : ''}`}
				/>
			</View>

			{renderClearButton()}
		</View>
	)
}

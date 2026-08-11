import Eitri from 'eitri-bifrost'
import { Text, View } from 'eitri-luminus'

import HeaderLogo from './HeaderLogo'
import HeaderCart from './HeaderCart'
import HeaderSearch from './HeaderSearch'
import HeaderSearchIcon from './HeaderSearchIcon'
import HeaderAccount from './HeaderAccount'
import HeaderReturn from './HeaderReturn'

export default function HeaderContent({
	id,
	customChildren,
	searchProps,
	cartProps,
	compactTitleProps,
	showDefaultActions = true,
	showAccountAction = true,
	transparent = false,
	compact = false,
}) {
	const [isCompactSearch, setIsCompactSearch] = useState(!!searchProps?.autoFocus)
	const [isSearchAutoFocusEnabled, setIsSearchAutoFocusEnabled] = useState(!!searchProps?.autoFocus)
	const searchInputRef = useRef(null)
	const isCompactTitle = !!compactTitleProps?.enabled
	const hasSearchMode = !!searchProps
	const searchCollapsed = !!searchProps?.searchCollapsed
	const hideCartOnSearchActive = !!cartProps?.hideWhenSearchActive
	const hideCartAction = !!cartProps?.hidden || (hideCartOnSearchActive && (isCompactSearch || !searchCollapsed))

	const renderCartAction = () => {
		if (hideCartAction) return null
		return <HeaderCart {...cartProps} transparent={transparent} />
	}

	const handleSearchFocus = (event) => {
		if (searchProps?.onClick) return
		if (typeof searchProps?.onFocus === 'function') {
			searchProps.onFocus(event)
		} else {
			setIsCompactSearch(true)
		}
	}

	const handleCompactBack = () => {
		setIsSearchAutoFocusEnabled(false)
		setIsCompactSearch(false)
		searchInputRef.current?.blur?.()

		if (typeof searchProps?.onCompactBack === 'function') {
			searchProps.onCompactBack()
		}
	}

	const navigateToSearch = () => {
		Eitri.navigation.navigate({
			path: '/Search',
		})
	}

	const handleSearchIconClick = () => {
		if (typeof searchProps?.onClick === 'function') {
			searchProps.onClick()
			return
		}
		setIsSearchAutoFocusEnabled(true)
		setIsCompactSearch(true)
	}

	const mergedSearchProps = {
		...searchProps,
		autoFocus: isSearchAutoFocusEnabled,
		onFocus: handleSearchFocus,
		inputRef: searchInputRef,
	}

	const handleCompactTitleBack =
		typeof compactTitleProps?.onBack === 'function' ? compactTitleProps.onBack : undefined
	const showCompactTitleBackButton = compactTitleProps?.showBackButton !== false
	const rowHeightClass = compact ? 'h-[52px] max-h-[52px]' : 'h-10'
	const rootPaddingClass = compact ? 'py-0' : isCompactSearch || isCompactTitle ? 'py-2' : 'pb-4'

	return (
		<View id={id} className={`flex w-full flex-col px-4 ${transparent ? 'text-white' : 'text-primary'} ${rootPaddingClass}`}>
			{isCompactTitle ? (
				<View className={`flex w-full items-center gap-3 ${rowHeightClass}`}>
					{showCompactTitleBackButton && <HeaderReturn onClick={handleCompactTitleBack} />}

					<View className='flex-1'>
						<Text className='text-xl font-bold'>{compactTitleProps?.title || ''}</Text>
					</View>

					<View className='flex justify-end gap-4'>
						{showAccountAction && <HeaderAccount transparent={transparent} />}
						{renderCartAction()}
					</View>
				</View>
			) : isCompactSearch ? (
				<View className={`flex h-10 w-full items-center ${searchProps?.onCompactBack ? 'gap-0' : 'gap-2'}`}>
					<View className={searchProps?.onCompactBack ? 'mr-2' : ''}>
						<HeaderReturn onClick={handleCompactBack} bordered />
					</View>

					<View className='min-w-0 flex-1'>
						<HeaderSearch
							{...mergedSearchProps}
							showUnderline={false}
							large={!!searchProps?.onCompactBack}
							transparent={transparent}
						/>
					</View>

					{!!searchProps?.onCompactBack && (
						<View
							className='ml-2 flex h-8 w-8 shrink-0 items-center justify-center'
							onClick={handleCompactBack}>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								width='24'
								height='24'
								viewBox='0 0 24 24'
								fill='none'
							>
								<path
									d='M20.4234 3.5001C20.4334 3.50011 20.4435 3.50213 20.4527 3.50596C20.4619 3.50979 20.4701 3.51555 20.4771 3.52256C20.4841 3.52948 20.4899 3.53767 20.4937 3.54697C20.4976 3.55622 20.4996 3.56633 20.4996 3.57627C20.4996 3.58624 20.4976 3.59628 20.4937 3.60557C20.4899 3.61492 20.4841 3.62304 20.4771 3.62998L12.4615 11.6446L12.108 11.9981L12.4615 12.3526L20.4762 20.3702C20.4904 20.3845 20.4986 20.4037 20.4986 20.4239C20.4986 20.4442 20.4904 20.4634 20.4762 20.4776C20.4619 20.4918 20.4426 20.5001 20.4225 20.5001C20.4023 20.5001 20.383 20.4919 20.3687 20.4776L12.3531 12.463L11.9996 12.1095L11.6461 12.463L3.63046 20.4776C3.61614 20.492 3.59603 20.5001 3.57578 20.5001C3.5556 20.5 3.53633 20.4919 3.52206 20.4776C3.5077 20.4633 3.49963 20.444 3.4996 20.4239C3.4996 20.4039 3.50773 20.3846 3.52206 20.3702L11.5387 12.3526L11.8922 11.9981L11.5387 11.6446L3.52304 3.62998C3.50864 3.61558 3.50058 3.59635 3.50058 3.57627C3.50061 3.55622 3.50867 3.53693 3.52304 3.52256C3.53735 3.50832 3.55655 3.5001 3.57675 3.5001C3.59696 3.50011 3.61617 3.5083 3.63046 3.52256L11.6461 11.5372L11.9996 11.8907L12.3531 11.5372L20.3697 3.52256C20.3768 3.51556 20.3849 3.50977 20.3941 3.50596C20.4034 3.50212 20.4134 3.5001 20.4234 3.5001Z'
									fill='#1E120D'
									stroke='#1E120D'
								/>
							</svg>
						</View>
					)}

					{!searchProps?.onCompactBack && (
						<View className='flex justify-end gap-4'>
							{!searchCollapsed && <HeaderAccount transparent={transparent} />}
							{renderCartAction()}
						</View>
					)}
				</View>
			) : hasSearchMode ? (
				searchCollapsed ? (
					searchProps?.onCompactBack ? (
						<View className='flex h-10 w-full items-center gap-3'>
							<HeaderReturn onClick={searchProps.onCompactBack} bordered />

							<View className='flex flex-1 items-center justify-center'>
								<HeaderLogo transparent={transparent} />
							</View>

							<View className='flex justify-end gap-4'>
								<HeaderSearchIcon onClick={handleSearchIconClick} />
								{renderCartAction()}
							</View>
						</View>
					) : (
						<View className='flex h-10 w-full items-center gap-3'>
							<View className='flex items-center justify-start'>
								<HeaderLogo transparent={transparent} />
							</View>

							<View className='flex-1' />

							<View className='flex justify-end gap-4'>
								<HeaderSearchIcon onClick={handleSearchIconClick} />
								{renderCartAction()}
							</View>
						</View>
					)
				) : (
				<>
					{/* Header middle section */}
					<View className={`flex w-full items-center justify-between ${compact ? 'h-[52px] max-h-[52px]' : 'h-12'}`}>
						{/* Logo */}
						<View className='flex items-center justify-start'>
							<HeaderLogo transparent={transparent} />
						</View>

						{/* Buttons */}
						<View className='flex justify-end gap-4'>
							{showAccountAction && <HeaderAccount transparent={transparent} />}
							{renderCartAction()}
						</View>
					</View>

					{/* Header search section */}
					<View className='flex w-full items-center justify-between'>
						<HeaderSearch {...mergedSearchProps} transparent={transparent} />
					</View>
				</>
				)
			) : (
				<View className={`flex w-full items-center gap-3 ${rowHeightClass}`}>
					<View className='flex min-w-0 flex-1 items-center gap-3'>{customChildren}</View>

					{showDefaultActions && (
						<View className='flex justify-end gap-4'>
							{showAccountAction && <HeaderAccount transparent={transparent} />}
							{renderCartAction()}
						</View>
					)}
				</View>
			)}
		</View>
	)
}

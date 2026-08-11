export const resolveSortParam = (sort, useGraphQlMode) => {
	if (useGraphQlMode) {
		if (sort?.startsWith('OrderBy')) return sort
		switch (sort) {
			case 'orders:desc':
				return 'OrderByTopSaleDESC'
			case 'release:desc':
				return 'OrderByReleaseDateDESC'
			case 'discount:desc':
				return 'OrderByBestDiscountDESC'
			case 'price:desc':
				return 'OrderByPriceDESC'
			case 'price:asc':
				return 'OrderByPriceASC'
			case 'name:asc':
				return 'OrderByNameASC'
			case 'name:desc':
				return 'OrderByNameDESC'
			case 'score:desc':
				return 'OrderByScoreDESC'
			default:
				return getDefaultSortParam(useGraphQlMode)
		}
	}
	if (sort?.indexOf(':') > -1) return sort
	switch (sort) {
		case 'OrderByTopSaleDESC':
			return 'orders:desc'
		case 'OrderByReleaseDateDESC':
			return 'release:desc'
		case 'OrderByBestDiscountDESC':
			return 'discount:desc'
		case 'OrderByPriceDESC':
			return 'price:desc'
		case 'OrderByPriceASC':
			return 'price:asc'
		case 'OrderByNameASC':
			return 'name:asc'
		case 'OrderByNameDESC':
			return 'name:desc'
		case 'OrderByScoreDESC':
			return 'score:desc'
		default:
			return getDefaultSortParam()
	}
}

export const getDefaultSortParam = (useGraphQlMode) => {
	if (useGraphQlMode) return 'OrderByScoreDESC'
	return 'score:desc'
}

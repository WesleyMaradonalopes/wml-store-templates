export const LIST_ORDERING = {
	key: 'ordering',
	title: 'lists.title',
	values: [
		{
			id: 'OrderByScoreDESC',
			categoryKey: 'ordering',
			name: 'lists.labelRelevance',
			value: 'score:desc',
		},
		{
			id: 'OrderByTopSaleDESC',
			categoryKey: 'ordering',
			name: 'lists.labelBestSellers',
			value: 'orders:desc',
		},
		{
			id: 'OrderByReleaseDateDESC',
			categoryKey: 'ordering',
			name: 'lists.labelNewest',
			value: 'release:desc',
		},
		{
			id: 'OrderByBestDiscountDESC',
			categoryKey: 'ordering',
			name: 'lists.labelDiscounts',
			value: 'discount:desc',
		},
		{
			id: 'OrderByPriceDESC',
			categoryKey: 'ordering',
			name: 'lists.labelHighestPrice',
			value: 'price:desc',
		},
		{
			id: 'OrderByPriceASC',
			categoryKey: 'ordering',
			name: 'lists.labelLowestPrice',
			value: 'price:asc',
		}
	],
}

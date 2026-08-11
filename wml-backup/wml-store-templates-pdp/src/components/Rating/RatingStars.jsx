export default function RatingStars(props) {
	const { ratingValue, ratingsCount, ...rest } = props
	const handleRating = (value) => { }
	// TODO: componente deverá ser retirado do pdp e home para componente compartilhado
	return (
		<View className='flex items-center gap-1'>
			<View className='flex flex-row items-center'>
				{[1, 2, 3, 4, 5].map((star, index) => {
					return (
						<View
							key={index}
							onClick={() => handleRating(star)}
							className='flex flex-row items-center'>
							<View
								width='12px'
								height='12px'>
								<svg
									width='12'
									height='12'
									viewBox='0 0 14 14'
									fill='none'
									xmlns='http://www.w3.org/2000/svg'>
									<path
										d='M7.23125 10.5433L9.9875 12.2313C10.4703 12.6291 11.0403 12.2513 10.9609 11.8342L10.3875 8.6863C10.3661 8.60658 10.3692 8.52396 10.3959 8.44782C10.4226 8.37168 10.4716 8.30471 10.5371 8.25483L13.0688 6.15483C13.4938 5.88339 13.3641 5.30957 12.7554 5.27864L9.02945 5.06483C8.9493 5.05971 8.87246 5.03054 8.80879 4.9801C8.74512 4.92967 8.69786 4.86033 8.67187 4.7801L7.425 1.28105C7.39583 1.20189 7.34171 1.13334 7.26936 1.0862C7.19702 1.03907 7.10917 1.01413 7.01875 1.01413C6.92834 1.01413 6.84048 1.03907 6.76813 1.0862C6.69579 1.13334 6.64167 1.20189 6.6125 1.28105L5.36563 4.7801C5.33964 4.86033 5.29238 4.92967 5.22871 4.9801C5.16504 5.03054 5.0882 5.05971 5.00804 5.06483L1.28205 5.27864C0.673318 5.30957 0.543632 5.88339 0.96875 6.15483L3.50049 8.25483C3.566 8.30471 3.61503 8.37168 3.64172 8.44782C3.66841 8.52396 3.67149 8.60658 3.65 8.6863L3.07656 11.7441C2.9375 12.5024 3.69375 13.1621 4.29063 12.9056L7.23125 10.5433C7.30868 10.4956 7.39949 10.4696 7.49375 10.4696C7.588 10.4696 7.67882 10.4956 7.75625 10.5433Z'
										fill={Math.ceil(ratingValue) >= star ? '#1e120d' : 'none'}
										stroke='#1e120d'
										strokeLinecap='round'
										strokeLinejoin='round'
									/>
								</svg>
							</View>
						</View>
					)
				})}
			</View>
			{ratingsCount != null && (
				<Text className='font-sans text-xs leading-none text-primary'>{`(${ratingsCount})`}</Text>
			)}
		</View>
	)
}

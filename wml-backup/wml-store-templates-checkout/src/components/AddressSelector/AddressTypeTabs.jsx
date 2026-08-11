import { Text, View } from 'eitri-luminus'

import { CustomButton } from 'wml-store-templates-shared'

export default function AddressTypeTabs({ selectedTab, onTabChange }) {
	return (
		<View className='mb-4 flex flex-row rounded-lg bg-base-200 p-1'>
			<CustomButton
				label={
					<View className='flex flex-row items-center justify-center gap-2'>
						<svg
							width='16'
							height='16'
							viewBox='0 0 24 24'
							fill='none'
							xmlns='http://www.w3.org/2000/svg'>
							<path
								d='M12 2L2 7L12 12L22 7L12 2Z'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
							<path
								d='M2 17L12 22L22 17'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
							<path
								d='M2 12L12 17L22 12'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
						<Text>Entrega</Text>
					</View>
				}
				className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
					selectedTab === 'delivery'
						? 'bg-primary text-primary-content shadow-sm'
						: 'border border-transparent text-base-content/70 hover:text-base-content'
				}`}
				onClick={() => onTabChange('delivery')}
				variant={selectedTab === 'delivery' ? undefined : 'outlined'}
			/>
			<View className='w-2' />
			<CustomButton
				label={
					<View className='flex flex-row items-center justify-center gap-2'>
						<svg
							width='16'
							height='16'
							viewBox='0 0 24 24'
							fill='none'
							xmlns='http://www.w3.org/2000/svg'>
							<path
								d='M21 10C21 17 12 23 12 23S3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z'
								stroke='currentColor'
								strokeWidth='2'
							/>
							<path
								d='M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z'
								stroke='currentColor'
								strokeWidth='2'
							/>
						</svg>
						<Text>Retirada</Text>
					</View>
				}
				className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
					selectedTab === 'pickup'
						? 'bg-primary text-primary-content shadow-sm'
						: 'border border-transparent text-base-content/70 hover:text-base-content'
				}`}
				onClick={() => onTabChange('pickup')}
				variant={selectedTab === 'pickup' ? undefined : 'outlined'}
			/>
		</View>
	)
}

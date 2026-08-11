import { Text, View, Radio } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'

import { Loading } from 'wml-store-templates-shared'

import CollapsableView from './components/CollapsableView'
import SelectableTouchable from './components/SelectableTouchable'
export default function CategoryPageModal(props) {
	const {
		show,
		onClose,
		facets,
		removeFilter,
		addFilter,
		clearFilters,
		executeSearch,
		facetsLoading,
		listOrdering,
		addOrdering,
	} = props
	const { t } = useTranslation()

	return null

	return (
		<Modal
			show={show}
			closeOnPressOut={true}
			transition='background-color 0.5s ease-in-out'
			onClose={onClose}>
			<View
				bottomInset
				borderRadiusRightTop='small'
				borderRadiusLeftTop='small'
				minHeight='70vh'
				width='100vw'
				className='overflow-scroll bg-base-100'>
				<View className='mx-1 flex flex-row items-center justify-between p-2'>
					<Text>{`${t('categoryPageModal.title')}`}</Text>
					<View
						width='36px'
						height='36px'
						onClick={onClose}
						className='items-center justify-center bg-neutral'>
						<svg
							viewBox='0 0 24 24'
							fill='none'
							xmlns='http://www.w3.org/2000/svg'>
							<g
								id='SVGRepo_bgCarrier'
								strokeWidth='0'></g>
							<g
								id='SVGRepo_tracerCarrier'
								strokeLinecap='round'
								strokeLinejoin='round'></g>
							<g id='SVGRepo_iconCarrier'>
								{' '}
								<g id='Menu / Close_MD'>
									{' '}
									<path
										id='Vector'
										d='M18 18L12 12M12 12L6 6M12 12L18 6M12 12L6 18'
										stroke='#000000'
										strokeWidth='2'
										strokeLinecap='round'
										strokeLinejoin='round'></path>{' '}
								</g>{' '}
							</g>
						</svg>
					</View>
				</View>
				<View className='mx-1'>
					{facetsLoading ? (
						<Loading inline />
					) : (
						<>
							<View className='flex flex-wrap p-2'>
								{facets &&
									facets.map((facet) =>
										facet.values
											.filter((value) => value.selected)
											.map((value) => (
												<View
													key={value.value}
													onClick={() => removeFilter(value)}
													width='fit-content'
													className='flex items-center bg-primary-content px-2 py-1'>
													<Text className='font-bold text-base-100'>{value.name}</Text>
													<svg
														viewBox='0 0 24 24'
														fill='none'
														xmlns='http://www.w3.org/2000/svg'>
														<g
															id='SVGRepo_bgCarrier'
															strokeWidth='0'></g>
														<g
															id='SVGRepo_tracerCarrier'
															strokeLinecap='round'
															strokeLinejoin='round'></g>
														<g id='SVGRepo_iconCarrier'>
															{' '}
															<g id='Menu / Close_MD'>
																{' '}
																<path
																	id='Vector'
																	d='M18 18L12 12M12 12L6 6M12 12L18 6M12 12L6 18'
																	stroke='#000000'
																	strokeWidth='2'
																	strokeLinecap='round'
																	strokeLinejoin='round'></path>{' '}
															</g>{' '}
														</g>
													</svg>
												</View>
											)),
									)}
							</View>
							{listOrdering && (
								<CollapsableView
									key={listOrdering.key}
									title={listOrdering.title}
									willStartCollapsed={false}
									border='none'
									className='font-light'>
									<View className='flex flex-col'>
										{listOrdering.values.map((value) => (
											<View
												key={value.id}
												onClick={() =>
													addOrdering({
														key: value.categoryKey,
														value: value.value,
													})
												}
												className='flex items-center'>
												<Radio defaultChecked={value.checked} />
												{value.name}
											</View>
										))}
									</View>
								</CollapsableView>
							)}
							{facets &&
								facets.map((facet) => (
									<CollapsableView
										key={facet.key}
										title={facet.name}
										willStartCollapsed={false}
										border='none'
										className='font-light'>
										<View className='flex flex-col'>
											{facet.values.map((value) => (
												<SelectableTouchable
													key={`${facet.key}_${value.value}`}
													categoryKey={value.key}
													name={`${value.name}`}
													value={`${value.value}`}
													removeCategory={removeFilter}
													addCategory={addFilter}
													checked={value.selected}
												/>
											))}
										</View>
									</CollapsableView>
								))}
						</>
					)}
					<View height={120} />
					<View className='fixed bottom-0 left-0 right-0 bg-base-100 px-2 py-1'>
						<View
							width='100%'
							height='48px'
							className='flex justify-center'>
							<View
								onClick={clearFilters}
								className='grow-1 flex items-center justify-center border border-primary-content bg-base-100 p-2'>
								<Text className='text-primary-content'>{t('categoryPageModal.clear')}</Text>
							</View>
							<View
								onClick={executeSearch}
								className='grow-1 flex items-center justify-center bg-primary-content p-2 font-bold'>
								<Text className='font-bold text-neutral'>{t('categoryPageModal.button')}</Text>
							</View>
						</View>
						<View bottomInset />
					</View>
				</View>
			</View>
		</Modal>
	)
}

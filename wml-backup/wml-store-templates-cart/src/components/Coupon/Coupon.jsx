import Eitri from 'eitri-bifrost'
import { View, Text, Button } from 'eitri-luminus'
import { useTranslation } from 'eitri-i18n'
import { LuTrash2 } from "react-icons/lu";

import { CustomInput, CustomButton } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../providers/LocalCart'

export default function Coupon(props) {
	const { cart, addCoupon, removeCoupon } = useLocalShoppingCart()

	const [coupon, setCoupon] = useState('')
	const [appliedCoupon, setAppliedCoupon] = useState('')
	const [invalidCoupon, setInvalidCoupon] = useState(false)
	const [couponTextAlert, setCouponTextAlert] = useState('')
	const [isLoading, setIsLoading] = useState(false)

	const { t } = useTranslation()

	useEffect(() => {
		if (cart?.marketingData?.coupon) {
			setInvalidCoupon(false)
			setAppliedCoupon(cart.marketingData.coupon)

			if (coupon === cart?.marketingData?.coupon) {
				setCouponTextAlert(t('coupon.txtAppliedCoupon'))
			}
		} else {
			const errorMessage = cart?.messages || []
			const couponError = coupon && errorMessage.find((message) => message.text?.includes(coupon))

			if (couponError) {
				if (couponError.code === 'couponNotFound') {
					setCouponTextAlert(t('coupon.txtInvalidCoupon'))
				} else if (couponError.code === 'couponExpired') {
					setCouponTextAlert(t('coupon.txtExpiredCoupon'))
				} else {
					setCouponTextAlert(t('coupon.txtInvalidCoupon'))
				}
				setInvalidCoupon(true)
			} else {
				setInvalidCoupon(false)
				setAppliedCoupon('')
				setCouponTextAlert('')
			}
		}
	}, [cart])

	const inputOnChange = (value) => {
		setCoupon(value)
	}

	const onPressAddCoupon = async () => {
		const normalizedCoupon = coupon?.trim()

		if (!normalizedCoupon) {
			setInvalidCoupon(true)
			setCouponTextAlert(t('coupon.txtInvalidCoupon'))
			return
		}

		setIsLoading(true)
		try {
			const updatedCart = await addCoupon(normalizedCoupon)
		} catch (error) {
			setInvalidCoupon(true)
			setCouponTextAlert(t('coupon.txtApplyFailed'))
		} finally {
			setIsLoading(false)
		}
	}

	const onPressRemoveCoupon = () => {
		setCoupon('')
		setCouponTextAlert('')
		removeCoupon()
	}

	if (!cart) return null

	return (
		<View className='px-4'>
			<View className='rounded-[16px] border border-[#EFEDEA] bg-white p-4 shadow-sm'>
				<Text className="font-['Montserrat'] text-base font-medium leading-6 tracking-normal text-[#0F0805]">{t('coupon.txtCoupon')}</Text>
				<View className='mt-2 flex items-center justify-between gap-4'>
					{appliedCoupon ? (
						<>
							<View className='my-2 grow flex rounded-lg border border-neutral-300 px-2 py-4'>
								<Text>{appliedCoupon}</Text>
							</View>
							<View
								onClick={onPressRemoveCoupon}>
								<LuTrash2 size={25} className='text-gray-500' />
							</View>
						</>
					) : (
						<>
							<View className='flex w-full items-center justify-between gap-2'>
								<View className='w-2/3'>
									<CustomInput
										placeholder={t('coupon.labelInsertCode')}
										value={coupon}
										placeholderTextColor='#575756'
										className='h-12 rounded-lg !border !border-[#B0A69B] !bg-transparent px-3 font-sans text-[16px] font-normal leading-6 tracking-normal text-[#0F0805] placeholder:font-sans placeholder:text-[16px] placeholder:font-normal placeholder:leading-6 placeholder:tracking-normal placeholder:text-[#575756]'
										onChange={(e) => inputOnChange(e.target.value)}
									/>
								</View>
								<View className='w-1/3'>
									<CustomButton
										variant='outlined'
										onPress={onPressAddCoupon}
										isLoading={isLoading}
										className='!border-[#0F0805]'
										textClassName='font-sans text-[14px] font-semibold leading-none tracking-normal text-[#0F0805]'
										label={t('coupon.txtAdd')}
									/>
								</View>
							</View>
						</>
					)}
				</View>
				{couponTextAlert && (
					<View className='mt-1'>
						<Text className={invalidCoupon ? 'text-red-600' : 'text-green-700'}>{couponTextAlert}</Text>
					</View>
				)}
				<View className={'h-[10px]'} />
			</View>
		</View>
	)
}

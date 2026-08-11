import Eitri from 'eitri-bifrost'

import GroupsWrapper from './GroupsWrapper'
import { useLocalShoppingCart } from '../../../providers/LocalCart'
import { navigate } from '../../../services/navigationService'
import GPayBtn from './../../../assets/images/gp-light-pt.svg'

import GPay from '@/components/Icons/MethodIcons/GPay'
import loadGPaymentData from '@/services/GPayService'
import { sendLogError } from '@/services/Tracking'

export default function GooglePay(props) {
	const { systemGroup, onSelectPaymentMethod } = props
	const { cart, setCardInfo } = useLocalShoppingCart()
	const [loadingGoogleData, setLoadingGoogleData] = useState(false)

	const [gPayAvailable, setGPayAvailable] = useState(false)

	const VTEX_GPAY_PAYMENT = '900'

	useEffect(() => {
		if (Eitri.canIUse(31)) {
			Eitri.googlePay.isAvailable().then((res) => setGPayAvailable(res))
		}
	}, [])

	const onSelectThisGroup = async () => {
		try {
			setLoadingGoogleData(true)

			const paymentSystem = systemGroup?.paymentSystems?.[0]

			const googlePaymentData = await loadGPaymentData()

			const cardNetWorkLabel = googlePaymentData?.paymentMethodData?.info?.cardNetwork
			const paymentSystemWallet = cart?.paymentData?.paymentSystems?.find(
				(ps) => ps.name.toLowerCase() === cardNetWorkLabel.toLowerCase(),
			)

			const metadata = {
				walletId: 'googlePay',
				paymentData: {
					assuranceDetails: {
						cardHolderAuthenticated: false,
						accountVerified: true,
					},
					billingAddress: googlePaymentData?.paymentMethodData?.info?.billingAddress,
					cardNetwork: paymentSystemWallet?.stringId,
					token: googlePaymentData?.paymentMethodData?.tokenizationData.token,
				},
			}

			setCardInfo({
				metadata: JSON.stringify(metadata),
			})

			await onSelectPaymentMethod([
				{
					paymentSystem: VTEX_GPAY_PAYMENT,
					installmentsInterestRate: 0,
					installments: 1,
					referenceValue: cart.value,
					value: cart.value,
					hasDefaultBillingAddress: true,
				},
			])

			navigate('Installments', { paymentSystem, description: googlePaymentData?.paymentMethodData?.description })
		} catch (e) {
			sendLogError(e, 'onSelectThisGroup', { paymentSystem: 'Google Pay' }, cart)
		}
		setLoadingGoogleData(false)
	}

	if (!gPayAvailable) {
		return
	}

	return (
		<GroupsWrapper
			title='Google Pay'
			icon={<GPay />}
			valueInCents={systemGroup.paymentSystems[0]?.installments?.[0]?.total ?? cart.value}
			onPress={onSelectThisGroup}
			isChecked={systemGroup.isCurrentPaymentSystemGroup}>
			<View onClick={onSelectThisGroup}>
				<View className='flex flex-row justify-center rounded-full border border-black p-3'>
					{loadingGoogleData ? <Loading /> : <Image src={GPayBtn} />}
				</View>
			</View>
		</GroupsWrapper>
	)
}

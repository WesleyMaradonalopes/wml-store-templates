import { useTranslation } from 'eitri-i18n'

import { useLocalShoppingCart } from '../../providers/LocalCart'
import SimpleCard from '../Card/SimpleCard'
import personalIcon from '../../assets/images/personal.svg'
import { navigate } from '../../services/navigationService'
import OtpLogin from '../OtpLogin/OtpLogin'

export default function UserData(props) {
	const { cart, removeClientData } = useLocalShoppingCart()
	const { t } = useTranslation()

	const [showOtpLogin, setShowOtpLogin] = useState(false)

	const clearClientData = async () => {
		try {
			if (cart?.clientProfileData) {
				await removeClientData()
				navigate('PersonalData')
			}
		} catch (e) {
			console.log('Erro ao limpar dados do cliente', e)
		}
	}

	const goToPersonalData = () => {
		try {
			navigate('PersonalData')
		} catch (e) {
			console.log('Erro ao navegar para a tela de dados pessoais', e)
		}
	}

	const onPressMainAction = async () => {
		try {
			if (!cart?.canEditData) {
				setShowOtpLogin(true)
			} else {
				goToPersonalData()
			}
		} catch (e) {
			console.log('Erro ao navegar para a tela de dados pessoais', e)
		}
	}

	return (
		<>
			<SimpleCard
				title={t('userData.txtPersonData')}
				isFilled={cart?.clientProfileData?.email}
				onPress={onPressMainAction}
				icon={personalIcon}>
				<View className='flex flex-col'>
					<View className='flex flex-row justify-between'>
						<Text className='mb-1 text-[14px] font-medium leading-[150%] text-[#575756]'>{cart?.clientProfileData?.email}</Text>
						{cart?.clientProfileData?.email && !cart.canEditData && (
							<View onClick={clearClientData}>
								<Text className='text-primary-300 text-xs underline'>
									{t('userData.txtMessageLeave')}
								</Text>
							</View>
						)}
					</View>
					<Text className='mb-1 text-[14px] font-medium leading-[150%] text-[#575756]'>{`${cart?.clientProfileData?.firstName} ${cart?.clientProfileData?.lastName}`}</Text>
					<Text className='mb-1 text-[14px] font-medium leading-[150%] text-[#575756]'>{cart?.clientProfileData?.document}</Text>
					<Text className='mb-1 text-[14px] font-medium leading-[150%] text-[#575756]'>{cart?.clientProfileData?.phone}</Text>
				</View>
			</SimpleCard>
			<OtpLogin
				open={showOtpLogin}
				onClose={() => setShowOtpLogin(false)}
				onLogged={goToPersonalData}
			/>
		</>
	)
}

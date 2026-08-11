import { View } from 'eitri-luminus'

import { CustomButton, BottomInset, CustomInput } from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../../providers/LocalCart'
import { loginWithEmailAndKey, sendAccessKeyByEmail } from '../../services/CustomerService'

export default function OtpLogin(props) {
	const { open, onClose, onLogged } = props
	const { cart, startCart } = useLocalShoppingCart()

	const [timeOutToResentEmail, setTimeOutToResentEmail] = useState(0)
	const [verificationCode, setVerificationCode] = useState('')
	const [loginError, setLoginError] = useState(false)
	const [loadingLogin, setLoadingLogin] = useState(false)

	const [email, setEmail] = useState('')

	useEffect(() => {
		if (!open) return
		sendOtpEmail(cart?.clientProfileData?.email)
		setEmail(cart?.clientProfileData?.email)
	}, [cart, open])

	const sendOtpEmail = async (email) => {
		try {
			if (!email) return
			if (timeOutToResentEmail > 0) {
				return
			}
			console.error('Enviando email:', email)
			await sendAccessKeyByEmail(email)
		} catch (e) {
			console.error('Erro ao enviar email:', e)
			setTimeOutToResentEmail(0)
		}
	}

	const loginWithEmailAndAccessKey = async () => {
		try {
			setLoadingLogin(true)
			const loggedIn = await loginWithEmailAndKey(email, verificationCode)
			if (loggedIn === 'Success') {
				await startCart()
				onLogged()
			} else {
				setLoginError(true)
			}
			setLoadingLogin(false)
		} catch (e) {
			setLoadingLogin(false)
			setLoginError(true)
			console.error('Erro ao fazer login com email e chave de acesso:', e)
		}
	}

	const maskEmailSimple = (email) => {
		if (!email) return ''
		const [local, domain] = email.split('@')
		if (!domain) return email
		if (local.length <= 2) return local[0] + '*@' + domain
		const masked = local[0] + '*'.repeat(local.length - 1)
		return `${masked}@${domain}`
	}

	if (!open) return null

	return (
		<View
			className='fixed inset-0 z-[9999] flex items-end justify-center !bg-black/70 !opacity-100'
			onClick={() => {
				if (typeof onClose === 'function') onClose()
			}}>
			<View
				onClick={(e) => e.stopPropagation()}
				className='pointer-events-auto max-h-[70vh] w-screen overflow-y-auto !rounded-t-sm bg-white p-4'>
				<Text className='text-lg font-semibold'>
					{`Por questões de segurança, nos informe o código enviado para seu email ${maskEmailSimple(email)}`}
				</Text>

				<View className='mt-6 flex flex-col gap-2'>
					<View>
						<CustomInput
							placeholder={'Código enviado para o email'}
							inputMode='numeric'
							value={verificationCode}
							onChange={(e) => setVerificationCode(e.target.value)}
							height='45px'
						/>
						<View className='min-h-[20px]'>
							{loginError && <Text className='text-sm font-bold text-red-500'>Código inválido</Text>}
						</View>
					</View>

					{loadingLogin ? (
						<View className='flex justify-center'>
							<LoadingComponent inline />
						</View>
					) : (
						<CustomButton
							disabled={!verificationCode}
							label='Continuar'
							onClick={loginWithEmailAndAccessKey}
						/>
					)}
				</View>

				<BottomInset />
			</View>
		</View>
	)
}

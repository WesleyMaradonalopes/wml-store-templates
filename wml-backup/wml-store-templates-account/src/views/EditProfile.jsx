import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import {
	AppFieldGroup,
	AppInput,
	HeaderText,
	HeaderContentWrapper,
	Loading,
	HeaderReturn,
	BottomInset,
	AppActionButton,
	AppCard,
	AppText,
} from 'wml-store-templates-shared'

import { getCustomerData, setCustomerData } from '../services/CustomerService'
import { sendScreenView } from '../services/TrackingService'
import formatDateMMDDYYYY, { formatDate } from '../utils/utils'
import { addonUserTappedActiveTabListener } from '../utils/backToTopListener'
import { useLocalShoppingCart } from '../providers/LocalCart'
import { Select } from 'eitri-luminus';

export default function EditProfile(props) {
	const PAGE = 'Dados Pessoais'
	const [user, setUser] = useState({})
	const [isLoading, setIsLoading] = useState(false)
	const [errors, setErrors] = useState({})
	const [showNotification, setShowNotification] = useState(false)
	const [isEditing, setIsEditing] = useState(false)

	const { t } = useTranslation()
	const { cart } = useLocalShoppingCart()
	const labelClassName = 'mb-1 w-full font-sans text-xs font-medium leading-4 text-[#575756]'
	const inputClassName = 'h-12 rounded-lg !border border-[#B0A69B] px-3 text-[#1E120D]'
	const disabledInputClassName = 'h-12 rounded-lg !border border-[#D9D3CD] bg-[#ECE8E4] px-3 text-[#A49A8E]'
	const valueTextClassName = 'font-sans text-base font-medium leading-6 text-[#A49A8E]'

	useEffect(() => {
		const customerData = props?.location?.state?.customerData

		if (!customerData) {
			loadMe()
		} else {
			setUser({
				...user,
				...customerData,
				birthDate: formatDateMMDDYYYY(customerData?.birthDate),
			})
		}

		sendScreenView(PAGE, 'EditProfile')
		addonUserTappedActiveTabListener()
	}, [])

	const handleInputChange = (target, e) => {
		const value = e.target.value
		setUser({
			...user,
			[target]: value,
		})

		// Limpar erro do campo quando o usuário começar a digitar
		if (errors[target]) {
			setErrors({
				...errors,
				[target]: null,
			})
		}
	}

	const validateFields = () => {
		const newErrors = {}

		// Validar nome
		if (!user.firstName || user.firstName.trim() === '') {
			newErrors.firstName = 'Nome é obrigatório'
		}

		// Validar sobrenome
		if (!user.lastName || user.lastName.trim() === '') {
			newErrors.lastName = 'Sobrenome é obrigatório'
		}

		// Validar data de nascimento
		if (!user.birthDate || user.birthDate.trim() === '') {
			newErrors.birthDate = 'Data de nascimento é obrigatória'
		} else {
			const { isValid } = convertToISO(user.birthDate)
			if (!isValid) {
				newErrors.birthDate = 'Data de nascimento inválida ou menor de 18 anos'
			}
		}

		// Validar telefone
		if (!user.homePhone || user.homePhone.trim() === '') {
			newErrors.homePhone = 'Telefone é obrigatório'
		}

		// Validar CPF
		if (!user.document || user.document.trim() === '') {
			newErrors.document = 'CPF é obrigatório'
		}

		setErrors(newErrors)
		return Object.keys(newErrors)?.length === 0
	}

	const handleSave = async () => {
		try {
			// Validar campos antes de salvar
			if (!validateFields()) {
				return
			}

			setIsLoading(true)
			const { isValid, isoDate } = convertToISO(user.birthDate)
			if (!isValid) {
				setIsLoading(false)
				return
			}
			const updatedUser = await setCustomerData({ ...user, birthDate: isoDate })
			setUser({ ...updatedUser, birthDate: formatDateMMDDYYYY(updatedUser?.birthDate) })
			setIsLoading(false)
			setShowNotification(true)
			setIsEditing(false)
			setTimeout(() => {
				setShowNotification(false)
			}, 3000)
		} catch (e) {
			setIsLoading(false)
		}
	}

	const getGenderLabel = () => {
		switch (user?.gender) {
			case 'female':
				return t('editProfile.lbGenderFemale')
			case 'male':
				return t('editProfile.lbGenderMale')
			case 'prefer_not_to_say':
				return t('editProfile.lbGenderNotInform')
			case 'other':
				return t('editProfile.lbGenderOther')
			default:
				return '-'
		}
	}

	const loadMe = async () => {
		setIsLoading(true)
		const customerData = await getCustomerData()
		setUser({ ...customerData, birthDate: customerData?.birthDate ? formatDate(customerData?.birthDate) : '' })
		setIsLoading(false)
	}

	function convertToISO(dateStr) {
		const dt = dateStr?.replaceAll('/', '')
		const day = parseInt(dt.substring(0, 2), 10)
		const month = parseInt(dt.substring(2, 4), 10)
		const year = parseInt(dt.substring(4, 8), 10)

		const date = new Date(year, month - 1, day)

		// Valid date
		let isValid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day

		if (!isValid) {
			return { isValid }
		}

		// More than 18 years
		const today = new Date()

		isValid =
			today.getFullYear() - year > 18 ||
			(today.getFullYear() - year === 18 && today.getMonth() > month) ||
			(today.getFullYear() - year === 18 && today.getMonth() === month && today.getDate() >= day)

		if (!isValid) {
			return { isValid }
		}

		return { isValid, isoDate: date.toISOString() }
	}

	// Verificar se todos os campos obrigatórios estão preenchidos
	const isFormValid = () => {
		return (
			user.firstName &&
			user.firstName.trim() !== '' &&
			user.lastName &&
			user.lastName.trim() !== '' &&
			user.birthDate &&
			user.birthDate.trim() !== '' &&
			user.homePhone &&
			user.homePhone.trim() !== '' &&
			user.document &&
			user.document.trim() !== ''
		)
	}

	return (
		<Page
			title={PAGE}
			statusBarTextColor='white'
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={t('editProfile.headerTitle')} />
			</HeaderContentWrapper>

			<Loading
				fullScreen
				isLoading={isLoading}
			/>

			<View className='bg-[#F7F7F7] p-4 pb-6'>
				<AppCard
					title={t('editProfile.headerTitle')}>

					<View className='mt-6 flex flex-col gap-4'>
						{isEditing ? (
							<>
								<AppInput
									label={t('editProfile.lbEmail')}
									labelClassName={labelClassName}
									backgroundColor='background-color'
									placeholder={t('editProfile.lbEmail')}
									value={user?.email || ''}
									disabled
									inputClassName={disabledInputClassName}
								/>

								<AppInput
									label={t('editProfile.lbName')}
									required
									labelClassName={labelClassName}
									backgroundColor='background-color'
									placeholder={t('editProfile.lbName')}
									value={user?.firstName || ''}
									onChange={(value) => handleInputChange('firstName', value)}
									error={errors.firstName}
									inputClassName={inputClassName}
								/>

								<AppInput
									label={t('editProfile.lbLastName')}
									required
									labelClassName={labelClassName}
									backgroundColor='background-color'
									placeholder={t('editProfile.lbLastName')}
									value={user?.lastName || ''}
									onChange={(value) => handleInputChange('lastName', value)}
									error={errors.lastName}
									inputClassName={inputClassName}
								/>

								<AppInput
									label={t('editProfile.lbCPF')}
									required
									labelClassName={labelClassName}
									backgroundColor='background-color'
									placeholder='000.000.000-00'
									value={user.document || ''}
									inputMode='numeric'
									variant='mask'
									onChange={(value) => handleInputChange('document', value)}
									mask='999.999.999-99'
									error={errors.document}
									inputClassName={inputClassName}
								/>

								<AppInput
									label={t('editProfile.lbBirthdate')}
									required
									labelClassName={labelClassName}
									backgroundColor='background-color'
									placeholder='DD/MM/AAAA'
									variant='mask'
									mask='99/99/9999'
									inputMode='numeric'
									value={user?.birthDate || ''}
									onChange={(value) => handleInputChange('birthDate', value)}
									error={errors.birthDate}
									inputClassName={inputClassName}
								/>

								<AppFieldGroup
									label={t('editProfile.lbGender')}
									optionalLabel={t('editProfile.lbOptional')}
									labelClassName={labelClassName}>
									<Select
										value={user?.gender}
										onChange={(e) => handleInputChange('gender', e)}
										placeholder={t('editProfile.lbGenderPlaceholder')}
										className='h-12 w-full rounded-lg !border border-[#B0A69B] px-3 text-[#1E120D]'>
										<Select.Item value='female'>{t('editProfile.lbGenderFemale')}</Select.Item>
										<Select.Item value='male'>{t('editProfile.lbGenderMale')}</Select.Item>
										<Select.Item value='prefer_not_to_say'>{t('editProfile.lbGenderNotInform')}</Select.Item>
										<Select.Item value='other'>{t('editProfile.lbGenderOther')}</Select.Item>
									</Select>
								</AppFieldGroup>

								<AppInput
									label={t('editProfile.lbPhoneWithDDD')}
									required
									labelClassName={labelClassName}
									backgroundColor='background-color'
									placeholder='(99) 99999-9999'
									value={user?.homePhone?.replace('+55', '') || ''}
									inputMode='numeric'
									variant='mask'
									onChange={(value) => handleInputChange('homePhone', value)}
									mask='(99) 99999-9999'
									error={errors.homePhone}
									inputClassName={inputClassName}
								/>
							</>
						) : (
							<>
								<View>
									<View>
										<AppText className={labelClassName}>{t('editProfile.lbEmail')}</AppText>
									</View>
									<View>
										<AppText className={valueTextClassName}>{user?.email || '-'}</AppText>
									</View>
								</View>

								<View>
									<View>
										<AppText className={labelClassName}>{t('editProfile.lbName')}</AppText>
									</View>
									<View>
										<AppText className={valueTextClassName}>{user?.firstName || '-'}</AppText>
									</View>
								</View>

								<View>
									<View>
										<AppText className={labelClassName}>{t('editProfile.lbLastName')}</AppText>
									</View>
									<View>
										<AppText className={valueTextClassName}>{user?.lastName || '-'}</AppText>
									</View>
								</View>

								<View>
									<View>
										<AppText className={labelClassName}>{t('editProfile.lbCPF')}</AppText>
									</View>
									<View>
										<AppText className={valueTextClassName}>{user?.document || '-'}</AppText>
									</View>
								</View>

								<View>
									<View>
										<AppText className={labelClassName}>{t('editProfile.lbBirthdate')}</AppText>
									</View>
									<View>
										<AppText className={valueTextClassName}>{user?.birthDate || '-'}</AppText>
									</View>
								</View>

								<View>
									<View>
										<AppText className={labelClassName}>{`${t('editProfile.lbGender')} (${t('editProfile.lbOptional')})`}</AppText>
									</View>
									<View>
										<AppText className={valueTextClassName}>{getGenderLabel()}</AppText>
									</View>
								</View>

								<View>
									<View>
										<AppText className={labelClassName}>{t('editProfile.lbPhoneWithDDD')}</AppText>
									</View>
									<View>
										<AppText className={valueTextClassName}>{user?.homePhone?.replace('+55', '') || '-'}</AppText>
									</View>
								</View>

								<View className='mt-2'>
									<View onClick={() => setIsEditing(true)} className='w-fit'>
										<AppText className='font-sans text-sm font-medium leading-5 text-[#575756] underline'>
											{t('editProfile.lbEditPersonalData')}
										</AppText>
									</View>
								</View>
							</>
						)}
					</View>


				{showNotification && (
					<View className='flex flex-row items-center justify-between rounded bg-green-500 px-4 py-3 text-white shadow-lg'>
						<View className='flex flex-row items-center gap-2'>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								width='20'
								height='20'
								viewBox='0 0 24 24'
								fill='none'
								stroke='currentColor'
								strokeWidth='2'
								strokeLinecap='round'
								strokeLinejoin='round'
								className='text-white'>
								<path d='M20 6L9 17l-5-5'></path>
							</svg>
							<AppText className='font-medium text-white'>Salvo com sucesso!</AppText>
						</View>
					</View>
				)}

				{isEditing && (
					<View className='mt-6'>
						<AppActionButton
							label={t('editProfile.lbConfirm')}
							onPress={handleSave}
							disabled={!isFormValid() || isLoading}
						/>
					</View>
				)}
				</AppCard>
			</View>

			<BottomInset />
		</Page>
	)
}

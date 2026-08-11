import Eitri from 'eitri-bifrost'
import { useTranslation } from 'eitri-i18n'

import { useEffect, useState } from 'react'

import {
	HeaderContentWrapper,
	HeaderReturn,
	HeaderText,
	CustomButton,
	BottomInset,
	CustomInput,
} from 'wml-store-templates-shared'

import { useLocalShoppingCart } from '../providers/LocalCart'
import { cartHasCustomerData, registerToNotify } from '../services/cartService'
import { trackScreenView } from '../services/Tracking'
import LoadingComponent from '../components/Shared/Loading/LoadingComponent'
import { verifySocialNumber } from '../utils/verifySocialNumber'
import FixedBottom from '../components/FixedBottom/FixedBottom'
import { navigate } from '../services/navigationService'
import OtpLogin from '../components/OtpLogin/OtpLogin'

import { useCustomer } from '@/providers/Customer'
import { Select } from 'eitri-luminus'
import { getUserFromMasterdata, updateCustomerGender, saveGenderLocally } from '../services/CustomerService'

export default function PersonalData() {
	const { cart, addCustomerData } = useLocalShoppingCart()
	const { getUserByEmail, getCustomer } = useCustomer()

	const { t } = useTranslation()

	const [isLoading, setIsLoading] = useState(false)
	const [personalData, setPersonalData] = useState({
		email: '',
		firstName: '',
		lastName: '',
		documentType: '',
		document: '',
		phone: '',
		dob: '',
		gender: '',
	})
	const [userDataVerified, setUserDataVerified] = useState(false)
	const [masterdataUserId, setMasterdataUserId] = useState(null)
	const [showOtpLogin, setShowOtpLogin] = useState(false)
	const [inputOptions, setInputOptions] = useState([
		{
			id: 'firstName',
			label: 'firstName',
			type: 'string',
			title: t('personalData.frmName'),
			placeholder: 'Nome',
			inputMode: 'string',
			requeriedForPersonal: true,
			pristine: true,
			error: '',
		},
		{
			label: 'lastName',
			type: 'string',
			title: t('personalData.frmLastName'),
			placeholder: 'Sobrenome',
			inputMode: 'string',
			requeriedForPersonal: true,
			pristine: true,
			error: '',
		},
		{
			label: 'phone',
			type: 'string',
			title: 'Telefone com DDD',
			placeholder: '11 99999-9999',
			inputMode: 'tel',
			mask: '(99) 99999-9999',
			requeriedForPersonal: true,
			pristine: true,
			error: '',
		},
		{
			label: 'gender',
			type: 'select',
			title: t('personalData.frmGender'),
			placeholder: t('personalData.lbGenderPlaceholder'),
			options: [
				{ value: 'female', label: t('personalData.lbGenderFemale') },
				{ value: 'male', label: t('personalData.lbGenderMale') },
				{ value: 'prefer_not_to_say', label: t('personalData.lbGenderNotInform') },
				{ value: 'other', label: t('personalData.lbGenderOther') },
			],
			requeriedForPersonal: false,
			pristine: true,
			error: '',
		},
		{
			label: 'document',
			type: 'string',
			title: t('personalData.frmTaxpayerId'),
			placeholder: '000.000.000-00',
			inputMode: 'numeric',
			mask: '999.999.999-99',
			requeriedForPersonal: true,
			pristine: true,
			error: '',
		},
	])

	useEffect(() => {
		trackScreenView(`checkout_dados_cliente`, 'checkout.personalData')
	}, [])

	useEffect(() => {
		if (cart) {
			const cartProfile = cart.clientProfileData || {}
			setPersonalData((prev) => ({ ...prev, ...cartProfile }))
			if (cartProfile.email) {
				setUserDataVerified(true)
				if (!cartProfile.gender) {
					loadGenderFromMasterdata(cartProfile.email)
				}
			}
		}
	}, [cart])


	const handleFormDataChange = (key, value) => {
		setPersonalData({ ...personalData, [key]: value })
	}

	const handleFormBlur = (inputOption) => {
		const updateOption = (changes) => {
			setInputOptions((prev) => {
				const updated = [...prev]
				const index = updated.findIndex((opt) => opt.label === inputOption.label)
				if (index !== -1) {
					updated[index] = { ...inputOption, error: '', pristine: false, ...changes }
				}
				return updated
			})
		}

		const inputValue = personalData[inputOption.label]

		const isRequiredError =
			(inputOption.requeriedForPersonal && !inputValue)

		if (isRequiredError) {
			if (inputOption.label === 'firstName') {
				return updateOption({ error: 'Nome inválido' })
			}
			if (inputOption.label === 'lastName') {
				return updateOption({ error: 'Sobrenome inválido' })
			}
			if (inputOption.label === 'document') {
				return updateOption({ error: 'CPF inválido' })
			}
			if (inputOption.label === 'phone') {
				return updateOption({ error: 'Telefone inválido' })
			}
			return updateOption({ error: 'Este campo é obrigatório' })
		}

		if (inputOption.label === 'document') {
			const validSocialNumber = verifySocialNumber(inputValue.replace(/\D/g, ''))
			if (!validSocialNumber) {
				return updateOption({ error: 'CPF inválido' })
			}
		}

		if (inputOption.label === 'phone') {
			const digits = inputValue.replace(/\D/g, '').length
			if (digits < 10) {
				return updateOption({ error: 'Telefone inválido' })
			}
		}

		updateOption({})
	}

	const setUserData = async () => {
		const localPersonalData = {
			...personalData,
			documentType: 'cpf',
		}
		setPersonalData(localPersonalData)
		addUserData(localPersonalData)
	}

	const addUserData = async (userData) => {
		try {
			setIsLoading(true)

			await addCustomerData(userData)

			if (userData.gender) {
				if (masterdataUserId) {
					await updateCustomerGender(masterdataUserId, userData.gender)
				} else {
					await saveGenderLocally(userData.email, userData.gender)
				}
			} else {
			}

			setIsLoading(false)
			Eitri.navigation.navigate({ path: 'FreightResolver', replace: true })
		} catch (error) {
			console.error('error', error)
			if (error?.response?.data?.error?.code === 'CHK003') {
				setShowOtpLogin(true)
			}
		} finally {
			setIsLoading(false)
		}
	}

	const loadGenderFromMasterdata = async (email) => {
		const masterdataUser = await getUserFromMasterdata(email)
		if (masterdataUser?.id) {
			setMasterdataUserId(masterdataUser.id)
		}
		if (masterdataUser?.gender) {
			setPersonalData((prev) => ({ ...prev, gender: masterdataUser.gender }))
		} else {
		}
	}

	const findUserByEmail = async () => {
		setIsLoading(true)
		const client = await getUserByEmail(personalData.email)

		registerToNotify({
			customerId: client?.userProfileId || '',
			email: personalData.email || '',
		})

		if (client.userProfileId) {
			const updatedCart = await addCustomerData({ email: personalData.email }, cart.orderFormId)
			if (cartHasCustomerData(updatedCart)) {
				navigate('FreightResolver', {}, true)
			}
			await loadGenderFromMasterdata(personalData.email)
			setUserDataVerified(true)
		} else {
			setUserDataVerified(true)
		}
		setIsLoading(false)
	}



	const handleDataFilled = () => {
		return (
			personalData?.email !== '' &&
			personalData?.firstName !== '' &&
			personalData?.lastName !== '' &&
			verifySocialNumber(personalData?.document?.replace(/\D/g, '')) &&
			personalData?.phone !== ''
		)
	}

	const isValidEmail = (() => {
		const regex = /^[\w.-]+@[\w.-]+\.\w{2,}$/
		return regex.test(personalData?.email)
	})()

	return (
		<Page
			title='Checkout - Dados Pessoais'
			className='font-sans text-base text-primary'>
			<HeaderContentWrapper cartProps={{ cart }}>
				<HeaderReturn />
				<HeaderText text={t('personalData.title', 'Seus dados pessoais')} />
			</HeaderContentWrapper>

			{isLoading && <LoadingComponent fullScreen />}

			<View className='mx-4 mb-4 mt-6 flex flex-grow flex-col justify-between rounded-[16px] border border-[#EFEDEA] bg-white px-[17px] py-4 shadow-sm'>
				<View className='mb-2'>
					<Text className='block text-left font-montserrat text-[16px] font-medium leading-[150%] text-[#0F0805]'>Informe seu e-mail para continuar</Text>
					<Text className='block text-left text-[14px] font-medium leading-[150%] text-[#575756]'>Vamos verificar se você já fez alguma compra com a gente</Text>
				</View>

				<View className='flex flex-col gap-4'>
					<View className='flex w-full items-end justify-between gap-2'>
						<View className='w-3/4'>
							<CustomInput
								autoFocus={true}
								checkoutVariant
								label={`${t('personalData.frmEmail')} *`}
								value={personalData['email'] || ''}
								onChange={(e) => {
									handleFormDataChange('email', e.target?.value?.toLowerCase())
								}}
								placeholder={t('personalData.placeholderEmail')}
								inputMode={'email'}
							/>
						</View>
						<View className='w-1/4'>
							<CustomButton
								checkoutVariant
								adjacentToInput
								disabled={!isValidEmail}
								label='OK'
								onPress={findUserByEmail}
							/>
						</View>
					</View>

					{userDataVerified && (
						<>
							{inputOptions
								.map((inputOption) => (
									inputOption.type === 'select' ? (
										<View key={inputOption.label}>
											<Text className='mb-[4px] w-full text-[12px] font-normal leading-[150%] text-[#0F0805]'>{inputOption.title}</Text>
											<View className='relative'>
												<Select
													value={personalData[inputOption.label] || ''}
													onChange={(e) => handleFormDataChange(inputOption.label, e.target?.value || e)}
													placeholder={inputOption.placeholder}
													className='!h-[40px] !min-h-[40px] !max-h-[40px] w-full appearance-none rounded-[8px] border border-[#B0A69B] bg-none bg-transparent px-3 py-2 pr-10 text-[16px] font-normal leading-[150%] text-[#0F0805] placeholder:text-[#575756] [&::-ms-expand]:hidden'
													style={{
														appearance: 'none',
														WebkitAppearance: 'none',
														MozAppearance: 'none',
														backgroundImage: 'none',
														height: '40px',
														minHeight: '40px',
														maxHeight: '40px',
													}}
												>
													{inputOption.options?.map((option) => (
														<Select.Item key={option.value} value={option.value}>
															{option.label}
														</Select.Item>
													))}
												</Select>
												<View className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2'>
													<svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
														<path d='M10.0683 14.556C9.99789 14.5562 9.92814 14.5426 9.86308 14.5161C9.79802 14.4896 9.73895 14.4507 9.68923 14.4016L1.82626 6.65781C1.77643 6.60879 1.7369 6.55058 1.70992 6.48651C1.68294 6.42245 1.66898 6.35378 1.66895 6.28442C1.66891 6.21507 1.68275 6.14638 1.70968 6.08229C1.7366 6.0182 1.77615 5.95996 1.82593 5.9109C1.87571 5.86183 1.9348 5.82291 1.99986 5.79634C2.06492 5.76977 2.13465 5.75607 2.20508 5.75604C2.27551 5.75601 2.34521 5.76965 2.41029 5.79616C2.47537 5.82267 2.53456 5.86155 2.58438 5.91057L10.0689 13.2811L17.5535 5.91057C17.6541 5.81157 17.7906 5.75598 17.9328 5.75604C18.0751 5.7561 18.2114 5.81181 18.312 5.9109C18.4125 6.00999 18.469 6.14435 18.4689 6.28442C18.4689 6.42449 18.4123 6.55881 18.3116 6.65781L10.448 14.4016C10.3982 14.4508 10.339 14.4897 10.2738 14.5162C10.2087 14.5427 10.1388 14.5563 10.0683 14.556V14.556Z' fill='#0F0805'/>
													</svg>
												</View>
											</View>
											{inputOption.error && <Text className='mt-1 text-xs text-red-500'>{inputOption.error}</Text>}
										</View>
									) : (
										<CustomInput
											key={inputOption.label}
											checkoutVariant
											label={`${inputOption.title}${inputOption.requeriedForPersonal ? ' *' : ''}`}
											value={personalData[inputOption.label] || ''}
											placeholder={inputOption.placeholder}
											inputMode={inputOption.inputMode}
											mask={inputOption.mask}
											variant={inputOption.mask ? 'mask' : ''}
											error={inputOption.error}
											onChange={(e) => {
												handleFormDataChange(inputOption.label, e.target.value)
											}}
											onBlur={(e) => {
												handleFormBlur(inputOption)
											}}
										/>
									)
								))}
						</>
					)}
				</View>
			</View>

			{userDataVerified && (
				<FixedBottom
					className='align-center flex flex-col gap-4'
					offSetHeight={77}>
					<CustomButton
						checkoutVariant
						disabled={!handleDataFilled()}
						label={t('personalData.labelButton')}
						onPress={setUserData}
					/>
				</FixedBottom>
			)}

			<OtpLogin
				open={showOtpLogin}
				onClose={() => setShowOtpLogin(false)}
				onLogged={() => addUserData(personalData)}
			/>

			<BottomInset />
		</Page>
	)
}

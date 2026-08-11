import { useState, useEffect, useCallback } from 'react'

import { loginWithEmailAndKey, sendAccessKeyByEmail } from '../services/CustomerService'

const TIME_TO_RESEND_EMAIL = 60

/**
 * Hook reutilizável para fluxo de login com OTP (código por email).
 * Encapsula: envio de código, verificação, timer de reenvio.
 *
 * @param {Object} options
 * @param {Function} options.onSuccess - Callback chamado quando o login succeeds
 * @param {Function} options.onError - Callback chamado quando o login fails (recebe mensagem)
 * @param {Object} options.t - Objeto de tradução (i18next)
 * @param {boolean} options.requireTerms - Se deve exigir aceite de termos antes de enviar código
 * @param {boolean} options.termsChecked - Estado atual do aceite de termos
 *
 * @returns {Object} Estado e funções para controle do fluxo OTP
 */
export default function useOtpLogin(options = {}) {
	const { onSuccess, onError, t, requireTerms = false, termsChecked = false } = options

	const [email, setEmail] = useState('')
	const [verificationCode, setVerificationCode] = useState('')
	const [loading, setLoading] = useState(false)
	const [emailCodeSent, setEmailCodeSent] = useState(false)
	const [timeOutToResentEmail, setTimeOutToResentEmail] = useState(0)
	const [loadingSendingCode, setLoadingSendingCode] = useState(false)
	const [showLoginErrorAlert, setShowLoginErrorAlert] = useState(false)
	const [alertMessage, setAlertMessage] = useState('')

	const resendCode = timeOutToResentEmail <= 0

	// Timer de reenvio
	useEffect(() => {
		if (timeOutToResentEmail <= 0) return

		const timer = setTimeout(() => {
			setTimeOutToResentEmail((prev) => prev - 1)
		}, 1000)

		return () => clearTimeout(timer)
	}, [timeOutToResentEmail])

	const sendAccessKey = useCallback(async () => {
		if (requireTerms && !termsChecked) {
			setAlertMessage(t?.('signUp.alertMessageAcceptTerms') ?? 'Aceite os termos para continuar')
			setShowLoginErrorAlert(true)
			return
		}

		if (timeOutToResentEmail > 0 || !email) return

		setLoadingSendingCode(true)
		try {
			await sendAccessKeyByEmail(email)
			setEmailCodeSent(true)
			setTimeOutToResentEmail(TIME_TO_RESEND_EMAIL)
		} catch {
			setAlertMessage(t?.('signUp.alertMessageSendEmailError') ?? 'Erro ao enviar código por email')
			setShowLoginErrorAlert(true)
			setEmailCodeSent(false)
			setTimeOutToResentEmail(0)
		} finally {
			setLoadingSendingCode(false)
		}
	}, [email, requireTerms, termsChecked, t])

	const loginWithEmailAndAccessKey = useCallback(async () => {
		setLoading(true)
		try {
			const loggedIn = await loginWithEmailAndKey(email, verificationCode)

			if (loggedIn === 'Success') {
				if (onSuccess) onSuccess()
			} else if (loggedIn === 'WrongCredentials') {
				setAlertMessage(t?.('signUp.alertMessageInvalidToken') ?? 'Código inválido')
				setShowLoginErrorAlert(true)
				if (onError) onError('Código inválido')
			} else {
				setAlertMessage(t?.('signUp.alertMessageVerify') ?? 'Verifique seus dados')
				setShowLoginErrorAlert(true)
				if (onError) onError('Verifique seus dados')
			}
		} catch (e) {
			const status = e?.response?.status || 400
			const msg = status >= 500
				? (t?.('signUp.alertMessageServiceError') ?? 'Erro no servidor')
				: (t?.('signUp.alertMessageVerify') ?? 'Verifique seus dados')
			setAlertMessage(msg)
			setShowLoginErrorAlert(true)
			if (onError) onError(msg)
		} finally {
			setLoading(false)
		}
	}, [email, verificationCode, onSuccess, onError, t])

	return {
		email,
		setEmail,
		verificationCode,
		setVerificationCode,
		loading,
		emailCodeSent,
		timeOutToResentEmail,
		loadingSendingCode,
		showLoginErrorAlert,
		setShowLoginErrorAlert,
		alertMessage,
		resendCode,
		sendAccessKey,
		loginWithEmailAndAccessKey,
	}
}

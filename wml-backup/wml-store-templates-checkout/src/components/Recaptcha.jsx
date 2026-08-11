import { getToken, renderCaptchaButtonScript } from '../services/getCaptcha.js'

export default function Recaptcha(props) {
	const { token, setToken, visibleButton } = props

	const waitForElement = (selector) => {
		return new Promise((resolve) => {
			if (document.querySelector(selector)) {
				return resolve(document.querySelector(selector))
			}

			const observer = new MutationObserver((mutations) => {
				if (document.querySelector(selector)) {
					observer.disconnect()
					resolve(document.querySelector(selector))
				}
			})

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			})
		})
	}

	useEffect(() => {
		try {
			;(async () => {
				await waitForElement('#g-recaptcha-button')
				window?.grecaptcha?.render('g-recaptcha-button')
			})()
		} catch (error) {
			console.error(error)
		}
	}, [])

	const getRecaptchaToken = async () => {
		try {
			const token = await window?.grecaptcha?.execute()
			setToken(token)
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<>
			{renderCaptchaButtonScript()}
			{getToken()}
			{visibleButton && (
				<Button
					label='Get Recaptcha Token'
					block
					onPress={getRecaptchaToken}
				/>
			)}
		</>
	)
}

export function renderCaptchaButtonScript() {
	return (
		<>
			<button
				id='g-recaptcha-button'
				className='g-recaptcha'
				data-sitekey='6LfnaWwpAAAAABgH_xceKIvkbr5yuZyxfVA1ZMj_'
				data-callback='eitriShopRecaptchaOnSubmit'
				data-action='submit'></button>
		</>
	)
}

export function getToken(token) {
	window.eitriShopRecaptchaOnSubmit = (token) => {}
	return <></>
}

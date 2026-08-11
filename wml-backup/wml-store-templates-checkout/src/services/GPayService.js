import { Vtex } from 'eitri-shopping-vtex-shared'

export default async function loadGPaymentData() {
	return await Vtex.googlePay.loadPaymentData()
}

import Eitri from 'eitri-bifrost'

import { App } from 'eitri-shopping-vtex-shared'

import CreditCard from './Groups/CreditCard'
import BankInvoice from './Groups/BankInvoice'
import InstantPayment from './Groups/InstantPayment'
import GiftCard from './Groups/GiftCard'

import GooglePay from '@/components/PaymentsGroups/Groups/GooglePay'

export default function ImplementationInterface(props) {
	const { groupName, systemGroup, onSelectPaymentMethod } = props

	const PAYMENT_GROUPS_IMPLEMENTATION = {
		'creditCardPaymentGroup': CreditCard,
		'bankInvoicePaymentGroup': BankInvoice,
		'instantPaymentPaymentGroup': InstantPayment,
		'giftCardPaymentGroup': GiftCard,
		'WH Google PayPaymentGroup': GooglePay,
	}

	const externalPaymentsImplementation = App.configs.appConfigs?.externalPayments ?? []

	const externalPaymentRc = externalPaymentsImplementation.find(
		(externalPayment) => externalPayment.externalGroupName === groupName,
	)

	if ((!groupName || !PAYMENT_GROUPS_IMPLEMENTATION[groupName]) && !externalPaymentRc) {
		return null
	}

	if (externalPaymentRc) {
		return (
			<ExternalPayment
				systemGroup={systemGroup}
				groupName={groupName}
				externalPaymentRc={externalPaymentRc}
				onSelectPaymentMethod={onSelectPaymentMethod}
			/>
		)
	}

	if (!groupName || !PAYMENT_GROUPS_IMPLEMENTATION[groupName]) {
		return null
	}

	const Implementation = PAYMENT_GROUPS_IMPLEMENTATION[groupName]

	/*prettier-ignore*/
	return React.createElement(Implementation, { groupName, systemGroup, onSelectPaymentMethod })
}

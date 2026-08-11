import { getCustomerData } from '../services/CustomerService'

import { getUserByEmail } from '@/services/cartService'

const LocalCustomer = createContext({})

export default function CustomerProvider({ children }) {
	const [customer, setCustomer] = useState(null)
	const [checkoutProfile, setCheckoutProfile] = useState(null)

	const getCustomer = async () => {
		const customer = await getCustomerData()
		if (!customer) return
		setCustomer(customer)
		return customer
	}

	const _getUserByEmail = async (email) => {
		if (checkoutProfile && checkoutProfile?.userProfile?.email === email) return checkoutProfile
		const customer = await getUserByEmail(email)
		setCheckoutProfile(customer)
		return customer
	}

	return (
		<LocalCustomer.Provider
			value={{
				checkoutProfile,
				setCheckoutProfile,
				getCustomer,
				customer,
				getUserByEmail: _getUserByEmail,
			}}>
			{children}
		</LocalCustomer.Provider>
	)
}

export function useCustomer() {
	const context = useContext(LocalCustomer)

	return context
}

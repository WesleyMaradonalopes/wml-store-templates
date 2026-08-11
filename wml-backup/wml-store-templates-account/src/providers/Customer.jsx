import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { getCustomerData, isLoggedIn } from '../services/CustomerService'
import { Vtex } from 'eitri-shopping-vtex-shared'

const CustomerContext = createContext(null)

export default function CustomerProvider({ children }) {
    const [customerData, setCustomerData] = useState(null)
    const [isLogged, setIsLogged] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const loadCustomer = useCallback(async () => {
        setIsLoading(true)
        try {
            const logged = await isLoggedIn()
            setIsLogged(logged)
            
            const data = logged ? await getCustomerData() : null
            setCustomerData(data)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const logout = useCallback(() => {
        setCustomerData(null)
        setIsLogged(false)
        Vtex.cart.removeClientData()
    }, [])

    const value = useMemo(() => ({
        customerData, isLogged, isLoading, loadCustomer, logout
    }), [customerData, isLogged, isLoading, loadCustomer, logout])

    return (
        <CustomerContext.Provider value={value}>
            {children}
        </CustomerContext.Provider>
    )
}

export function useCustomer() {
    const context = useContext(CustomerContext)
    if (!context) throw new Error('useCustomer must be used within a CustomerProvider')
    return context
}
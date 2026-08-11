import Eitri from 'eitri-bifrost'

import { isLoggedIn } from '../../services/CustomerService'

export default function ProtectedView(props) {
	const { afterLoginRedirectTo, redirectState, labelLoading } = props

	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		async function checkIfUserIsLogged() {
			setIsLoading(true)
			const logged = await isLoggedIn()

			if (!logged) {
				Eitri.navigation.navigate({
					path: 'SignIn',
					replace: true,
					state: { redirectTo: afterLoginRedirectTo, redirectState: redirectState },
				})
			}

			return setIsLoading(false)
		}

		checkIfUserIsLogged()
	}, [])

	if (isLoading) {
		return (
			<View
				display='flex'
				justifyContent='center'
				alignItems='center'
				minHeight='100vh'>
				<Text block>{labelLoading || 'Carregando...'}</Text>
			</View>
		)
	}

	return <>{props.children}</>
}

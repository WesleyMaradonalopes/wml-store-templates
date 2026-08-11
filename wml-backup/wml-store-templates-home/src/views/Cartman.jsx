import Eitri from 'eitri-bifrost'

import { Vtex } from 'eitri-shopping-vtex-shared'

export default function Cartman() {
	const [cart, setCart] = useState()

	useEffect(() => {
		getCart()
	}, [])

	const getCart = async () => {
		try {
			const cart = await Vtex.cart.getCartIfExists()
			console.info('cart========>', cart.orderFormId)
			setCart(cart)
		} catch (error) {
			console.error('Erro ao buscar carrinho', error)
		}
	}

	const generateNewCart = async () => {
		const cart = await Vtex.cart.generateNewCart()
		setCart(cart)
	}

	const addRandomItem = async () => {
		const products = await Vtex.catalog.legacyParamsSearch('fq=P:%5B0%2520TO%252099999%5D&_from=0&_to=49')
		const product = products[Math.floor(Math.random() * products.length)]
		const sku = product.items[0]
		const result = await Vtex.cart.addItem(sku)
		setCart(result)
	}

	const goToHome = async () => {
		Eitri.navigation.navigate({ path: 'Home', replace: true })
		return
	}

	const clearCart = async () => {
		await Vtex.cart.clearCart()
		return
	}

	return (
		<Page
			bottomInset
			topInset
			className='font-sans text-base text-primary'>
			<View
				className='flex flex-col gap-4 p-4'
				bottomInset
				topInset>
				<Text>{`Id do carrinho: ${cart?.orderFormId}`}</Text>
				{cart?.items?.map((item) => (
					<Text key={item?.id || item?.uniqueId}>{`Item no carrinho: ${item?.name}`}</Text>
				))}
				<Button
					className='btn-primary w-full'
					onClick={generateNewCart}>
					Novo carrinho
				</Button>
				<Button
					className='btn-primary w-full'
					onClick={addRandomItem}>
					Adicionar item aleatório
				</Button>
				<Button
					className='btn-primary w-full'
					onClick={clearCart}>
					Limpar carrinho
				</Button>
				<Button
					className='btn-primary w-full'
					onClick={goToHome}>
					Ir pra Home
				</Button>
			</View>
		</Page>
	)
}

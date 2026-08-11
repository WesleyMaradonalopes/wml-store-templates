import Eitri from 'eitri-bifrost'
import { Text, View, Button } from 'eitri-luminus'

/**
 * Função de Erro Genérico.
 *
 * @param {function} onRetryPress Função a ser executada ao pressionar o botão TENTAR NOVAMENTE.
 *
 */
export default function GenericError(props) {
	const {
		onRetryPress = () => {
			console.log('onRetryPress not implemented')
		},
	} = props
	const [appSlug, setAppSlug] = useState('')

	async function getConfigs() {
		try {
			const configs = await Eitri.getConfigs()
			setAppSlug(configs?.miniAppData?.slug)
		} catch (error) {
			console.error('@Shared.GenericError.getConfigs', error)
		}
	}
	getConfigs()

	function onCancelPress() {
		Eitri.navigation.backToTop()
	}

	const date = new Date(Date.now())
	const formattedDateHour = new Intl.DateTimeFormat('pt-BR', {
		dateStyle: 'short',
		timeStyle: 'short',
		timeZone: 'America/Sao_Paulo',
	}).format(date)

	return (
		<View className='flex min-h-[85vh] items-center justify-center bg-opacity-90'>
			<View className='flex h-full w-full max-w-md flex-col rounded-2xl'>
				<View className='flex w-full items-center justify-center'>
					<View className='flex h-[15vh] w-[30%] items-center justify-center rounded-full bg-slate-50 p-4'>
						<Text className='text-center !text-[100px] font-bold'>!</Text>
					</View>
				</View>
				<View className='flex h-full flex-col p-4'>
					<Text className='mb-4 mt-5 text-center text-[23px] font-bold'>Não foi possível continuar</Text>
					<Text className='text-center !text-[16px]'>
						Verifique a conexão com a internet do seu dispositivo ou atualizações do aplicativo
					</Text>
				</View>
				<View className='absolute bottom-[8%] left-1/2 flex w-full -translate-x-1/2 transform flex-col items-center justify-center'>
					<Button
						className='btn flex w-[80%] items-center bg-black/60 px-0 pb-0 text-[16px] font-medium text-white/90 shadow-none'
						onClick={onRetryPress}>
						TENTAR NOVAMENTE
					</Button>
					<Button
						className='btn mt-[10px] w-[80%] items-center border-transparent bg-white px-0 pb-0 text-[16px] font-medium text-black/60 shadow-none'
						onClick={onCancelPress}>
						CANCELAR
					</Button>
					<Text className='relative top-[25px] text-center !text-[14px]'>{formattedDateHour}</Text>
					<Text className='relative top-[25px] text-center !text-[14px]'>{appSlug ?? ''}</Text>
				</View>
			</View>
		</View>
	)
}

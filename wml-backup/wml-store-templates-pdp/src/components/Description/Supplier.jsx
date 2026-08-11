import { useTranslation } from 'eitri-i18n'
export default function Supplier(props) {
	const { supplier } = props
	const [collapsed, setCollapsed] = useState(true)
	const { t } = useTranslation()
	const toggleCollapsedState = () => {
		setCollapsed(!collapsed)
	}
	return (
		<View>
			<View onClick={() => toggleCollapsedState()}>
				<View className='flex w-full items-center justify-between'>
					<Text className='text-lg font-bold'>{t('supplier.txtSupplier')}</Text>
					<View>{/* <Icon iconKey={collapsed ? 'chevron-down' : 'chevron-up'} width={26} /> */}</View>
				</View>
			</View>
			{!collapsed && (
				<View>
					<Text>{supplier}</Text>
				</View>
			)}
			<View
				style={{
					width: '100%',
					height: '1px',
					backgroundColor: '#E5E5E5',
				}}
			/>
		</View>
	)
}

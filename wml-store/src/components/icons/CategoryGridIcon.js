import Svg, { Rect } from 'react-native-svg';

/** Variante do ícone de categorias usado no BottomBar nativo da Eitri. */
export default function CategoryGridIcon({ color = '#0a0a0a', size = 24 }) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Rect x="3.25" y="3.25" width="7" height="7" rx="0.7" stroke={color} strokeWidth="1.5" />
			<Rect x="13.75" y="3.25" width="7" height="7" rx="0.7" stroke={color} strokeWidth="1.5" />
			<Rect x="3.25" y="13.75" width="7" height="7" rx="0.7" stroke={color} strokeWidth="1.5" />
			<Rect x="13.75" y="13.75" width="7" height="7" rx="0.7" stroke={color} strokeWidth="1.5" />
		</Svg>
	);
}

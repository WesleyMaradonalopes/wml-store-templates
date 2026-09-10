import { Circle, Path, Svg } from 'react-native-svg';

type Props = {
  color?: string;
  size?: number;
};

export default function ShareIcon({ color = '#0a0a0a', size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={18} cy={5} r={3} stroke={color} strokeWidth={1.8} />
      <Circle cx={6} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Circle cx={18} cy={19} r={3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

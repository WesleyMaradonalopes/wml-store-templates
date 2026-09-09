import { Path, Svg } from 'react-native-svg';

type ArrowUpIconProps = {
  color?: string;
  size?: number;
};

export default function ArrowUpIcon({ color = '#1e120d', size = 16 }: ArrowUpIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M6 11l6-6 6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

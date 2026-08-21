import { Path, Svg } from 'react-native-svg';

type CloseIconProps = {
  color?: string;
  size?: number;
};

export default function CloseIcon({ color = '#0a0a0a', size = 24 }: CloseIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 5L19 19M19 5L5 19" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

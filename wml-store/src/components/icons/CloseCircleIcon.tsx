import { Circle, Path, Svg } from 'react-native-svg';

type CloseCircleIconProps = {
  color?: string;
  size?: number;
};

export default function CloseCircleIcon({ color = '#FFFFFF', size = 28 }: CloseCircleIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9.25" stroke={color} strokeWidth={1.35} />
      <Path d="M9.25 9.25L14.75 14.75M14.75 9.25L9.25 14.75" stroke={color} strokeWidth={1.35} strokeLinecap="round" />
    </Svg>
  );
}

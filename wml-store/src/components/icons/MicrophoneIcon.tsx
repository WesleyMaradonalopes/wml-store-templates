import { Path, Svg } from 'react-native-svg';

type MicrophoneIconProps = {
  color?: string;
  size?: number;
};

export default function MicrophoneIcon({ color = '#0a0a0a', size = 24 }: MicrophoneIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M18 11.5V12a6 6 0 0 1-12 0v-.5M12 18v3M8.5 21h7" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

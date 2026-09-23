import { Path, Svg } from 'react-native-svg';

type SpeakerIconProps = {
  color?: string;
  muted?: boolean;
  size?: number;
};

export default function SpeakerIcon({ color = '#FFFFFF', muted = false, size = 28 }: SpeakerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9.25V14.75H7.7L12.8 18.8V5.2L7.7 9.25H4Z" stroke={color} strokeWidth={1.45} strokeLinejoin="round" />
      {muted ? (
        <Path d="M16 9.5L20.5 14.5M20.5 9.5L16 14.5" stroke={color} strokeWidth={1.45} strokeLinecap="round" />
      ) : (
        <>
          <Path d="M15.6 9.15C16.45 9.95 16.9 10.9 16.9 12C16.9 13.1 16.45 14.05 15.6 14.85" stroke={color} strokeWidth={1.45} strokeLinecap="round" />
          <Path d="M18.2 6.8C19.7 8.25 20.5 9.95 20.5 12C20.5 14.05 19.7 15.75 18.2 17.2" stroke={color} strokeWidth={1.45} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

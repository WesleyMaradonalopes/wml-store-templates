import { Path, Svg } from 'react-native-svg';

type SmartAiIconProps = {
  color?: string;
  size?: number;
};

/** Native version of the three-sparkle Hope Resort AI mark used on the web. */
export default function SmartAiIcon({ color = '#FFFFFF', size = 24 }: SmartAiIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 45 45" fill="none">
      <Path
        d="M13 10 C14 16 14 16 20 17 C14 18 14 18 13 24 C12 18 12 18 6 17 C12 16 12 16 13 10Z"
        fill={color}
      />
      <Path
        d="M23 4 C24 9 24 9 29 10 C24 11 24 11 23 16 C22 11 22 11 17 10 C22 9 22 9 23 4Z"
        fill={color}
      />
      <Path
        d="M27 11 C29 22 29 22 41 25 C29 28 29 28 27 41 C25 28 25 28 13 25 C25 22 25 22 27 11Z"
        fill={color}
      />
    </Svg>
  );
}

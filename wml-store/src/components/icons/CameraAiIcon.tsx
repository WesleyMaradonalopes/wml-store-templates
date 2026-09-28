import { Circle, Path, Svg } from 'react-native-svg';

type CameraAiIconProps = {
  color?: string;
  size?: number;
};

/** Camera glyph adapted from the web assistant image-search control. */
export default function CameraAiIcon({ color = '#0a0a0a', size = 24 }: CameraAiIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 192 192" fill="none">
      <Circle cx="144.07" cy="144" r="16" fill={color} />
      <Circle cx="96.07" cy="104" r="24" fill={color} />
      <Path
        fill={color}
        d="M24 135.2c0 18.11 14.69 32.8 32.8 32.8H96v-16l-40.1-.1c-8.8 0-15.9-8.19-15.9-17.9v-18H24v19.2z"
      />
      <Path
        fill={color}
        d="M168 72.8c0-18.11-14.69-32.8-32.8-32.8H116l20 16c8.8 0 16 8.29 16 18v30h16V72.8z"
      />
      <Path
        fill={color}
        d="M112 24H80L68 40H56.8C38.69 40 24 54.69 24 72.8V92h16V74c0-9.71 7.2-18 16-18h80l-24-32z"
      />
    </Svg>
  );
}

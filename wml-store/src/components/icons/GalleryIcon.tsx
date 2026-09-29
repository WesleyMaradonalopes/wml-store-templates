import { Circle, Path, Rect, Svg } from 'react-native-svg';

type GalleryIconProps = {
  color?: string;
  size?: number;
};

/** Gallery glyph used by the assistant image picker. */
export default function GalleryIcon({ color = '#0a0a0a', size = 24 }: GalleryIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      stroke={color}
      strokeWidth={24}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="100" y="56" width="388" height="314" rx="36" />
      <Circle cx="192" cy="148" r="32" />
      <Path d="M106 342 L200 248 Q210 238 222 248 L262 288 Q266 292 270 288 L358 180 Q368 168 380 180 L488 304" />
      <Path d="M54 214 L14 364 Q8 388 34 396 L360 484 Q384 490 390 466 L420 414" />
    </Svg>
  );
}

import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ArrowLeftIAIcon({
  color = '#0a0a0a',
  size = 24,
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
    >
      <Path
        d="M11 1L4 8L11 15"
        stroke={color}
        strokeWidth={1}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
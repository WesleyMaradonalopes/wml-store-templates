import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ArrowRightAIcon({
  color = '#1E120D',
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
        d="M5 15L12 8L5 1"
        stroke={color}
        strokeWidth={1}
        strokeMiterlimit={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
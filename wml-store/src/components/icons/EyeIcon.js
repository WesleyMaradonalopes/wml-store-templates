import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';

export default function EyeIcon({ color = '#000', size = 20, off = false }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1.5 12C1.5 12 5 6 12 6C19 6 22.5 12 22.5 12C22.5 12 19 18 12 18C5 18 1.5 12 1.5 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
      {off ? <Path d="M4 20L20 4" stroke={color} strokeWidth={1.8} strokeLinecap="round" /> : null}
    </Svg>
  );
}
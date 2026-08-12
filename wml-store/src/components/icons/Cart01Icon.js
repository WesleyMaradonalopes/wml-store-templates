import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function Cart01Icon({ color = '#313235', size = 24 }) {
  return (
    <Svg width={size * (49 / 48)} height={size} viewBox="0 0 49 48" fill="none">
      <Path
        d="M16.5 32H31.0264C40.0016 32 41.3666 26.3616 43.022 18.1382C43.4996 15.7662 43.7384 14.5803 43.1642 13.7901C42.59 13 41.4894 13 39.2882 13H12.5"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path
        d="M16.5 32L11.2575 7.02986C10.8123 5.24918 9.21236 4 7.3769 4H5.5"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path
        d="M18.26 32H17.4371C14.7104 32 12.5 34.3026 12.5 37.1428C12.5 37.6162 12.8684 38 13.3229 38H35.5"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21.5 44C23.1569 44 24.5 42.6569 24.5 41C24.5 39.3431 23.1569 38 21.5 38C19.8431 38 18.5 39.3431 18.5 41C18.5 42.6569 19.8431 44 21.5 44Z"
        stroke={color}
        strokeWidth="3"
      />
      <Path
        d="M35.5 44C37.1569 44 38.5 42.6569 38.5 41C38.5 39.3431 37.1569 38 35.5 38C33.8431 38 32.5 39.3431 32.5 41C32.5 42.6569 33.8431 44 35.5 44Z"
        stroke={color}
        strokeWidth="3"
      />
    </Svg>
  );
}

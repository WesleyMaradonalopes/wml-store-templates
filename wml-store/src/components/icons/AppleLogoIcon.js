import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.39 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.52 4.08ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z\" fill=\"#0a0a0a\"/></svg>";

/** Apple logo used by the account sign-in action. */
export default function AppleLogoIcon({ size = 20 }) {
  return <SvgXml xml={SVG} width={size} height={size} />;
}

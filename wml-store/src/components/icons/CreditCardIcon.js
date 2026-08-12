import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\r\n    <path d=\"M22 6V18C22 18.55 21.8043 19.021 21.413 19.413C21.021 19.8043 20.55 20 20 20H4C3.45 20 2.97933 19.8043 2.588 19.413C2.196 19.021 2 18.55 2 18V6C2 5.45 2.196 4.97933 2.588 4.588C2.97933 4.196 3.45 4 4 4H20C20.55 4 21.021 4.196 21.413 4.588C21.8043 4.97933 22 5.45 22 6ZM4 8H20V6H4V8ZM4 12V18H20V12H4ZM4 18V6V18Z\"\r\n          fill=\"__ICON_COLOR__\"/>\r\n</svg>\r\n";

/** Reusable component generated from credit_card.svg. viewBox 0 0 24 24 */
export default function CreditCardIcon({ color = 'black', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

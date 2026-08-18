import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg preserveAspectRatio=\"none\" width=\"100%\" height=\"100%\" overflow=\"visible\" viewBox=\"0 0 16 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\r\n<g>\r\n<path d=\"M9.9528 11.4458H5.04538M9.9528 11.4458H12.8891C14.4134 11.4458 14.1558 10.1025 13.3847 9.42072C10.6077 6.96877 14.5523 1.33472 7.49909 1.33472C0.445891 1.33472 4.39133 6.96805 1.61425 9.42072C0.872447 10.0765 0.55639 11.4458 2.10986 11.4458H5.04538M9.9528 11.4458C9.9528 12.8361 9.42631 14.3347 7.49909 14.3347C5.57187 14.3347 5.04538 12.8361 5.04538 11.4458\" stroke=\"__ICON_COLOR__\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\r\n</g>\r\n</svg>\r\n";

/** Reusable component generated from home-notifications.svg. viewBox 0 0 16 16 */
export default function HomeNotificationsIcon({ color = 'var(--stroke-0, #0a0a0a)', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg width=\"16\" height=\"21\" viewBox=\"0 0 16 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\r\n<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M7.87485 0C8.9719 0 9.90286 0.391848 10.6667 1.17631C11.4307 1.96077 11.8123 2.91687 11.8123 4.04324V4.82703H15.7497V21H0V4.82703H3.93742V4.04324C3.93742 2.91685 4.31899 1.96078 5.08297 1.17631C5.84695 0.391848 6.77784 0 7.87485 0ZM0.823167 5.67235V20.1547H14.9265V5.67235H0.823167ZM7.87485 0.845316C6.99347 0.845316 6.25376 1.15117 5.65635 1.76446C5.05888 2.37796 4.76059 3.13809 4.76059 4.04324V4.82703H10.9891V4.04324C10.9891 3.13809 10.6908 2.37796 10.0933 1.76446C9.49595 1.15115 8.75617 0.845316 7.87485 0.845316Z\" fill=\"__ICON_COLOR__\"/>\r\n</svg>\r\n";

/** Reusable component generated from add-to-cart-trigger.svg. viewBox 0 0 16 21 */
export default function AddToCartTriggerIcon({ color = '#0F0805', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size * 0.7619047619047619} height={size} />;
}

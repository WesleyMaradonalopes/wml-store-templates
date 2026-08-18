import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg\r\n        width='24'\r\n        height='24'\r\n        viewBox='0 0 24 24'\r\n        fill='none'\r\n        xmlns='http://www.w3.org/2000/svg'>\r\n    <path\r\n            d='M3 9V19C3 19.5523 3.44772 20 4 20H20C20.5523 20 21 19.5523 21 19V9'\r\n            stroke='__ICON_COLOR__'\r\n            stroke-width='2'\r\n            stroke-linecap='round'\r\n            stroke-linejoin='round'\r\n    />\r\n    <path\r\n            d='M21 7L18.5 2H5.5L3 7V9C3 10.1046 3.89543 11 5 11C6.10457 11 7 10.1046 7 9C7 10.1046 7.89543 11 9 11C10.1046 11 11 10.1046 11 9C11 10.1046 11.8954 11 13 11C14.1046 11 15 10.1046 15 9C15 10.1046 15.8954 11 17 11C18.1046 11 19 10.1046 19 9C19 10.1046 19.8954 11 21 11V9L21 7Z'\r\n            stroke='__ICON_COLOR__'\r\n            stroke-width='2'\r\n            stroke-linecap='round'\r\n            stroke-linejoin='round'\r\n    />\r\n    <path\r\n            d='M9 14H15'\r\n            stroke='__ICON_COLOR__'\r\n            stroke-width='2'\r\n            stroke-linecap='round'\r\n            stroke-linejoin='round'\r\n    />\r\n</svg>\r\n";

/** Reusable component generated from store.svg. viewBox 0 0 24 24 */
export default function StoreIcon({ color = '#0a0a0a', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

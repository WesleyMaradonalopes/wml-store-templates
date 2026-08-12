import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\r\n<path d=\"M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z\" stroke=\"__ICON_COLOR__\" stroke-width=\"1.5\"/>\r\n<path d=\"M7.5 12.0685C8.59944 11.6998 9.77639 11.5 11 11.5C13.0238 11.5 14.9199 12.0465 16.5488 13M18 10C16.1509 8.7383 13.9122 8 11.5 8C9.90307 8 8.38216 8.32358 7 8.90839M15.129 16C13.8927 15.3609 12.4894 15 11.0018 15C10.1819 15 9.38762 15.1096 8.63281 15.315\" stroke=\"__ICON_COLOR__\" stroke-width=\"1.5\" strokeLinecap=\"round\"/>\r\n</svg>\r\n";

/** Reusable component generated from spotify.svg. viewBox 0 0 24 24 */
export default function SpotifyIcon({ color = 'black', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

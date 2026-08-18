import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" fill=\"none\">\r\n\t<path\r\n\t\td=\"M17.6667 9.24242H2.33341C1.96522 9.24242 1.66675 9.5816 1.66675 10C1.66675 10.4184 1.96522 10.7576 2.33341 10.7576H17.6667C18.0349 10.7576 18.3334 10.4184 18.3334 10C18.3334 9.5816 18.0349 9.24242 17.6667 9.24242Z\"\r\n\t\tfill=\"__ICON_COLOR__\" />\r\n\t<path\r\n\t\td=\"M14.3334 16.8182H2.33341C1.96522 16.8182 1.66675 17.1574 1.66675 17.5758C1.66675 17.9942 1.96522 18.3333 2.33341 18.3333H14.3334C14.7016 18.3333 15.0001 17.9942 15.0001 17.5758C15.0001 17.1574 14.7016 16.8182 14.3334 16.8182Z\"\r\n\t\tfill=\"__ICON_COLOR__\" />\r\n\t<path\r\n\t\td=\"M14.3334 1.66667H2.33341C1.96522 1.66667 1.66675 2.00584 1.66675 2.42424C1.66675 2.84264 1.96522 3.18182 2.33341 3.18182H14.3334C14.7016 3.18182 15.0001 2.84264 15.0001 2.42424C15.0001 2.00584 14.7016 1.66667 14.3334 1.66667Z\"\r\n\t\tfill=\"__ICON_COLOR__\" />\r\n\t\r\n\t\r\n</svg>\r\n";

/** Reusable component generated from hamburger.svg. viewBox 0 0 20 20 */
export default function HamburgerIcon({ color = '#0a0a0a', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

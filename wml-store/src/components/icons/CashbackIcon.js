import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg width=\"16px\" height=\"16px\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\r\n\t<g opacity=\"0.4\">\r\n\t\t<path\r\n\t\t\td=\"M9.5 13.7502C9.5 14.7202 10.25 15.5002 11.17 15.5002H13.05C13.85 15.5002 14.5 14.8202 14.5 13.9702C14.5 13.0602 14.1 12.7302 13.51 12.5202L10.5 11.4702C9.91 11.2602 9.51001 10.9402 9.51001 10.0202C9.51001 9.18023 10.16 8.49023 10.96 8.49023H12.84C13.76 8.49023 14.51 9.27023 14.51 10.2402\"\r\n\t\t\tstroke=\"__ICON_COLOR__\" stroke-width=\"1.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" />\r\n\t\t<path d=\"M12 7.5V16.5\" stroke=\"__ICON_COLOR__\" stroke-width=\"1.5\" strokeLinecap=\"round\"\r\n\t\t\tstrokeLinejoin=\"round\" />\r\n\t</g>\r\n\t<path d=\"M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2\" stroke=\"__ICON_COLOR__\"\r\n\t\tstroke-width=\"1.5\" strokeLinecap=\"round\" strokeLinejoin=\"round\" />\r\n\t<path d=\"M17 3V7H21\" stroke=\"__ICON_COLOR__\" stroke-width=\"1.5\" strokeLinecap=\"round\"\r\n\t\tstrokeLinejoin=\"round\" />\r\n\t<path d=\"M22 2L17 7\" stroke=\"__ICON_COLOR__\" stroke-width=\"1.5\" strokeLinecap=\"round\"\r\n\t\tstrokeLinejoin=\"round\" />\r\n</svg>\r\n";

/** Reusable component generated from cashback.svg. viewBox 0 0 24 24 */
export default function CashbackIcon({ color = '#1e120d', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

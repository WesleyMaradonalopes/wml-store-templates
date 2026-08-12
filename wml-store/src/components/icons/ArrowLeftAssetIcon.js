import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<?xml version=\"1.0\" encoding=\"iso-8859-1\"?>\r\n<!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->\r\n<svg fill=\"__ICON_COLOR__\" height=\"800px\" width=\"800px\" version=\"1.1\"\r\n     xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 476.213 476.213\" xml:space=\"preserve\">\r\n\t<polygon points=\"476.213,223.107 57.427,223.107 151.82,128.713 130.607,107.5 0,238.106 130.607,368.714 151.82,347.5\r\n\t57.427,253.107 476.213,253.107 \"/>\r\n</svg>\r\n";

/** Reusable component generated from arrow-left.svg. viewBox 0 0 476.213 476.213 */
export default function ArrowLeftAssetIcon({ color = '#000000', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

import { SvgXml } from 'react-native-svg';

const SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 16.7139C0.45 16.7139 -0.0206666 16.5182 -0.412 16.1269C-0.803333 15.7355 -0.999333 15.2645 -1 14.7139V0.713867C-1 0.163867 -0.804 -0.306799 -0.412 -0.698133C-0.02 -1.08947 0.450667 -1.28547 1 -1.28613H8V0.713867H1V14.7139H8V16.7139H1ZM12 12.7139L10.625 11.2639L13.175 8.71387H5V6.71387H13.175L10.625 4.16387L12 2.71387L17 7.71387L12 12.7139Z" fill="__ICON_COLOR__"/></svg>';

/** Reusable component generated from icon-logout.svg. viewBox 0 0 16 16 */
export default function LogoutIcon({ color = '#0a0a0a', size = 16 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

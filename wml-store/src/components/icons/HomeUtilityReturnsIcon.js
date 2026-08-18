import React from 'react';
import { SvgXml } from 'react-native-svg';

const SVG = "<svg preserveAspectRatio=\"none\" width=\"100%\" height=\"100%\" overflow=\"visible\" viewBox=\"0 0 17 14\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\r\n<path d=\"M12.1364 5.55521H16.5V1.22074M16.5 5.55521L13.1255 2.40546C12.3438 1.62866 11.3768 1.0612 10.3147 0.756029C9.25255 0.450858 8.1299 0.417923 7.05148 0.660298C5.97307 0.902672 4.97404 1.41246 4.14761 2.14208C3.32119 2.87171 2.6943 3.79739 2.32545 4.83276M4.86364 8.44486H0.5V12.7793M0.5 8.44486L3.87455 11.5945C4.65618 12.3713 5.62318 12.9388 6.68532 13.244C7.74745 13.5491 8.8701 13.5821 9.94852 13.3397C11.0269 13.0973 12.026 12.5875 12.8524 11.8579C13.6788 11.1283 14.3057 10.2026 14.6745 9.16724\" stroke=\"__ICON_COLOR__\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\r\n</svg>\r\n";

/** Reusable component generated from home-utility-returns.svg. viewBox 0 0 17 14 */
export default function HomeUtilityReturnsIcon({ color = 'var(--stroke-0, #0a0a0a)', size = 24 }) {
  const xml = SVG.replace(/__ICON_COLOR__/g, color);
  return <SvgXml xml={xml} width={size} height={size} />;
}

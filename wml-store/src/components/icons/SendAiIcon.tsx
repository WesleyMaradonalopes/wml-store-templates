import { Path, Svg } from 'react-native-svg';

type SendAiIconProps = {
  color?: string;
  size?: number;
};

/** Send glyph adapted from the web assistant composer. */
export default function SendAiIcon({ color = '#FFFFFF', size = 22 }: SendAiIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 25 24" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.51014 10.0393C7.80961 10.5777 8.3405 10.948 8.94919 11.0431L14.7002 11.9417C14.8023 11.9577 14.9057 11.9636 15.0088 11.9704C15.3486 11.9932 15.6036 12.1047 15.6036 12.4657C15.6036 12.8267 15.3486 12.9382 15.0088 12.9609C14.9057 12.9678 14.8023 12.9737 14.7002 12.9897L8.94919 13.8883C8.3405 13.9834 7.80961 14.3537 7.51014 14.8921L4.56519 20.1864C4.33343 20.6031 4.76088 21.0769 5.1991 20.889L23.7813 12.9253C24.1853 12.7521 24.1853 12.1793 23.7813 12.0061L5.1991 4.04232C4.76088 3.85451 4.33343 4.32829 4.56519 4.74495L7.51014 10.0393Z"
        fill={color}
      />
    </Svg>
  );
}

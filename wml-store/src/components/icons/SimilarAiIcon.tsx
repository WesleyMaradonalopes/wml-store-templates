import Svg, { Circle, ClipPath, Defs, G, Line } from 'react-native-svg';

type SimilarAiIconProps = {
  color?: string;
  size?: number;
};

/** Native version of the similar-products icon used by the web assistant. */
export default function SimilarAiIcon({ color = '#0a0a0a', size = 24 }: SimilarAiIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="26" cy="26" r="18" stroke={color} strokeWidth="2.5" />
      <Circle cx="38" cy="38" r="18" stroke={color} strokeWidth="2.5" />
      <Defs>
        <ClipPath id="similar-ai-clip">
          <Circle cx="32" cy="32" r="10" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#similar-ai-clip)">
        <Line x1="16" y1="48" x2="48" y2="16" stroke={color} strokeWidth="2" />
        <Line x1="20" y1="52" x2="52" y2="20" stroke={color} strokeWidth="2" />
        <Line x1="12" y1="44" x2="44" y2="12" stroke={color} strokeWidth="2" />
        <Line x1="24" y1="56" x2="56" y2="24" stroke={color} strokeWidth="2" />
      </G>
    </Svg>
  );
}

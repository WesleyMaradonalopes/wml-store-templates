import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import { useAppTheme } from '@/context/theme-context';
import { useTheme } from '@/hooks/use-theme';

function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.8" />
      <G stroke={color} strokeWidth="1.8" strokeLinecap="round">
        <Line x1="12" y1="2" x2="12" y2="4" />
        <Line x1="12" y1="20" x2="12" y2="22" />
        <Line x1="2" y1="12" x2="4" y2="12" />
        <Line x1="20" y1="12" x2="22" y2="12" />
        <Line x1="4.9" y1="4.9" x2="6.3" y2="6.3" />
        <Line x1="17.7" y1="17.7" x2="19.1" y2="19.1" />
        <Line x1="17.7" y1="6.3" x2="19.1" y2="4.9" />
        <Line x1="4.9" y1="19.1" x2="6.3" y2="17.7" />
      </G>
    </Svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z" fill={color} />
    </Svg>
  );
}

export function ThemeToggle() {
  const { colorScheme, toggleTheme } = useAppTheme();
  const theme = useTheme();
  const dark = colorScheme === 'dark';

  return (
    <Pressable
      accessibilityLabel={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      accessibilityRole="switch"
      accessibilityState={{ checked: dark }}
      hitSlop={6}
      onPress={toggleTheme}
      style={[styles.track, { backgroundColor: dark ? theme.surface : theme.surfaceMuted, borderColor: theme.border }]}
    >
      <View style={[styles.thumb, dark ? styles.darkThumb : styles.lightThumb, { backgroundColor: dark ? theme.primary : theme.background }]}>
        {dark ? <MoonIcon color={theme.onPrimary} /> : <SunIcon color={theme.text} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 52, height: 30, padding: 3, borderRadius: 18, borderWidth: 1, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lightThumb: { alignSelf: 'flex-start' },
  darkThumb: { alignSelf: 'flex-end' },
});

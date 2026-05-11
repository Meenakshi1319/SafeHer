/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from 'react-native';

const Colors = {
  light: { text: '#11181C', background: '#fff', tint: '#ff4d79', icon: '#687076', tabIconDefault: '#687076', tabIconSelected: '#ff4d79' },
  dark:  { text: '#ECEDEE', background: '#080810', tint: '#ff4d79', icon: '#9BA1A6', tabIconDefault: '#9BA1A6', tabIconSelected: '#ff4d79' },
};

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

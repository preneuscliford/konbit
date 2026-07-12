/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = theme === 'dark' ? props.dark : props.light;

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return theme === 'dark' ? Colors.dark[colorName] : Colors.light[colorName];
  }
}

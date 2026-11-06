import { createContext, useContext, type PropsWithChildren } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import {
  buildShadows,
  buildTypography,
  darkPalette,
  hit,
  lightPalette,
  radius,
  spacing,
  type Palette,
  type Shadows,
  type Typography,
} from '@/theme/tokens';

export { font, hit, radius, spacing } from '@/theme/tokens';
export type { Palette } from '@/theme/tokens';

export type Theme = {
  dark: boolean;
  colors: Palette;
  text: Typography;
  shadows: Shadows;
  spacing: typeof spacing;
  radius: typeof radius;
  hit: typeof hit;
};

function build(dark: boolean): Theme {
  const colors = dark ? darkPalette : lightPalette;
  return { dark, colors, text: buildTypography(colors), shadows: buildShadows(colors, dark), spacing, radius, hit };
}

export const lightTheme = build(false);
export const darkTheme = build(true);

const ThemeContext = createContext<Theme>(lightTheme);

/** Suit le réglage clair/sombre du téléphone. */
export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  return <ThemeContext.Provider value={scheme === 'dark' ? darkTheme : lightTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Feuille de style dépendante du thème, créée une fois par thème.
 *   const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.colors.surface } }));
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T) {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}

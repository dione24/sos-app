import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Système de design Nafalan — voir docs/design/DESIGN.md.
 * Une seule famille (DM Sans), une grille 4/8 et une identité rouge cohérente.
 */

export const font = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  full: 999,
} as const;

/** Tailles minimales des cibles tactiles. */
export const hit = {
  control: 48,
  action: 56,
} as const;

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  onColor: string;

  /** Rouge vif : SOS et appels d'urgence ; danger reste un état explicite. */
  sos: string;
  sosPressed: string;
  sosRing: string;
  dangerText: string;
  dangerBg: string;
  dangerBorder: string;

  /** Rouge profond de marque : actions normales, sélection et navigation. */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primaryText: string;
  primaryBg: string;
  primaryBorder: string;

  /** Vert sémantique : résultat réussi ou état confirmé, jamais le CTA par défaut. */
  successText: string;
  successBg: string;
  successBorder: string;

  warningText: string;
  warningBg: string;
  warningBorder: string;

  infoText: string;
  infoBg: string;
  infoBorder: string;

  overlay: string;
  shadow: string;
};

export const lightPalette: Palette = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F3F5',
  border: '#E4E4E8',
  borderStrong: '#8E8795',
  ink: '#1C1C24',
  inkMuted: '#52525F',
  inkFaint: '#6B6B78',
  onColor: '#FFFFFF',

  sos: '#C8102E',
  sosPressed: '#A50D25',
  sosRing: '#F8C9D0',
  dangerText: '#B4232D',
  dangerBg: '#FDEFF1',
  dangerBorder: '#F2BAC3',

  primary: '#A61B35',
  primaryPressed: '#87142A',
  onPrimary: '#FFFFFF',
  primaryText: '#A61B35',
  primaryBg: '#FCECEF',
  primaryBorder: '#E8B6C1',

  successText: '#16634A',
  successBg: '#ECF6F0',
  successBorder: '#BADBC7',

  warningText: '#B54708',
  warningBg: '#FFF6ED',
  warningBorder: '#FEDF89',

  infoText: '#475569',
  infoBg: '#F0F1F4',
  infoBorder: '#D8DAE2',

  overlay: 'rgba(28, 28, 36, 0.55)',
  shadow: '#1C1C24',
};

export const darkPalette: Palette = {
  bg: '#121114',
  surface: '#1D1B20',
  surfaceAlt: '#26232A',
  border: '#39343E',
  borderStrong: '#81778A',
  ink: '#F7F4F6',
  inkMuted: '#C4BEC6',
  inkFaint: '#A39CA8',
  onColor: '#FFFFFF',

  sos: '#DE163B',
  sosPressed: '#BA1231',
  sosRing: '#541A29',
  dangerText: '#FFB1B9',
  dangerBg: '#38191E',
  dangerBorder: '#81424A',

  primary: '#C83C59',
  primaryPressed: '#AD2B47',
  onPrimary: '#FFFFFF',
  primaryText: '#FDA4B5',
  primaryBg: '#371D27',
  primaryBorder: '#764051',

  successText: '#87D8AE',
  successBg: '#172D25',
  successBorder: '#335B48',

  warningText: '#FDB022',
  warningBg: '#2E1F08',
  warningBorder: '#5C3E0E',

  infoText: '#BDC7D6',
  infoBg: '#22262F',
  infoBorder: '#47505F',

  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: '#000000',
};

export type Typography = {
  display: TextStyle;
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  body: TextStyle;
  bodyStrong: TextStyle;
  caption: TextStyle;
  captionStrong: TextStyle;
  overline: TextStyle;
};

export function buildTypography(p: Palette): Typography {
  return {
    display: { fontFamily: font.bold, fontSize: 40, lineHeight: 46, letterSpacing: -0.8, color: p.ink },
    h1: { fontFamily: font.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: p.ink },
    h2: { fontFamily: font.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2, color: p.ink },
    h3: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: p.ink },
    body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: p.ink },
    bodyStrong: { fontFamily: font.semibold, fontSize: 16, lineHeight: 24, color: p.ink },
    caption: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: p.inkMuted },
    captionStrong: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: p.ink },
    overline: {
      fontFamily: font.semibold,
      fontSize: 13,
      lineHeight: 16,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: p.inkFaint,
    },
  };
}

export type Shadows = { floating: ViewStyle; card: ViewStyle };

export function buildShadows(p: Palette, dark: boolean): Shadows {
  return {
    floating: {
      shadowColor: p.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: dark ? 0.5 : 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    card: {
      shadowColor: p.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: dark ? 0 : 0.04,
      shadowRadius: 2,
      elevation: dark ? 0 : 1,
    },
  };
}

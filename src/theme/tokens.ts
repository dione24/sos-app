import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Système de design Nafalan — voir docs/design/DESIGN.md.
 * Une seule famille (DM Sans), une grille 4/8, le rouge réservé au SOS.
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

  /** Rouge d'alerte : uniquement SOS, appels d'urgence et erreurs. */
  sos: string;
  sosPressed: string;
  sosRing: string;
  dangerText: string;
  dangerBg: string;
  dangerBorder: string;

  /** Vert profond : actions normales, sélection, états positifs. */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primaryText: string;
  primaryBg: string;
  primaryBorder: string;

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
  bg: '#F2F4F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#E4E7EC',
  borderStrong: '#D0D5DD',
  ink: '#0F172A',
  inkMuted: '#475467',
  inkFaint: '#667085',
  onColor: '#FFFFFF',

  sos: '#C8102E',
  sosPressed: '#A50D25',
  sosRing: '#F8C9D0',
  dangerText: '#B42318',
  dangerBg: '#FEF3F2',
  dangerBorder: '#FECDCA',

  primary: '#0B6E4F',
  primaryPressed: '#09583F',
  onPrimary: '#FFFFFF',
  primaryText: '#0B6E4F',
  primaryBg: '#E6F4EE',
  primaryBorder: '#B7E1CF',

  warningText: '#B54708',
  warningBg: '#FFF6ED',
  warningBorder: '#FEDF89',

  infoText: '#175CD3',
  infoBg: '#EFF6FF',
  infoBorder: '#B2D4FF',

  overlay: 'rgba(15, 23, 42, 0.55)',
  shadow: '#0F172A',
};

export const darkPalette: Palette = {
  bg: '#0B1220',
  surface: '#141B2B',
  surfaceAlt: '#1B2335',
  border: '#27324A',
  borderStrong: '#344156',
  ink: '#F3F4F6',
  inkMuted: '#AAB4C3',
  inkFaint: '#8A94A6',
  onColor: '#FFFFFF',

  sos: '#C8102E',
  sosPressed: '#A50D25',
  sosRing: '#4A1A22',
  dangerText: '#FDA29B',
  dangerBg: '#2B1210',
  dangerBorder: '#5A2521',

  primary: '#3CCB9A',
  primaryPressed: '#2FB487',
  onPrimary: '#04281E',
  primaryText: '#6CE9B9',
  primaryBg: '#12352B',
  primaryBorder: '#1F5A47',

  warningText: '#FDB022',
  warningBg: '#2E1F08',
  warningBorder: '#5C3E0E',

  infoText: '#84CAFF',
  infoBg: '#102A4A',
  infoBorder: '#1E4A7A',

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

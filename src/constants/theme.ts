import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  // Warm daylight palette: calm by default, urgent only where action is needed.
  void: '#F7F6F2',
  surface: '#FFFFFF',
  raised: '#FFFFFF',
  raised2: '#F0EEE8',
  hairline: '#DEDAD1',
  sand: '#1E211D',
  sandMuted: '#5F655D',
  sandFaint: '#747A72',
  alert: '#FF5A3D',
  alertLight: '#B42318',
  alertDark: '#FFF0EC',
  amber: '#C56B00',
  amberLight: '#8A4B00',
  amberDark: '#FFF4D8',
  green: '#52B788',
  greenLight: '#176A45',
  greenDark: '#E7F6EE',
  blue: '#3568C8',
  blueDark: '#EDF3FF',
  black: '#151A16',
  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  round: 999,
} as const;

export const font = {
  display: 'DMSans_700Bold',
  displayMedium: 'DMSans_700Bold',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
  mono: 'SpaceGrotesk_500Medium',
} as const;

export const shadows = {
  soft: {
    shadowColor: '#2E332D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  } satisfies ViewStyle,
};

export const type = {
  hero: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -0.7,
    color: colors.sand,
  } satisfies TextStyle,
  title: {
    fontFamily: font.displayMedium,
    fontSize: 24,
    lineHeight: 30,
    color: colors.sand,
  } satisfies TextStyle,
  heading: {
    fontFamily: font.displayMedium,
    fontSize: 19,
    lineHeight: 24,
    color: colors.sand,
  } satisfies TextStyle,
  body: {
    fontFamily: font.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.sand,
  } satisfies TextStyle,
  small: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.sandMuted,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: font.mono,
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.sandMuted,
  } satisfies TextStyle,
} as const;

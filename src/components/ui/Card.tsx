import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export function Card({
  children,
  tone = 'neutral',
  padded = true,
  style,
}: PropsWithChildren<{ tone?: Tone; padded?: boolean; style?: StyleProp<ViewStyle> }>) {
  const s = useStyles();
  return <View style={[s.base, padded && s.padded, s[tone], style]}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  base: {
    borderRadius: t.radius.md,
    borderWidth: 1,
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
    ...t.shadows.card,
  },
  padded: { padding: t.spacing.md },
  neutral: {},
  primary: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primaryBorder },
  success: { backgroundColor: t.colors.successBg, borderColor: t.colors.successBorder },
  warning: { backgroundColor: t.colors.warningBg, borderColor: t.colors.warningBorder },
  danger: { backgroundColor: t.colors.dangerBg, borderColor: t.colors.dangerBorder },
  info: { backgroundColor: t.colors.infoBg, borderColor: t.colors.infoBorder },
}));

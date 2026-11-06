import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type { Tone } from '@/components/ui/Card';
import { makeStyles, useTheme } from '@/theme';

/** Couleur d'icône associée à une tonalité (à passer au composant Lucide). */
export function useToneColor(tone: Tone = 'neutral') {
  const { colors } = useTheme();
  return {
    neutral: colors.inkMuted,
    primary: colors.primaryText,
    warning: colors.warningText,
    danger: colors.dangerText,
    info: colors.infoText,
  }[tone];
}

export function IconTile({
  children,
  tone = 'neutral',
  size = 44,
  style,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const s = useStyles();
  return (
    <View style={[s.base, s[tone], { width: size, height: size, borderRadius: size >= 56 ? 16 : 12 }, style]}>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: { alignItems: 'center', justifyContent: 'center' },
  neutral: { backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.border },
  primary: { backgroundColor: t.colors.primaryBg },
  warning: { backgroundColor: t.colors.warningBg },
  danger: { backgroundColor: t.colors.dangerBg },
  info: { backgroundColor: t.colors.infoBg },
}));

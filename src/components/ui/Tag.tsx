import { Text, View } from 'react-native';

import type { Tone } from '@/components/ui/Card';
import { makeStyles } from '@/theme';

/** Pilule d'état (28 px). À utiliser avec parcimonie : une par carte au plus. */
export function Tag({ label, tone = 'neutral', dot = false }: { label: string; tone?: Tone; dot?: boolean }) {
  const s = useStyles();
  return (
    <View style={[s.base, s[tone]]}>
      {dot ? <View style={[s.dot, s[`${tone}Dot`]]} /> : null}
      <Text maxFontSizeMultiplier={1.3} style={[s.label, s[`${tone}Label`]]}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: 28,
    borderRadius: t.radius.full,
    paddingHorizontal: t.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  label: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, lineHeight: 16 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  neutral: { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border },
  neutralLabel: { color: t.colors.inkMuted },
  neutralDot: { backgroundColor: t.colors.inkFaint },
  primary: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primaryBorder },
  primaryLabel: { color: t.colors.primaryText },
  primaryDot: { backgroundColor: t.colors.primaryText },
  warning: { backgroundColor: t.colors.warningBg, borderColor: t.colors.warningBorder },
  warningLabel: { color: t.colors.warningText },
  warningDot: { backgroundColor: t.colors.warningText },
  danger: { backgroundColor: t.colors.dangerBg, borderColor: t.colors.dangerBorder },
  dangerLabel: { color: t.colors.dangerText },
  dangerDot: { backgroundColor: t.colors.dangerText },
  info: { backgroundColor: t.colors.infoBg, borderColor: t.colors.infoBorder },
  infoLabel: { color: t.colors.infoText },
  infoDot: { backgroundColor: t.colors.infoText },
}));

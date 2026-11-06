import type { ReactNode } from 'react';
import { Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

type ToggleRowProps = {
  title: string;
  subtitle?: string | undefined;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  leading?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Ligne « titre + interrupteur » dans une carte. */
export function ToggleRow({ title, subtitle, value, onValueChange, accessibilityLabel, leading, disabled, style }: ToggleRowProps) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[s.base, style]}>
      {leading}
      <View style={s.copy}>
        <Text maxFontSizeMultiplier={1.4} style={s.title}>{title}</Text>
        {subtitle ? <Text maxFontSizeMultiplier={1.5} style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={colors.onColor}
        ios_backgroundColor={colors.borderStrong}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  copy: { flex: 1, gap: 2 },
  title: { ...t.text.bodyStrong },
  subtitle: { ...t.text.caption },
}));

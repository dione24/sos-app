import type { ReactNode, Ref } from 'react';
import { ActivityIndicator, Pressable, Text, View, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

export type ButtonVariant = 'sos' | 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'lg' | 'md';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  /** `switch` pour un réglage à deux états (avec `checked`). */
  accessibilityRole?: AccessibilityRole;
  checked?: boolean;
  ref?: Ref<View>;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  disabled,
  loading,
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole = 'button',
  checked,
  ref,
  style,
}: ButtonProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const inactive = disabled || loading;
  const spinnerColor = variant === 'sos' ? colors.onColor : variant === 'primary' ? colors.onPrimary : colors.ink;

  return (
    <Pressable
      ref={ref}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading), ...(checked === undefined ? {} : { checked }) }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        size === 'md' && s.medium,
        s[variant],
        pressed && s[`${variant}Pressed`],
        inactive && s.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={spinnerColor} /> : icon ? <View style={s.icon}>{icon}</View> : null}
      <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={[s.label, size === 'md' && s.labelMedium, s[`${variant}Label`]]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Couleur d'icône cohérente avec le libellé d'un bouton. */
export function useButtonIconColor(variant: ButtonVariant = 'primary') {
  const { colors } = useTheme();
  if (variant === 'sos') return colors.onColor;
  if (variant === 'primary') return colors.onPrimary;
  return colors.ink;
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: t.hit.action,
    borderRadius: t.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  medium: { minHeight: t.hit.control, paddingVertical: t.spacing.xs },
  icon: { alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'DMSans_600SemiBold', fontSize: 17, lineHeight: 22, textAlign: 'center' },
  labelMedium: { fontSize: 15, lineHeight: 20 },
  sos: { backgroundColor: t.colors.sos },
  sosPressed: { backgroundColor: t.colors.sosPressed },
  sosLabel: { color: t.colors.onColor },
  primary: { backgroundColor: t.colors.primary },
  primaryPressed: { backgroundColor: t.colors.primaryPressed },
  primaryLabel: { color: t.colors.onPrimary },
  secondary: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.borderStrong },
  secondaryPressed: { backgroundColor: t.colors.surfaceAlt },
  secondaryLabel: { color: t.colors.ink },
  ghost: { backgroundColor: 'transparent' },
  ghostPressed: { backgroundColor: t.colors.surfaceAlt },
  ghostLabel: { color: t.colors.primaryText },
  disabled: { opacity: 0.45 },
}));

import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, font, radius, spacing, type } from '@/constants/theme';

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'alert' | 'amber' | 'outline' | 'soft' | 'green';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'alert',
  icon,
  disabled,
  loading,
  accessibilityHint,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'outline' ? colors.sand : colors.black} /> : icon}
      <Text maxFontSizeMultiplier={1.4} style={[styles.buttonLabel, styles[`label_${variant}`]]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'neutral',
  dot = false,
}: {
  label: string;
  tone?: 'neutral' | 'alert' | 'amber' | 'green' | 'blue';
  dot?: boolean;
}) {
  return (
    <View style={[styles.badge, styles[`badge_${tone}`]]}>
      {dot ? <View style={[styles.dot, styles[`dot_${tone}`]]} /> : null}
      <Text maxFontSizeMultiplier={1.4} style={[styles.badgeText, styles[`badgeText_${tone}`]]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, aside }: { title: string; aside?: string }) {
  const { fontScale } = useWindowDimensions();
  const useStackedLayout = fontScale >= 1.3;

  return (
    <View style={[styles.sectionRow, useStackedLayout && styles.sectionRowStacked]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={styles.sectionTitle}>{title}</Text>
      {aside ? <Text maxFontSizeMultiplier={1.4} style={styles.sectionAside}>{aside}</Text> : null}
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; hint?: string };

export function Field({ label, hint, multiline, ...props }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text maxFontSizeMultiplier={1.5} style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.5}
        placeholderTextColor={colors.sandFaint}
        selectionColor={colors.alert}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
        {...props}
      />
      {hint ? <Text maxFontSizeMultiplier={1.7} style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  button: {
    minHeight: 54,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  button_alert: { backgroundColor: colors.alert, borderColor: colors.alert },
  button_amber: { backgroundColor: colors.amber, borderColor: colors.amber },
  button_outline: { backgroundColor: colors.transparent, borderColor: colors.hairline },
  button_soft: { backgroundColor: colors.raised2, borderColor: colors.hairline },
  button_green: { backgroundColor: colors.green, borderColor: colors.green },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.987 }] },
  disabled: { opacity: 0.42 },
  buttonLabel: { fontFamily: font.displayMedium, fontSize: 16, color: colors.black },
  label_alert: { color: colors.black },
  label_amber: { color: colors.black },
  label_outline: { color: colors.sand },
  label_soft: { color: colors.sand },
  label_green: { color: colors.black },
  badge: {
    minHeight: 28,
    borderRadius: radius.round,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badge_neutral: { backgroundColor: colors.raised, borderColor: colors.hairline },
  badge_alert: { backgroundColor: colors.alertDark, borderColor: '#FFD2C9' },
  badge_amber: { backgroundColor: colors.amberDark, borderColor: '#F1D9A4' },
  badge_green: { backgroundColor: colors.greenDark, borderColor: '#BFE8D1' },
  badge_blue: { backgroundColor: colors.blueDark, borderColor: '#CFDDF6' },
  badgeText: { fontFamily: font.bodyMedium, fontSize: 11 },
  badgeText_neutral: { color: colors.sandMuted },
  badgeText_alert: { color: colors.alertLight },
  badgeText_amber: { color: colors.amberLight },
  badgeText_green: { color: colors.greenLight },
  badgeText_blue: { color: colors.blue },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dot_neutral: { backgroundColor: colors.sandMuted },
  dot_alert: { backgroundColor: colors.alertLight },
  dot_amber: { backgroundColor: colors.amber },
  dot_green: { backgroundColor: colors.green },
  dot_blue: { backgroundColor: colors.blue },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionRowStacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  sectionTitle: { ...type.heading },
  sectionAside: { ...type.small, color: colors.amber },
  fieldWrap: { gap: 7 },
  fieldLabel: { ...type.eyebrow, color: colors.sandMuted },
  input: {
    minHeight: 50,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.sand,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    fontFamily: font.body,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },
  fieldHint: { ...type.small, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.hairline },
});

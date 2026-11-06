import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

type FieldProps = TextInputProps & { label: string; hint?: string | undefined };

export function Field({ label, hint, multiline, editable = true, onFocus, onBlur, ...props }: FieldProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.wrap}>
      <Text maxFontSizeMultiplier={1.5} style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.5}
        placeholderTextColor={colors.inkFaint}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        multiline={multiline}
        editable={editable}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[s.input, multiline && s.multiline, focused && s.focused, !editable && s.readonly]}
        {...props}
      />
      {hint ? <Text maxFontSizeMultiplier={1.6} style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: 6 },
  label: { ...t.text.captionStrong },
  input: {
    minHeight: t.hit.action,
    borderRadius: t.radius.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    color: t.colors.ink,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.borderStrong,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  focused: { borderColor: t.colors.primary, borderWidth: 2, paddingHorizontal: t.spacing.md - 1, paddingVertical: t.spacing.sm - 1 },
  readonly: { backgroundColor: t.colors.surfaceAlt, color: t.colors.inkMuted },
  hint: { ...t.text.caption, color: t.colors.inkFaint },
}));

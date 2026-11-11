import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme';

type IconButtonProps = {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Bouton icône carré de 48 px, bordé, pour les actions d'en-tête. */
export function IconButton({ icon, onPress, accessibilityLabel, accessibilityHint, selected, disabled, style }: IconButtonProps) {
  const s = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [s.base, selected && s.selected, pressed && s.pressed, disabled && s.disabled, style]}
    >
      {icon}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    width: t.hit.control,
    height: t.hit.control,
    borderRadius: t.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  selected: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
}));

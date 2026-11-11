import ChevronRight from 'lucide-react-native/icons/chevron-right';
import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

type ListRowProps = {
  title: string;
  subtitle?: string | undefined;
  meta?: string | undefined;
  leading?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: (() => void) | undefined;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Sans carte : à utiliser dans un groupe (`ListGroup`). */
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Ligne de liste de 64 px minimum : tuile, titre, sous-titre, action à droite. */
export function ListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  chevron = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  inset = false,
  style,
}: ListRowProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const content = (
    <>
      {leading}
      <View style={s.copy}>
        <Text maxFontSizeMultiplier={1.4} style={s.title}>{title}</Text>
        {subtitle ? <Text maxFontSizeMultiplier={1.5} style={s.subtitle}>{subtitle}</Text> : null}
        {meta ? <Text maxFontSizeMultiplier={1.4} style={s.meta}>{meta}</Text> : null}
      </View>
      {trailing}
      {chevron ? <ChevronRight size={22} color={colors.inkFaint} /> : null}
    </>
  );

  if (!onPress) return <View style={[s.base, !inset && s.card, style]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [s.base, !inset && s.card, pressed && s.pressed, style]}
    >
      {content}
    </Pressable>
  );
}

/** Groupe de lignes séparées par un filet, dans une carte. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  return <View style={[s.group, style]}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  card: {
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    ...t.shadows.card,
  },
  group: {
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    overflow: 'hidden',
    ...t.shadows.card,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  copy: { flex: 1, gap: 2 },
  title: { ...t.text.bodyStrong },
  subtitle: { ...t.text.caption },
  meta: { ...t.text.caption, color: t.colors.inkFaint, marginTop: 2 },
}));

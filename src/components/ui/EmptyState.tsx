import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { IconTile } from '@/components/ui/IconTile';
import { makeStyles } from '@/theme';

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  const s = useStyles();
  return (
    <View style={s.base}>
      <IconTile size={56}>{icon}</IconTile>
      <Text maxFontSizeMultiplier={1.4} style={s.title}>{title}</Text>
      <Text maxFontSizeMultiplier={1.6} style={s.text}>{text}</Text>
      {action ? <View style={s.action}>{action}</View> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingVertical: t.spacing.xl,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  title: { ...t.text.h3, textAlign: 'center', marginTop: t.spacing.xs },
  text: { ...t.text.caption, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: t.spacing.sm },
}));

import { Text, View, useWindowDimensions } from 'react-native';

import { makeStyles } from '@/theme';

export function SectionHeader({ title, aside }: { title: string; aside?: string | undefined }) {
  const s = useStyles();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= 1.3 || (Boolean(aside) && title.length > 22);
  return (
    <View style={[s.row, stacked && s.stacked]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={s.title}>{title}</Text>
      {aside ? <Text maxFontSizeMultiplier={1.4} style={s.aside}>{aside}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: t.spacing.sm, marginTop: t.spacing.xs },
  stacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  title: { ...t.text.h3, flexShrink: 1 },
  aside: { ...t.text.caption, color: t.colors.inkFaint },
}));

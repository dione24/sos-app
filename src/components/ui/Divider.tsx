import { View } from 'react-native';

import { makeStyles } from '@/theme';

export function Divider({ inset = false }: { inset?: boolean }) {
  const s = useStyles();
  return <View style={[s.line, inset && s.inset]} />;
}

const useStyles = makeStyles((t) => ({
  line: { height: 1, backgroundColor: t.colors.border },
  inset: { marginHorizontal: t.spacing.md },
}));

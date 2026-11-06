import { View } from 'react-native';

import { makeStyles } from '@/theme';

/** Barre segmentée : une case par étape, les étapes faites en vert. */
export function StepProgress({ count, current, label }: { count: number; current: number; label?: string }) {
  const s = useStyles();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 1, max: count, now: current + 1 }} style={s.row}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[s.segment, index <= current && s.done]} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: t.colors.border },
  done: { backgroundColor: t.colors.primary },
}));

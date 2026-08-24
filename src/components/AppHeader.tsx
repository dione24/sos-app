import { useRouter } from 'expo-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, spacing, type } from '@/constants/theme';

type AppHeaderProps = {
  title: string;
  eyebrow?: string;
  back?: boolean;
  action?: React.ReactNode;
};

export function AppHeader({ title, eyebrow, back = false, action }: AppHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.leading}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Revenir en arrière"
            hitSlop={12}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <ArrowLeft size={22} color={colors.sand} />
          </Pressable>
        ) : (
          <View style={styles.mark}>
            <ShieldCheck size={18} color={colors.amber} strokeWidth={2.5} />
          </View>
        )}
        <View style={styles.copy}>
          {eyebrow ? <Text maxFontSizeMultiplier={1.35} style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={styles.title}>
            {title}
          </Text>
        </View>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  leading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copy: { flex: 1 },
  title: { ...type.title, fontSize: 23, lineHeight: 28 },
  eyebrow: { ...type.eyebrow, color: colors.amber, marginBottom: 1 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenDark,
    borderWidth: 1,
    borderColor: '#BFE8D1',
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
});

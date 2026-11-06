import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { makeStyles, useTheme } from '@/theme';

type AppHeaderProps = {
  title: string;
  subtitle?: string | undefined;
  back?: boolean;
  action?: ReactNode;
  /** Titre plus compact (écrans secondaires au titre long). */
  compact?: boolean;
};

export function AppHeader({ title, subtitle, back = false, action, compact = false }: AppHeaderProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <View style={s.wrap}>
      <View style={s.leading}>
        {back ? (
          <IconButton
            accessibilityLabel="Revenir en arrière"
            icon={<ArrowLeft size={24} color={colors.ink} />}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
          />
        ) : null}
        <View style={s.copy}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={compact || back ? s.titleCompact : s.title}>
            {title}
          </Text>
          {subtitle ? <Text maxFontSizeMultiplier={1.4} style={s.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {action ? <View style={s.action}>{action}</View> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm, paddingVertical: t.spacing.xxs },
  leading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  copy: { flex: 1, gap: 2 },
  title: { ...t.text.h1 },
  titleCompact: { ...t.text.h2 },
  subtitle: { ...t.text.caption },
  action: { flexShrink: 0 },
}));

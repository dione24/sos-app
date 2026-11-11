import ExternalLink from 'lucide-react-native/icons/external-link';
import { Pressable, Text, View } from 'react-native';

import { openSourceUrl } from '@/services/source-links';
import { makeStyles, useTheme } from '@/theme';

export function SourceLink({ label, url, showUrl = false }: { label: string; url: string; showUrl?: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label} : ${url}`}
      accessibilityHint="Ouvre le site source dans le navigateur. Une connexion est nécessaire."
      onPress={() => void openSourceUrl(url)}
      style={({ pressed }) => [s.link, pressed && s.pressed]}
    >
      <View style={s.copy}>
        <Text maxFontSizeMultiplier={1.6} style={s.label}>{label}</Text>
        {showUrl ? <Text maxFontSizeMultiplier={1.6} style={s.url}>{url}</Text> : null}
      </View>
      <ExternalLink size={16} color={colors.primaryText} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  link: { minHeight: t.hit.control, flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, paddingVertical: t.spacing.xs },
  pressed: { opacity: 0.7 },
  copy: { flex: 1, gap: 2 },
  label: { ...t.text.captionStrong, color: t.colors.primaryText, textDecorationLine: 'underline' },
  url: { ...t.text.caption, color: t.colors.primaryText },
}));

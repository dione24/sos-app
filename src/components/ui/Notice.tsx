import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Tone } from '@/components/ui/Card';
import { makeStyles } from '@/theme';

type NoticeProps = {
  icon?: ReactNode;
  title?: string | undefined;
  text: string;
  tone?: Tone;
  /** Contenu complémentaire (bouton, lien) sous le texte. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Bandeau d'information : icône, titre facultatif, texte lisible (14 px minimum). */
export function Notice({ icon, title, text, tone = 'neutral', children, style }: NoticeProps) {
  const s = useStyles();
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} style={[s.base, s[tone], style]}>
      <View style={s.row}>
        {icon ? <View style={s.icon}>{icon}</View> : null}
        <View style={s.copy}>
          {title ? <Text maxFontSizeMultiplier={1.4} style={[s.title, s[`${tone}Title`]]}>{title}</Text> : null}
          <Text maxFontSizeMultiplier={1.6} style={s.text}>{text}</Text>
        </View>
      </View>
      {children ? <View style={s.actions}>{children}</View> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: { borderRadius: t.radius.md, borderWidth: 1, padding: t.spacing.md, gap: t.spacing.sm },
  row: { flexDirection: 'row', gap: t.spacing.sm, alignItems: 'flex-start' },
  icon: { paddingTop: 2 },
  copy: { flex: 1, gap: 2 },
  title: { ...t.text.bodyStrong },
  text: { ...t.text.caption, color: t.colors.inkMuted },
  actions: { gap: t.spacing.xs },
  neutral: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
  neutralTitle: {},
  primary: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primaryBorder },
  primaryTitle: { color: t.colors.primaryText },
  warning: { backgroundColor: t.colors.warningBg, borderColor: t.colors.warningBorder },
  warningTitle: { color: t.colors.warningText },
  danger: { backgroundColor: t.colors.dangerBg, borderColor: t.colors.dangerBorder },
  dangerTitle: { color: t.colors.dangerText },
  info: { backgroundColor: t.colors.infoBg, borderColor: t.colors.infoBorder },
  infoTitle: { color: t.colors.infoText },
}));

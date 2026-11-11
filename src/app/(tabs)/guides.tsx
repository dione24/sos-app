import { useRouter } from 'expo-router';
import BookCheck from 'lucide-react-native/icons/book-check';
import Volume2 from 'lucide-react-native/icons/volume-2';
import { Text } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { GuideIcon } from '@/components/GuideIcon';
import { Screen } from '@/components/Screen';
import { IconTile, ListRow, Notice, SectionHeader } from '@/components/ui';
import { FIRST_AID_GUIDES } from '@/data';
import { useI18n } from '@/i18n/use-i18n';
import { makeStyles, useTheme } from '@/theme';

export default function GuidesScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Screen clearFab>
      <AppHeader title={t('guides_title')} subtitle={`${t('guides_offline_title')} · ${t('guides_offline_text')}`} />

      <SectionHeader title={t('guides_pick')} aside={t('guides_audio_hint')} />
      {FIRST_AID_GUIDES.map((guide) => (
        <ListRow
          key={guide.id}
          title={guide.title}
          subtitle={guide.summary}
          meta={`${guide.steps.length} ${t('guides_steps').toLowerCase()} · ${t('guides_audio_hint')}`}
          leading={<IconTile tone="primary" size={52}><GuideIcon id={guide.id} color={colors.primaryText} size={28} /></IconTile>}
          chevron
          accessibilityLabel={`${guide.title}, ${guide.steps.length} ${t('guides_steps')}`}
          onPress={() => router.push({ pathname: '/guide/[id]', params: { id: guide.id } })}
        />
      ))}

      <Notice icon={<Volume2 size={20} color={colors.inkMuted} />} title={t('guides_review_title')} text={t('guides_review_text')} />
      <Notice icon={<BookCheck size={20} color={colors.inkMuted} />} text={t('guides_disclaimer')} />
      <Text maxFontSizeMultiplier={1.6} style={s.footnote}>{t('guides_sources')}</Text>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  footnote: { ...t.text.caption, color: t.colors.inkFaint, textAlign: 'center' },
}));

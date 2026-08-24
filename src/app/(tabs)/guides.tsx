import { useRouter } from 'expo-router';
import { ArrowRight, Download, Volume2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { GuideIcon } from '@/components/GuideIcon';
import { Screen } from '@/components/Screen';
import { Badge, Card } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { FIRST_AID_GUIDES } from '@/data';
import { useI18n } from '@/i18n/use-i18n';

const toneColors = {
  alert: colors.alert,
  amber: colors.amber,
  green: colors.green,
  blue: colors.blue,
};

export default function GuidesScreen() {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;
  const { t } = useI18n();

  return (
    <Screen clearFab>
      <AppHeader title={t('guides_title')} eyebrow={t('guides_eyebrow')} />
      <View style={[styles.titleRow, largeText && styles.titleRowLarge]}>
        <Text maxFontSizeMultiplier={1.4} style={styles.title}>{t('guides_pick')}</Text>
        <View style={styles.audioLabel}>
          <Volume2 size={13} color={colors.sandMuted} />
          <Text maxFontSizeMultiplier={1.4} style={styles.audioText}>{t('guides_audio_hint')}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {FIRST_AID_GUIDES.map((guide) => {
          const tone = toneColors[guide.tone];
          return (
            <Pressable
              key={guide.id}
              accessibilityRole="button"
              accessibilityLabel={`${guide.title}, ${guide.steps.length} ${t('guides_steps')}`}
              onPress={() => router.push({ pathname: '/guide/[id]', params: { id: guide.id } })}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[styles.icon, { backgroundColor: `${tone}1A`, borderColor: `${tone}55` }]}>
                <GuideIcon id={guide.id} color={tone} />
              </View>
              <View style={styles.copy}>
                <Text maxFontSizeMultiplier={1.5} style={styles.name}>{guide.title}</Text>
                <Text maxFontSizeMultiplier={1.7} style={styles.summary}>{guide.summary}</Text>
                <Text maxFontSizeMultiplier={1.4} style={styles.meta}>
                  {guide.steps.length} {t('guides_steps')} · FR
                </Text>
              </View>
              <ArrowRight size={19} color={colors.sandFaint} />
            </Pressable>
          );
        })}
      </View>

      <Card style={[styles.offlineCard, largeText && styles.offlineCardLarge]}>
        <View style={styles.offlineIcon}>
          <Download size={21} color={colors.green} />
        </View>
        <View style={styles.offlineCopy}>
          <Text maxFontSizeMultiplier={1.5} style={styles.offlineTitle}>{t('guides_offline_title')}</Text>
          <Text maxFontSizeMultiplier={1.7} style={styles.offlineText}>{t('guides_offline_text')}</Text>
        </View>
        <Badge label={t('guides_local')} tone="green" />
      </Card>

      <Card style={styles.reviewCard}>
        <Text maxFontSizeMultiplier={1.5} style={styles.reviewTitle}>{t('guides_review_title')}</Text>
        <Text maxFontSizeMultiplier={1.7} style={styles.reviewText}>{t('guides_review_text')}</Text>
        <Badge label={t('guides_sources')} tone="amber" />
      </Card>

      <Text maxFontSizeMultiplier={1.7} style={styles.disclaimer}>{t('guides_disclaimer')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  offlineCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offlineCardLarge: { flexDirection: 'column', alignItems: 'stretch' },
  offlineIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.greenDark,
  },
  offlineCopy: { flex: 1 },
  offlineTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  offlineText: { ...type.small, fontSize: 11, marginTop: 2 },
  reviewCard: { gap: spacing.xs, borderColor: '#F1D9A4' },
  reviewTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.amberLight },
  reviewText: { ...type.small, fontSize: 11, lineHeight: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  titleRowLarge: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.xs },
  title: { ...type.heading },
  audioLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  audioText: { ...type.small, fontSize: 11 },
  list: { gap: spacing.sm },
  item: {
    minHeight: 106,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: { flex: 1, gap: 3 },
  name: { fontFamily: font.bodyBold, fontSize: 15, color: colors.sand },
  summary: { ...type.small, fontSize: 11, lineHeight: 15 },
  meta: { ...type.eyebrow, color: colors.amber, fontSize: 11, marginTop: 2 },
  disclaimer: { ...type.small, fontSize: 11, lineHeight: 16, textAlign: 'center', color: colors.sandFaint, paddingHorizontal: spacing.md },
});

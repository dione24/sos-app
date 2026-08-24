import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Pause, PhoneCall, Play, Volume2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { GuideIcon } from '@/components/GuideIcon';
import { Screen } from '@/components/Screen';
import { Badge, Button, Card } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { getGuide } from '@/data';
import { useI18n } from '@/i18n/use-i18n';
import { resolveGuideAudio } from '@/lib/guide-audio';
import { confirmCall } from '@/services/phone';

const GUIDE_AWAKE_TAG = 'first-aid-guidance';

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [guided, setGuided] = useState(false);
  const guide = useMemo(() => getGuide(id), [id]);
  const step = guide?.steps[index];

  const contentLanguage = 'fr' as const;
  const stepText = step?.fr ?? '';
  const title = guide?.title ?? '';
  // Memoised: an unstable reference here would restart playback on every render.
  const audio = useMemo(
    () => (guide && step ? resolveGuideAudio(contentLanguage, guide.id, step.id) : null),
    [contentLanguage, guide, step],
  );
  // `null` keeps the player mounted with no media until a narration file is registered.
  const player = useAudioPlayer(audio?.source ?? null);
  // Playback position is read through a ref so status updates never re-render the screen.
  const finishedRef = useRef(false);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  }, []);

  useEffect(() => {
    finishedRef.current = false;
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      finishedRef.current = true;
      setGuided(false);
    });
    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (!guided) return;
    void activateKeepAwakeAsync(GUIDE_AWAKE_TAG);
    // Rewind only after a completed step; play() alone keeps start latency minimal.
    if (finishedRef.current) {
      finishedRef.current = false;
      void player.seekTo(0).catch(() => undefined);
    }
    try {
      // Typed void, but the native call rejects asynchronously when the player was
      // released mid-navigation. Swallow it so the UI never claims to be playing.
      const started: unknown = player.play();
      if (started instanceof Promise) started.catch(() => setGuided(false));
    } catch {
      setGuided(false);
    }
    return () => {
      try {
        player.pause();
      } catch {
        // Player may already be released when the screen unmounts.
      }
      void deactivateKeepAwake(GUIDE_AWAKE_TAG);
    };
  }, [guided, player]);

  if (!guide || !step) {
    return (
      <Screen>
        <AppHeader title={t('guide_missing')} back />
        <Button label={t('guide_back')} onPress={() => router.replace('/guides')} variant="outline" />
      </Screen>
    );
  }

  const isLast = index === guide.steps.length - 1;

  function next() {
    if (isLast) {
      setGuided(false);
      router.back();
    } else {
      setIndex((value) => value + 1);
    }
  }

  function toggleGuided() {
    if (!audio) return;
    setGuided((value) => !value);
  }

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <View style={styles.navRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('guide_prev')}
              disabled={index === 0}
              onPress={() => setIndex((value) => Math.max(0, value - 1))}
              style={[styles.previous, index === 0 && styles.disabled]}
            >
              <ChevronLeft size={25} color={colors.sand} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLast ? t('guide_done') : t('guide_next')}
              onPress={next}
              style={styles.next}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.nextText}>
                {isLast ? t('guide_done') : t('guide_next')}
              </Text>
              <ChevronRight size={23} color={colors.black} />
            </Pressable>
          </View>
        </View>
      }
    >
      <AppHeader
        title={title}
        eyebrow={`${t('guide_step')} ${index + 1} ${t('guide_of')} ${guide.steps.length}`}
        back
      />

      <View style={styles.progress}>
        {guide.steps.map((item, itemIndex) => (
          <View key={item.id} style={[styles.progressSegment, itemIndex <= index && styles.progressDone]} />
        ))}
      </View>

      <View style={styles.audioBadge}>
        <Badge label={audio ? t('guide_voice_ready') : t('guide_voice_pending')} tone={audio ? 'green' : 'amber'} dot />
      </View>

      <View style={styles.visual}>
        <View style={styles.visualHalo} />
        <GuideIcon id={guide.id} color={colors.alertLight} size={66} />
        <Text maxFontSizeMultiplier={1.2} style={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</Text>
      </View>

      <Card style={styles.instruction}>
        <Text maxFontSizeMultiplier={1.45} style={styles.instructionLabel}>{t('guide_do_now')}</Text>
        <Text maxFontSizeMultiplier={1.55} style={styles.instructionText}>{stepText}</Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !audio }}
        accessibilityLabel={guided ? t('guide_playing') : t('guide_play')}
        disabled={!audio}
        onPress={toggleGuided}
        style={[styles.audio, guided && styles.audioOn, !audio && styles.audioMissing]}
      >
        {guided ? <Pause size={22} color={colors.black} /> : <Play size={22} color={audio ? colors.green : colors.sandFaint} />}
        <View style={styles.audioCopy}>
          <Text maxFontSizeMultiplier={1.4} style={[styles.audioTitle, guided && styles.audioTitleOn, !audio && styles.audioTitleMissing]}>
            {audio ? (guided ? t('guide_playing') : t('guide_play')) : t('guide_audio_missing')}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={[styles.audioSub, guided && styles.audioSubOn]}>
            {audio ? (guided ? t('guide_pause') : t('guide_audio_human')) : t('guide_dual')}
          </Text>
        </View>
        <Volume2 size={19} color={guided ? colors.black : colors.sandMuted} />
      </Pressable>

      {guide.emergencyNumber ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('guide_call')} ${guide.emergencyNumber}`}
          onPress={() => confirmCall(guide.emergencyNumber!, 'Protection Civile')}
          style={styles.call}
        >
          <PhoneCall size={18} color={colors.amber} />
          <Text maxFontSizeMultiplier={1.4} style={styles.callText}>
            {t('guide_call')} {guide.emergencyNumber}
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 5 },
  progressSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.hairline },
  progressDone: { backgroundColor: colors.alert },
  audioBadge: { alignItems: 'flex-start' },
  visual: {
    minHeight: 158,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  visualHalo: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.alertDark, opacity: 0.5 },
  stepNumber: { position: 'absolute', right: spacing.md, bottom: spacing.sm, fontFamily: font.display, fontSize: 34, color: colors.hairline },
  instruction: { gap: spacing.sm },
  instructionLabel: { ...type.eyebrow, color: colors.alertLight },
  instructionText: { fontFamily: font.bodyMedium, fontSize: 20, lineHeight: 29, color: colors.sand },
  audio: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.raised,
  },
  audioOn: { backgroundColor: colors.green, borderColor: colors.green },
  audioMissing: { opacity: 0.92, borderColor: colors.amberDark },
  audioCopy: { flex: 1 },
  audioTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  audioTitleOn: { color: colors.black },
  audioTitleMissing: { color: colors.amberLight },
  audioSub: { ...type.small, fontSize: 11 },
  audioSubOn: { color: colors.greenLight },
  call: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 42 },
  callText: { fontFamily: font.bodyBold, color: colors.amber, fontSize: 13 },
  footer: { gap: spacing.sm },
  navRow: { flexDirection: 'row', gap: spacing.sm },
  previous: {
    width: 58,
    minHeight: 56,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  next: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.alert,
  },
  nextText: { fontFamily: font.displayMedium, fontSize: 17, color: colors.black },
  disabled: { opacity: 0.35 },
});

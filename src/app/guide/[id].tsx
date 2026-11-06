import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Pause, PhoneCall, Play, Volume2, VolumeX } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { GuideIcon } from '@/components/GuideIcon';
import { Screen } from '@/components/Screen';
import { Button, Card, IconButton, StepProgress } from '@/components/ui';
import { getGuide } from '@/data';
import { useI18n } from '@/i18n/use-i18n';
import { resolveGuideAudio } from '@/lib/guide-audio';
import { confirmCall } from '@/services/phone';
import { makeStyles, useTheme } from '@/theme';

const GUIDE_AWAKE_TAG = 'first-aid-guidance';

export default function GuideDetailScreen() {
  const s = useStyles();
  const { colors } = useTheme();
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
  // Mémoïsé : une référence instable relancerait la lecture à chaque rendu.
  const audio = useMemo(
    () => (guide && step ? resolveGuideAudio(contentLanguage, guide.id, step.id) : null),
    [contentLanguage, guide, step],
  );
  // `null` garde le lecteur monté sans média tant qu'aucun fichier n'est enregistré.
  const player = useAudioPlayer(audio?.source ?? null);
  // La position de lecture passe par une ref pour ne jamais re-rendre l'écran.
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
    // Rembobiner seulement après une étape terminée ; play() seul garde la latence minimale.
    if (finishedRef.current) {
      finishedRef.current = false;
      void player.seekTo(0).catch(() => undefined);
    }
    try {
      // Typé void, mais l'appel natif rejette de façon asynchrone si le lecteur a été
      // libéré pendant une navigation. On l'avale pour ne jamais afficher « en lecture » à tort.
      const started: unknown = player.play();
      if (started instanceof Promise) started.catch(() => setGuided(false));
    } catch {
      setGuided(false);
    }
    return () => {
      try {
        player.pause();
      } catch {
        // Le lecteur peut déjà être libéré au démontage de l'écran.
      }
      void deactivateKeepAwake(GUIDE_AWAKE_TAG);
    };
  }, [guided, player]);

  if (!guide || !step) {
    return (
      <Screen>
        <AppHeader title={t('guide_missing')} back />
        <Button label={t('guide_back')} onPress={() => router.replace('/guides')} variant="secondary" />
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
        <View style={s.navRow}>
          <IconButton
            accessibilityLabel={t('guide_prev')}
            disabled={index === 0}
            icon={<ChevronLeft size={26} color={colors.ink} />}
            onPress={() => setIndex((value) => Math.max(0, value - 1))}
            style={s.previous}
          />
          <Button
            label={isLast ? t('guide_done') : t('guide_next')}
            onPress={next}
            icon={isLast ? undefined : <ChevronRight size={22} color={colors.onPrimary} />}
            style={s.next}
          />
        </View>
      }
    >
      <AppHeader title={title} subtitle={`${t('guide_step')} ${index + 1} ${t('guide_of')} ${guide.steps.length}`} back />
      <StepProgress count={guide.steps.length} current={index} label={`${t('guide_step')} ${index + 1} ${t('guide_of')} ${guide.steps.length}`} />

      <Card style={s.instruction}>
        <View style={s.instructionTop}>
          <View style={s.stepBadge}>
            <GuideIcon id={guide.id} color={colors.primaryText} size={24} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={s.instructionLabel}>{t('guide_do_now')}</Text>
          <Text maxFontSizeMultiplier={1.2} style={s.stepNumber}>{index + 1}/{guide.steps.length}</Text>
        </View>
        <Text maxFontSizeMultiplier={1.5} style={s.instructionText}>{stepText}</Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !audio }}
        accessibilityLabel={guided ? t('guide_playing') : t('guide_play')}
        disabled={!audio}
        onPress={toggleGuided}
        style={({ pressed }) => [s.audio, guided && s.audioOn, !audio && s.audioMissing, pressed && audio && s.audioPressed]}
      >
        <View style={[s.audioIcon, guided && s.audioIconOn]}>
          {guided ? <Pause size={24} color={colors.onPrimary} fill={colors.onPrimary} /> : audio ? <Play size={24} color={colors.onPrimary} fill={colors.onPrimary} /> : <VolumeX size={24} color={colors.inkFaint} />}
        </View>
        <View style={s.audioCopy}>
          <Text maxFontSizeMultiplier={1.4} style={[s.audioTitle, !audio && s.audioTitleMissing]}>
            {audio ? (guided ? t('guide_playing') : t('guide_play')) : t('guide_audio_missing')}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={s.audioSub}>{audio ? (guided ? t('guide_pause') : t('guide_audio_human')) : t('guide_dual')}</Text>
        </View>
        {audio ? <Volume2 size={22} color={guided ? colors.primaryText : colors.inkFaint} /> : null}
      </Pressable>

      {guide.emergencyNumber ? (
        <Button
          label={`${t('guide_call')} ${guide.emergencyNumber}`}
          onPress={() => confirmCall(guide.emergencyNumber!, 'Protection Civile')}
          variant="secondary"
          icon={<PhoneCall size={22} color={colors.dangerText} />}
        />
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  instruction: { gap: t.spacing.md, padding: t.spacing.lg },
  instructionTop: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  stepBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primaryBg },
  instructionLabel: { ...t.text.overline, flex: 1, color: t.colors.primaryText },
  stepNumber: { ...t.text.captionStrong, color: t.colors.inkFaint },
  instructionText: { fontFamily: 'DMSans_500Medium', fontSize: 22, lineHeight: 32, color: t.colors.ink },
  audio: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.sm,
    paddingRight: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  audioOn: { borderColor: t.colors.primaryBorder, backgroundColor: t.colors.primaryBg },
  audioMissing: { backgroundColor: t.colors.surfaceAlt },
  audioPressed: { opacity: 0.8 },
  audioIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primary },
  audioIconOn: { backgroundColor: t.colors.primaryPressed },
  audioCopy: { flex: 1, gap: 2 },
  audioTitle: { ...t.text.bodyStrong },
  audioTitleMissing: { color: t.colors.inkMuted },
  audioSub: { ...t.text.caption },
  navRow: { flexDirection: 'row', gap: t.spacing.sm },
  previous: { width: t.hit.action, height: t.hit.action },
  next: { flex: 1 },
}));

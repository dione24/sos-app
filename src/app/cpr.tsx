import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Hand, HeartPulse, Pause, PhoneCall, Play, RotateCcw, Volume2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { CallConfirm } from '@/components/CallConfirm';
import { Screen } from '@/components/Screen';
import { Button, Card } from '@/components/ui';
import { colors, font, radius, spacing, type } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { calculateNextBeatAt, canRestartCpr, CPR_BPM, CPR_RESTART_GUARD_MS } from '@/lib/cpr';
import { openPhoneDialer } from '@/services/phone';

const CPR_AWAKE_TAG = 'cpr-metronome';
const BEEP_DATA_URI =
  'data:audio/wav;base64,UklGRuwAAABXQVZFZm10IBAAAAABAAEAoA8AAEAfAAACABAAZGF0YcgAAAAAAH4zgB/S4BLOAADkMOUdbeKs0AAASi5KHAnkRdMAALArrhqk5d/VAAAXKRMZQOd52AAAfSZ3F9voEtsAAOMj3BV36qzdAABJIUAUEuxG4AAAsB6lEq3t4OIAABYcCRFJ73nlAAB8GW4P5PAT6AAA4xbSDYDyreoAAEkUNwwb9EftAACvEZwKt/Xg7wAAFQ8ACVL3evIAAHwMZQfu+BT1AADiCckFifqu9wAASAcuBCX8R/oAAK4EkgLA/eH8AAAVAvcAW/97/w==';

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function CprScreen() {
  const reducedMotion = useReducedMotion();
  const player = useAudioPlayer(BEEP_DATA_URI, { keepAudioSessionActive: true });
  const scale = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);
  const nextBeatRef = useRef(0);
  const restartAvailableAtRef = useRef(0);
  const soundRef = useRef(true);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [compressions, setCompressions] = useState(0);
  const [sound, setSound] = useState(true);
  const [showCallConfirm, setShowCallConfirm] = useState(false);

  useEffect(() => {
    if (!running) return;
    void activateKeepAwakeAsync(CPR_AWAKE_TAG);
    const uiTimer = setInterval(() => setElapsed(performance.now() - startRef.current), 250);

    function beat() {
      const now = performance.now();
      // Sound first: the beat is what the rescuer compresses to, so nothing that
      // can block the JS thread should be queued ahead of it.
      if (soundRef.current) {
        // Both calls queue on the native main thread in order, so the rewind is
        // applied before play() runs. Awaiting the seek instead would add a JS
        // round-trip to every beat and make the tempo drift under load.
        void player.seekTo(0).catch(() => undefined);
        player.play();
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCompressions((value) => value + 1);
      scale.setValue(1);
      if (!reducedMotion) {
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.075, duration: 85, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 260, useNativeDriver: true }),
        ]).start();
      }

      // Scheduling against the absolute target prevents setTimeout drift over long sessions.
      nextBeatRef.current = calculateNextBeatAt(nextBeatRef.current, now);
      // Re-read the clock: measuring the delay from `now` would add this beat's
      // own processing time to the interval, and that time varies per beat.
      const delay = Math.max(0, nextBeatRef.current - performance.now());
      timeoutRef.current = setTimeout(beat, delay);
    }

    startRef.current = performance.now();
    nextBeatRef.current = startRef.current;
    beat();

    return () => {
      clearInterval(uiTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      void deactivateKeepAwake(CPR_AWAKE_TAG);
    };
  }, [player, reducedMotion, running, scale]);

  function start() {
    // The stop control is replaced by the start control while the finger is
    // still lifting after a long press. Ignore that trailing release so the
    // metronome cannot restart accidentally.
    if (!canRestartCpr(performance.now(), restartAvailableAtRef.current)) return;
    setElapsed(0);
    setCompressions(0);
    setRunning(true);
  }

  function stop() {
    restartAvailableAtRef.current = performance.now() + CPR_RESTART_GUARD_MS;
    setRunning(false);
    player.pause();
  }

  function reset() {
    stop();
    setElapsed(0);
    setCompressions(0);
  }

  const primaryControl = !running ? (
    <Pressable accessibilityRole="button" accessibilityLabel="Démarrer le métronome RCP" onPress={start} style={styles.start}>
      <Play size={25} fill={colors.black} color={colors.black} />
      <Text maxFontSizeMultiplier={1.3} style={styles.startText}>Démarrer les compressions</Text>
    </Pressable>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Maintenir pour arrêter le métronome"
      delayLongPress={900}
      onLongPress={stop}
      style={styles.stop}
    >
      <Pause size={24} color={colors.sand} />
      <View>
        <Text maxFontSizeMultiplier={1.3} style={styles.stopText}>Maintenir pour arrêter</Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.stopSub}>Évite un arrêt accidentel</Text>
      </View>
    </Pressable>
  );

  return (
    <>
    <Screen scroll contentStyle={styles.scrollScreen} footer={primaryControl}>
      <AppHeader title="Métronome RCP" eyebrow="Adulte · 110 BPM" back />

      <Card style={styles.safety}>
        <HeartPulse size={20} color={colors.alert} />
        <Text maxFontSizeMultiplier={1.35} style={styles.safetyText}>
          Personne inconsciente et qui ne respire pas normalement : appelez le 122 puis commencez les compressions.
        </Text>
      </Card>
      <Button
        label="Appeler le 122"
        onPress={() => setShowCallConfirm(true)}
        variant="amber"
        icon={<PhoneCall size={20} color={colors.black} />}
        accessibilityHint="Une confirmation sera demandée avant l'appel"
      />

      <View style={styles.center}>
        <Animated.View style={[styles.ringOuter, { transform: [{ scale }] }]}>
          <View style={[styles.ring, running && styles.ringActive]}>
            <Text maxFontSizeMultiplier={1} style={styles.bpm}>{CPR_BPM}</Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.bpmLabel}>BATTEMENTS / MIN</Text>
            <View style={styles.stateRow}>
              <View style={[styles.stateDot, running && styles.stateDotOn]} />
              <Text maxFontSizeMultiplier={1.25} style={styles.state}>{running ? 'EN COURS' : 'PRÊT'}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text maxFontSizeMultiplier={1.2} style={styles.statValue}>{formatDuration(elapsed)}</Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.statLabel}>DURÉE</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text maxFontSizeMultiplier={1.2} style={styles.statValue}>{compressions}</Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.statLabel}>COMPRESSIONS</Text>
          </View>
        </View>
      </View>

      <View style={styles.technique}>
        <View style={styles.techIcon}><Hand size={23} color={colors.amber} /></View>
        <View style={styles.techCopy}>
          <Text maxFontSizeMultiplier={1.25} style={styles.techTitle}>Deux mains · centre de la poitrine</Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.techSub}>Bras tendus · profondeur 5 à 6 cm · laisser remonter</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable accessibilityRole="switch" accessibilityLabel="Son du métronome" accessibilityState={{ checked: sound }} onPress={() => setSound((value) => { soundRef.current = !value; return !value; })} style={styles.smallControl}>
          <Volume2 size={21} color={sound ? colors.green : colors.sandFaint} />
          <Text maxFontSizeMultiplier={1.35} style={styles.smallLabel}>{sound ? 'Son actif' : 'Son coupé'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Remettre le métronome à zéro" onPress={reset} style={styles.smallControl}>
          <RotateCcw size={20} color={colors.sandMuted} />
          <Text maxFontSizeMultiplier={1.35} style={styles.smallLabel}>Remettre à zéro</Text>
        </Pressable>
      </View>

    </Screen>
    {showCallConfirm ? (
      <CallConfirm
        number="122"
        service="Protection Civile"
        onClose={() => setShowCallConfirm(false)}
        onCall={() => {
          setShowCallConfirm(false);
          void openPhoneDialer('122');
        }}
      />
    ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scrollScreen: { paddingBottom: spacing.xxl },
  safety: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  safetyText: { ...type.small, flex: 1, color: colors.sand, fontSize: 12, lineHeight: 17 },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  ringOuter: { width: 180, height: 180, borderRadius: 90, padding: 8, borderWidth: 1, borderColor: colors.alertDark },
  ring: {
    flex: 1,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.hairline,
  },
  ringActive: { borderColor: colors.alert, backgroundColor: colors.alertDark },
  bpm: { fontFamily: font.display, fontSize: 64, lineHeight: 68, color: colors.sand },
  bpmLabel: { ...type.eyebrow, fontSize: 11 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  stateDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sandFaint },
  stateDotOn: { backgroundColor: colors.green },
  state: { ...type.eyebrow, fontSize: 11, color: colors.sand },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { width: 130, alignItems: 'center' },
  statDivider: { width: 1, height: 42, backgroundColor: colors.hairline },
  statValue: { fontFamily: font.displayMedium, fontSize: 26, color: colors.sand },
  statLabel: { ...type.eyebrow, fontSize: 11, marginTop: 3 },
  technique: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  techIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amberDark },
  techCopy: { flex: 1 },
  techTitle: { fontFamily: font.bodyBold, fontSize: 13, color: colors.sand },
  techSub: { ...type.small, fontSize: 11, marginTop: 2 },
  controls: { flexDirection: 'row', gap: spacing.sm },
  smallControl: { flex: 1, minHeight: 48, flexDirection: 'row', gap: spacing.xs, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.hairline },
  smallLabel: { fontFamily: font.bodyMedium, fontSize: 11, color: colors.sandMuted },
  start: { minHeight: 60, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.alert },
  startText: { fontFamily: font.displayMedium, fontSize: 17, color: colors.black },
  stop: { minHeight: 60, borderRadius: radius.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.alert },
  stopText: { fontFamily: font.displayMedium, fontSize: 15, color: colors.sand },
  stopSub: { ...type.small, fontSize: 11, textAlign: 'center' },
});

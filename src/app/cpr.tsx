import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Hand, HeartPulse, Pause, PhoneCall, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { CallConfirm } from '@/components/CallConfirm';
import { Screen } from '@/components/Screen';
import { Button, IconTile, Notice } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { calculateNextBeatAt, canRestartCpr, CPR_BPM, CPR_RESTART_GUARD_MS } from '@/lib/cpr';
import { openPhoneDialer } from '@/services/phone';
import { makeStyles, useTheme } from '@/theme';

const CPR_AWAKE_TAG = 'cpr-metronome';
const BEEP_DATA_URI =
  'data:audio/wav;base64,UklGRuwAAABXQVZFZm10IBAAAAABAAEAoA8AAEAfAAACABAAZGF0YcgAAAAAAH4zgB/S4BLOAADkMOUdbeKs0AAASi5KHAnkRdMAALArrhqk5d/VAAAXKRMZQOd52AAAfSZ3F9voEtsAAOMj3BV36qzdAABJIUAUEuxG4AAAsB6lEq3t4OIAABYcCRFJ73nlAAB8GW4P5PAT6AAA4xbSDYDyreoAAEkUNwwb9EftAACvEZwKt/Xg7wAAFQ8ACVL3evIAAHwMZQfu+BT1AADiCckFifqu9wAASAcuBCX8R/oAAK4EkgLA/eH8AAAVAvcAW/97/w==';

function formatDuration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function CprScreen() {
  const s = useStyles();
  const { colors } = useTheme();
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
      // Le son d'abord : c'est le repère de compression, rien ne doit le précéder.
      if (soundRef.current) {
        // Les deux appels s'enchaînent sur le thread natif : le rembobinage précède play().
        // Attendre le seek ajouterait un aller-retour JS à chaque battement (dérive sous charge).
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

      // Planifier sur la cible absolue évite la dérive de setTimeout sur une longue session.
      nextBeatRef.current = calculateNextBeatAt(nextBeatRef.current, now);
      // Relire l'horloge : mesurer depuis `now` ajouterait le temps de traitement du battement.
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
    // Le contrôle d'arrêt est remplacé par celui de départ pendant que le doigt se relève
    // après un appui long : on ignore ce relâchement pour éviter un redémarrage accidentel.
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
    <Button label="Démarrer les compressions" onPress={start} variant="sos" accessibilityLabel="Démarrer le métronome RCP" icon={<Play size={24} color={colors.onColor} fill={colors.onColor} />} />
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Maintenir pour arrêter le métronome"
      delayLongPress={900}
      onLongPress={stop}
      style={({ pressed }) => [s.stop, pressed && s.stopPressed]}
    >
      <Pause size={24} color={colors.ink} />
      <View>
        <Text maxFontSizeMultiplier={1.3} style={s.stopText}>Maintenir pour arrêter</Text>
        <Text maxFontSizeMultiplier={1.4} style={s.stopSub}>Évite un arrêt accidentel</Text>
      </View>
    </Pressable>
  );

  return (
    <>
      <Screen scroll footer={primaryControl}>
        <AppHeader title="Métronome RCP" subtitle="Adulte · 110 battements par minute" back />

        <Notice
          icon={<HeartPulse size={20} color={colors.dangerText} />}
          tone="danger"
          text="Personne inconsciente et qui ne respire pas normalement : appelez le 122 puis commencez les compressions."
        >
          <Button label="Appeler le 122" size="md" variant="secondary" onPress={() => setShowCallConfirm(true)} icon={<PhoneCall size={20} color={colors.dangerText} />} accessibilityHint="Une confirmation sera demandée avant l'appel" />
        </Notice>

        <View style={s.center}>
          <Animated.View style={[s.ringOuter, running && s.ringOuterActive, { transform: [{ scale }] }]}>
            <View style={[s.ring, running && s.ringActive]}>
              <Text maxFontSizeMultiplier={1} style={s.bpm}>{CPR_BPM}</Text>
              <Text maxFontSizeMultiplier={1.2} style={s.bpmLabel}>battements / min</Text>
              <View style={[s.state, running && s.stateOn]}>
                <Text maxFontSizeMultiplier={1.2} style={[s.stateText, running && s.stateTextOn]}>{running ? 'En cours' : 'Prêt'}</Text>
              </View>
            </View>
          </Animated.View>

          <View style={s.stats}>
            <View style={s.stat}>
              <Text maxFontSizeMultiplier={1.2} style={s.statValue}>{formatDuration(elapsed)}</Text>
              <Text maxFontSizeMultiplier={1.3} style={s.statLabel}>Durée</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text maxFontSizeMultiplier={1.2} style={s.statValue}>{compressions}</Text>
              <Text maxFontSizeMultiplier={1.3} style={s.statLabel}>Compressions</Text>
            </View>
          </View>
        </View>

        <View style={s.technique}>
          <IconTile tone="primary"><Hand size={24} color={colors.primaryText} /></IconTile>
          <View style={s.techCopy}>
            <Text maxFontSizeMultiplier={1.3} style={s.techTitle}>Deux mains · centre de la poitrine</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.techSub}>Bras tendus · profondeur 5 à 6 cm · laisser remonter</Text>
          </View>
        </View>

        <View style={s.controls}>
          <Button
            label={sound ? 'Son actif' : 'Son coupé'}
            size="md"
            variant="secondary"
            accessibilityLabel="Son du métronome"
            onPress={() => setSound((value) => { soundRef.current = !value; return !value; })}
            icon={sound ? <Volume2 size={20} color={colors.primaryText} /> : <VolumeX size={20} color={colors.inkFaint} />}
            style={s.control}
          />
          <Button label="Remettre à zéro" size="md" variant="secondary" accessibilityLabel="Remettre le métronome à zéro" onPress={reset} icon={<RotateCcw size={20} color={colors.ink} />} style={s.control} />
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

const RING = 200;

const useStyles = makeStyles((t) => ({
  center: { alignItems: 'center', justifyContent: 'center', gap: t.spacing.lg, paddingVertical: t.spacing.sm },
  ringOuter: { width: RING, height: RING, borderRadius: RING / 2, padding: 8, backgroundColor: t.colors.surfaceAlt },
  ringOuterActive: { backgroundColor: t.colors.dangerBg },
  ring: {
    flex: 1,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: t.colors.surface,
    borderWidth: 4,
    borderColor: t.colors.borderStrong,
  },
  ringActive: { borderColor: t.colors.sos },
  bpm: { fontFamily: 'DMSans_700Bold', fontSize: 64, lineHeight: 70, letterSpacing: -1, color: t.colors.ink },
  bpmLabel: { ...t.text.caption, color: t.colors.inkMuted },
  state: { marginTop: t.spacing.xs, paddingHorizontal: t.spacing.sm, paddingVertical: 4, borderRadius: t.radius.full, backgroundColor: t.colors.surfaceAlt, borderWidth: 1, borderColor: t.colors.border },
  stateOn: { backgroundColor: t.colors.dangerBg, borderColor: t.colors.dangerBorder },
  stateText: { ...t.text.captionStrong, color: t.colors.inkMuted },
  stateTextOn: { color: t.colors.dangerText },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { width: 140, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 44, backgroundColor: t.colors.border },
  statValue: { fontFamily: 'DMSans_700Bold', fontSize: 30, lineHeight: 36, color: t.colors.ink },
  statLabel: { ...t.text.caption },
  technique: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, padding: t.spacing.md, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface },
  techCopy: { flex: 1, gap: 2 },
  techTitle: { ...t.text.bodyStrong },
  techSub: { ...t.text.caption },
  controls: { flexDirection: 'row', gap: t.spacing.sm },
  control: { flex: 1 },
  stop: {
    minHeight: 64,
    borderRadius: t.radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderWidth: 2,
    borderColor: t.colors.sos,
  },
  stopPressed: { backgroundColor: t.colors.dangerBg },
  stopText: { ...t.text.bodyStrong },
  stopSub: { ...t.text.caption },
}));

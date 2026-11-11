import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import PhoneCall from 'lucide-react-native/icons/phone-call';
import RadioTower from 'lucide-react-native/icons/radio-tower';
import Settings2 from 'lucide-react-native/icons/settings-2';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import UserRoundPlus from 'lucide-react-native/icons/user-round-plus';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { IndependenceNotice } from '@/components/IndependenceNotice';
import { Screen } from '@/components/Screen';
import { IconButton, IconTile, ListRow } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n/use-i18n';
import { makeStyles, useTheme } from '@/theme';

export default function HomeScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const reducedMotion = useReducedMotion();
  const { t } = useI18n();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;

  const pulse = useRef(new Animated.Value(0)).current;
  const [profileName, setProfileName] = useState('');

  useFocusEffect(useCallback(() => {
    if (reducedMotion) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true, isInteraction: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true, isInteraction: false }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
      pulse.setValue(0);
    };
  }, [pulse, reducedMotion]));

  useFocusEffect(useCallback(() => {
    let active = true;
    void db.getFirstAsync<{ name: string }>('SELECT name FROM user_profile ORDER BY updated_at DESC LIMIT 1')
      .then((profile) => {
        if (active) setProfileName(profile?.name ?? '');
      })
      .catch(() => {
        if (active) setProfileName('');
      });
    return () => { active = false; };
  }, [db]));

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <Screen>
      <AppHeader
        title={profileName ? `Bonjour, ${profileName.split(' ')[0]}` : 'Nafalan'}
        subtitle={t('home_ready')}
        action={<IconButton accessibilityLabel={t('settings_title')} icon={<Settings2 size={22} color={colors.inkMuted} />} onPress={() => router.push('/settings')} />}
      />

      <IndependenceNotice />

      <View style={s.sosZone}>
        <Animated.View
          pointerEvents="none"
          style={[s.pulse, { opacity: reducedMotion ? 0 : pulseOpacity, transform: [{ scale: reducedMotion ? 1 : pulseScale }] }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sos_title')}
          accessibilityHint={t('sos_which')}
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.push('/sos');
          }}
          style={({ pressed }) => [s.sos, pressed && s.sosPressed]}
        >
          <ShieldAlert size={40} color={colors.onColor} strokeWidth={2.2} />
          <Text maxFontSizeMultiplier={1.1} style={s.sosText}>SOS</Text>
          <Text maxFontSizeMultiplier={1.25} style={s.sosSub}>{t('home_touch')}</Text>
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={s.sosHint}>{t('home_sos_hint')}</Text>
      </View>

      <View style={[s.quickRow, largeText && s.quickColumn]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('home_cpr')}, ${t('home_cpr_sub')}`} onPress={() => router.push('/cpr')} style={({ pressed }) => [s.quick, pressed && s.quickPressed]}>
          <IconTile tone="danger"><HeartPulse size={24} color={colors.dangerText} /></IconTile>
          <View style={s.quickCopy}>
            <Text maxFontSizeMultiplier={1.4} style={s.quickTitle}>{t('home_cpr')}</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.quickSub}>{t('home_cpr_sub')}</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('home_numbers')}, ${t('home_numbers_sub')}`} onPress={() => router.push('/directory')} style={({ pressed }) => [s.quick, pressed && s.quickPressed]}>
          <IconTile tone="primary"><PhoneCall size={24} color={colors.primaryText} /></IconTile>
          <View style={s.quickCopy}>
            <Text maxFontSizeMultiplier={1.4} style={s.quickTitle}>{t('home_numbers')}</Text>
            <Text maxFontSizeMultiplier={1.4} style={s.quickSub}>{t('home_numbers_sub')}</Text>
          </View>
        </Pressable>
      </View>

      <ListRow
        title="Alertes proches"
        subtitle="Recevoir les alertes des téléphones autour de vous."
        leading={<IconTile tone="info"><RadioTower size={22} color={colors.infoText} /></IconTile>}
        chevron
        accessibilityLabel="Recevoir les alertes proches"
        accessibilityHint="Ouvre la réception Bluetooth sans créer votre propre alerte SOS."
        onPress={() => router.push('/mesh')}
      />

      {!profileName ? (
        <ListRow
          title={t('home_complete_profile')}
          subtitle={t('home_complete_profile_sub')}
          leading={<IconTile tone="warning"><UserRoundPlus size={22} color={colors.warningText} /></IconTile>}
          chevron
          onPress={() => router.push('/profile')}
        />
      ) : null}

      <View style={s.offline}>
        <WifiOff size={18} color={colors.inkFaint} />
        <Text maxFontSizeMultiplier={1.5} style={s.offlineText}>{t('home_local')} · {t('home_offline')}</Text>
      </View>
    </Screen>
  );
}

const SOS_SIZE = 220;

const useStyles = makeStyles((t) => ({
  sosZone: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: t.spacing.md, paddingVertical: t.spacing.md },
  pulse: {
    position: 'absolute',
    width: SOS_SIZE + 24,
    height: SOS_SIZE + 24,
    borderRadius: (SOS_SIZE + 24) / 2,
    backgroundColor: t.colors.sos,
  },
  sos: {
    width: SOS_SIZE,
    height: SOS_SIZE,
    borderRadius: SOS_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: t.colors.sos,
    borderWidth: 6,
    borderColor: t.colors.sosRing,
    ...t.shadows.floating,
  },
  sosPressed: { backgroundColor: t.colors.sosPressed, transform: [{ scale: 0.97 }] },
  sosText: { fontFamily: 'DMSans_700Bold', fontSize: 52, lineHeight: 58, letterSpacing: 2, color: t.colors.onColor },
  sosSub: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, lineHeight: 18, color: t.colors.onColor, textAlign: 'center', paddingHorizontal: t.spacing.lg, opacity: 0.95 },
  sosHint: { ...t.text.caption, textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: t.spacing.sm },
  quickColumn: { flexDirection: 'column' },
  quick: {
    flex: 1,
    minHeight: 120,
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadows.card,
  },
  quickPressed: { backgroundColor: t.colors.surfaceAlt },
  quickCopy: { gap: 2 },
  quickTitle: { ...t.text.bodyStrong, fontSize: 15, lineHeight: 20 },
  quickSub: { ...t.text.caption, fontSize: 13, lineHeight: 18 },
  offline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.spacing.xs, paddingVertical: t.spacing.xs },
  offlineText: { ...t.text.caption, color: t.colors.inkFaint },
}));

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  HeartPulse,
  PhoneCall,
  Settings2,
  ShieldAlert,
  UserRound,
} from 'lucide-react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { colors, font, radius, shadows, spacing, type } from '@/constants/theme';
import { getProfile } from '@/db/database';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useI18n } from '@/i18n/use-i18n';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const reducedMotion = useReducedMotion();
  const { t } = useI18n();
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.3;

  const pulse = useRef(new Animated.Value(0)).current;
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion]);

  useEffect(() => {
    void getProfile(db).then((profile) => setProfileName(profile?.name ?? ''));
  }, [db]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Screen>
      <AppHeader
        title={
          profileName
            ? `Bonjour, ${profileName.split(' ')[0]}`
            : 'SOS Sécurité Mali'
        }
        eyebrow={t('home_ready')}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings_title')}
            onPress={() => router.push('/settings')}
            hitSlop={12}
            style={styles.settings}
          >
            <Settings2 size={21} color={colors.sandMuted} />
          </Pressable>
        }
      />

      <View style={[styles.sosZone, largeText && styles.sosZoneLarge]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.pulse, { opacity: reducedMotion ? 0.18 : pulseOpacity, transform: [{ scale: reducedMotion ? 1 : pulseScale }] }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('sos_title')}
          accessibilityHint={t('sos_which')}
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.push('/sos');
          }}
          style={({ pressed }) => [styles.sos, pressed && styles.sosPressed]}
        >
          <ShieldAlert size={36} color={colors.black} strokeWidth={2.7} />
          <Text maxFontSizeMultiplier={1.15} style={styles.sosText}>SOS</Text>
          <Text maxFontSizeMultiplier={1.35} style={styles.sosSub}>{t('home_touch')}</Text>
        </Pressable>
        <Text maxFontSizeMultiplier={1.15} style={styles.sosHint}>{t('home_sos_hint')}</Text>
      </View>

      <View style={[styles.directRow, largeText && styles.wrapRow]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('home_cpr')} onPress={() => router.push('/cpr')} style={[styles.direct, largeText && styles.directLarge]}>
          <HeartPulse size={20} color={colors.alert} />
          <View style={styles.directCopy}>
            <Text maxFontSizeMultiplier={1.5} style={styles.directTitle}>{t('home_cpr')}</Text>
            <Text maxFontSizeMultiplier={1.5} style={styles.directSub}>{t('home_cpr_sub')}</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('home_numbers')} onPress={() => router.push('/directory')} style={[styles.direct, largeText && styles.directLarge]}>
          <PhoneCall size={20} color={colors.green} />
          <View style={styles.directCopy}>
            <Text maxFontSizeMultiplier={1.5} style={styles.directTitle}>{t('home_numbers')}</Text>
            <Text maxFontSizeMultiplier={1.5} style={styles.directSub}>{t('home_numbers_sub')}</Text>
          </View>
        </Pressable>
      </View>

      {!profileName ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('home_complete_profile')} onPress={() => router.push('/profile')}>
          <Card style={styles.profileBanner}>
            <UserRound size={22} color={colors.amber} />
            <View style={styles.profileCopy}>
              <Text maxFontSizeMultiplier={1.5} style={styles.profileTitle}>{t('home_complete_profile')}</Text>
              <Text maxFontSizeMultiplier={1.5} style={styles.profileSub}>{t('home_complete_profile_sub')}</Text>
            </View>
          </Card>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  settings: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.raised,
  },
  sosZone: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  sosZoneLarge: { minHeight: 200 },
  pulse: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: colors.alert,
    backgroundColor: colors.alertDark,
  },
  sos: {
    width: 172,
    height: 172,
    borderRadius: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.alert,
    borderWidth: 5,
    borderColor: '#FFB09F',
    ...shadows.soft,
  },
  sosPressed: { transform: [{ scale: 0.96 }], backgroundColor: '#E43D1C' },
  sosText: { fontFamily: font.display, fontSize: 44, lineHeight: 49, color: colors.black, letterSpacing: 1 },
  sosSub: { fontFamily: font.bodyBold, fontSize: 12, color: colors.black, letterSpacing: 0.2 },
  sosHint: { ...type.eyebrow, color: colors.sandMuted, letterSpacing: 0.7 },
  wrapRow: { flexWrap: 'wrap' },
  directRow: { flexDirection: 'row', gap: spacing.sm },
  direct: {
    flex: 1,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  directCopy: { flex: 1 },
  directLarge: { flexBasis: '100%' },
  directTitle: { fontFamily: font.bodyBold, fontSize: 15, color: colors.sand },
  directSub: { fontFamily: font.body, fontSize: 12, color: colors.sandFaint, marginTop: 2 },
  profileBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  profileCopy: { flex: 1 },
  profileTitle: { ...type.small, color: colors.sand, fontFamily: font.bodyBold },
  profileSub: { ...type.small, fontSize: 11, marginTop: 2 },
});

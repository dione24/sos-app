import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Siren } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing } from '@/constants/theme';

/** Extra scroll padding so list content clears the floating SOS control above the tab bar. */
export const EMERGENCY_FAB_SCROLL_CLEARANCE = 96;

export function EmergencyFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Sit above the tab bar (~64) plus a small gap, without covering the home indicator.
  const bottom = Math.max(80, 64 + Math.max(insets.bottom, 8));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Déclencher une alerte SOS"
      accessibilityHint="Ouvre l’écran d’appel d’urgence"
      accessibilityLiveRegion="none"
      hitSlop={6}
      onPress={() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.push('/sos');
      }}
      style={({ pressed }) => [
        styles.fab,
        { bottom },
        pressed && styles.pressed,
      ]}
    >
      <Siren size={24} color={colors.black} strokeWidth={2.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 20,
    width: 58,
    height: 58,
    borderRadius: radius.round,
    backgroundColor: colors.alert,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFB09F',
    ...shadows.soft,
    elevation: 12,
  },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
});

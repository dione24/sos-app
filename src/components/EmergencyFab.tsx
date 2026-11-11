import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Siren from 'lucide-react-native/icons/siren';
import { Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/theme';

/** Dégagement de défilement pour que les listes passent au-dessus du bouton flottant. */
export const EMERGENCY_FAB_SCROLL_CLEARANCE = 88;

export function EmergencyFab() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Au-dessus de la barre d'onglets (~68 px) sans couvrir l'indicateur d'accueil.
  const bottom = Math.max(84, 68 + Math.max(insets.bottom, 8));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Déclencher une alerte SOS"
      accessibilityHint="Ouvre l’écran d’appel d’urgence"
      hitSlop={6}
      onPress={() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.push('/sos');
      }}
      style={({ pressed }) => [s.fab, { bottom }, pressed && s.pressed]}
    >
      <Siren size={22} color={colors.onColor} strokeWidth={2.4} />
      <Text maxFontSizeMultiplier={1.2} style={s.label}>SOS</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  fab: {
    position: 'absolute',
    right: t.spacing.md,
    zIndex: 20,
    minHeight: t.hit.action,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    backgroundColor: t.colors.sos,
    ...t.shadows.floating,
  },
  pressed: { backgroundColor: t.colors.sosPressed, transform: [{ scale: 0.97 }] },
  label: { fontFamily: 'DMSans_700Bold', fontSize: 18, lineHeight: 22, letterSpacing: 0.5, color: t.colors.onColor },
}));

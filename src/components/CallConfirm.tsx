import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, font, radius, spacing, type } from '@/constants/theme';

type CallConfirmProps = {
  number: string;
  service: string;
  onCall: () => void;
  onClose: () => void;
};

export function CallConfirm({ number, service, onCall, onClose }: CallConfirmProps) {
  const callRef = useRef<View>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const node = findNodeHandle(callRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible
    >
      <View accessibilityViewIsModal accessibilityLabel="Confirmation de l’appel" style={styles.overlay}>
        <Pressable accessibilityLabel="Fermer la confirmation" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.panel}>
          <Text maxFontSizeMultiplier={1.35} style={styles.eyebrow}>APPEL D’URGENCE</Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.number}>{number}</Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.service}>{service} · réseau téléphonique</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Appeler le ${number}`}
            ref={callRef}
            onPress={onCall}
            style={({ pressed }) => [styles.call, pressed && styles.pressed]}
          >
            <Text maxFontSizeMultiplier={1.35} style={styles.callText}>Appeler</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour sans appeler"
            onPress={onClose}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Text maxFontSizeMultiplier={1.35} style={styles.backText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: `${colors.void}EB`,
  },
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  eyebrow: { ...type.eyebrow, color: colors.amber, textAlign: 'center' },
  number: { fontFamily: font.display, fontSize: 36, lineHeight: 42, color: colors.sand, textAlign: 'center' },
  service: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 22, color: colors.sandMuted, textAlign: 'center' },
  call: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.amber,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  callText: { fontFamily: font.displayMedium, fontSize: 18, color: colors.black },
  back: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  backText: { fontFamily: font.displayMedium, fontSize: 16, color: colors.sand },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});

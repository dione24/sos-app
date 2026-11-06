import { PhoneCall } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { makeStyles, useTheme } from '@/theme';

type CallConfirmProps = {
  number: string;
  service: string;
  onCall: () => void;
  onClose: () => void;
};

export function CallConfirm({ number, service, onCall, onClose }: CallConfirmProps) {
  const s = useStyles();
  const { colors } = useTheme();
  const callRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(callRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Modal animationType="fade" onRequestClose={onClose} presentationStyle="overFullScreen" statusBarTranslucent transparent visible>
      <View accessibilityViewIsModal accessibilityLabel="Confirmation de l’appel" style={s.overlay}>
        <Pressable accessibilityLabel="Fermer la confirmation" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={s.panel}>
          <View style={s.badge}>
            <PhoneCall size={26} color={colors.dangerText} strokeWidth={2.2} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={s.label}>Appel d’urgence</Text>
          <Text maxFontSizeMultiplier={1.2} style={s.number}>{number}</Text>
          <Text maxFontSizeMultiplier={1.4} style={s.service}>{service} · réseau téléphonique</Text>
          <View ref={callRef} style={s.actions}>
            <Button label={`Appeler le ${number}`} onPress={onCall} variant="sos" icon={<PhoneCall size={22} color={colors.onColor} />} />
            <Button label="Retour sans appeler" onPress={onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  overlay: { flex: 1, justifyContent: 'center', padding: t.spacing.lg, backgroundColor: t.colors.overlay },
  panel: {
    alignItems: 'center',
    gap: t.spacing.xs,
    padding: t.spacing.xl,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.dangerBg, marginBottom: t.spacing.xs },
  label: { ...t.text.overline, color: t.colors.dangerText },
  number: { fontFamily: 'DMSans_700Bold', fontSize: 44, lineHeight: 50, letterSpacing: -0.5, color: t.colors.ink },
  service: { ...t.text.body, color: t.colors.inkMuted, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: t.spacing.sm, marginTop: t.spacing.md },
}));

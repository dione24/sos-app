import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EMERGENCY_FAB_SCROLL_CLEARANCE } from '@/components/EmergencyFab';
import { reportAppReady } from '@/lib/app-readiness';
import { makeStyles, spacing } from '@/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean | undefined;
  /** False while primary local data is loading; diagnostics wait for usable content. */
  ready?: boolean | undefined;
  footer?: ReactNode | undefined;
  /** Dégagement supplémentaire pour le bouton SOS flottant (onglets). */
  clearFab?: boolean | undefined;
  contentStyle?: ViewStyle | undefined;
  scrollProps?: ScrollViewProps | undefined;
}>;

export function Screen({ children, scroll = true, ready = true, footer, clearFab = false, contentStyle, scrollProps }: ScreenProps) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const hasLayout = useRef(false);
  const frame = useRef<number | null>(null);
  const scheduleReady = useCallback(() => {
    if (!ready || !focused || frame.current != null) return;
    frame.current = requestAnimationFrame(() => { void reportAppReady(); });
  }, [focused, ready]);
  useEffect(() => {
    if (hasLayout.current) scheduleReady();
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [scheduleReady]);
  const fabPad = clearFab ? EMERGENCY_FAB_SCROLL_CLEARANCE : 0;
  const contentBottomPad = footer ? spacing.lg : spacing.xxl + Math.max(insets.bottom, spacing.sm) + fabPad;
  const footerBottomPad = spacing.sm + Math.max(insets.bottom, spacing.md);

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[s.content, { paddingBottom: contentBottomPad }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.content, s.flex, { paddingBottom: contentBottomPad }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']} onLayout={() => { hasLayout.current = true; scheduleReady(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        {content}
        {footer ? <View style={[s.footer, { paddingBottom: footerBottomPad }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: t.spacing.md, paddingTop: t.spacing.xs, gap: t.spacing.md },
  footer: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.sm,
    backgroundColor: t.colors.bg,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
}));

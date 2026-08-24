import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EMERGENCY_FAB_SCROLL_CLEARANCE } from '@/components/EmergencyFab';
import { colors, spacing } from '@/constants/theme';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean | undefined;
  footer?: ReactNode | undefined;
  /** Extra bottom inset for screens under the floating SOS FAB (tab flows). */
  clearFab?: boolean | undefined;
  contentStyle?: ViewStyle | undefined;
  scrollProps?: ScrollViewProps | undefined;
}>;

export function Screen({
  children,
  scroll = true,
  footer,
  clearFab = false,
  contentStyle,
  scrollProps,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  // Keep room for the emergency FAB / tab bar, and never sit under the home indicator.
  const fabPad = clearFab ? EMERGENCY_FAB_SCROLL_CLEARANCE : 0;
  const contentBottomPad = footer
    ? spacing.xl + insets.bottom
    : 100 + Math.max(insets.bottom, 12) + fabPad;
  const footerBottomPad = spacing.sm + Math.max(insets.bottom, spacing.md);

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: contentBottomPad }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, { paddingBottom: contentBottomPad }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {content}
        {footer ? <View style={[styles.footer, { paddingBottom: footerBottomPad }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.void },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.void,
  },
});

import { useRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { KeyboardAwareProvider } from './keyboard-aware';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  contentStyle?: ViewStyle;
  /** Safe-area edges to pad. Drop `top` on screens that show a navigation header. */
  edges?: readonly Edge[];
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
  edges = ['top', 'bottom', 'left', 'right'],
}: ScreenProps) {
  const c = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const inner = <View style={[styles.inner, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: c.background }]}
      edges={edges}
    >
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <KeyboardAwareProvider scrollRef={scrollRef}>
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              {inner}
            </ScrollView>
          </KeyboardAwareProvider>
        ) : (
          <View style={styles.scroll}>{inner}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
  },
});

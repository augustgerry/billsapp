import { type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SheetAction {
  key: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

/**
 * A minimal bottom sheet of tappable actions. Cross-platform (no native
 * ActionSheet), themed, dismisses on backdrop tap.
 */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
  style,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: c.surface, borderColor: c.border },
            style,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {title ? (
            <ThemedText themeColor="textFaint" style={styles.title}>
              {title}
            </ThemedText>
          ) : null}
          {actions.map((a, i) => (
            <Pressable
              key={a.key}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={({ pressed }) => [
                styles.row,
                i > 0 && { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth },
                pressed && { backgroundColor: c.surface2 },
              ]}
            >
              {a.icon}
              <ThemedText
                style={[
                  styles.label,
                  { color: a.destructive ? c.danger : c.text },
                ]}
              >
                {a.label}
              </ThemedText>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.five,
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  label: { fontSize: 16, fontWeight: '600' },
});

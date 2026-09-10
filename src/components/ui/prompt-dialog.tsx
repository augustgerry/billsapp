import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/settings/locale';
import { useTheme } from '@/hooks/use-theme';

/**
 * A small themed "enter some text" dialog. Cross-platform replacement for
 * `Alert.prompt` (which is iOS-only).
 */
export function PromptDialog({
  visible,
  title,
  message,
  placeholder,
  initialValue = '',
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const c = useTheme();
  const t = useT();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <ThemedText style={styles.title}>{title}</ThemedText>
          {message ? (
            <ThemedText themeColor="textSecondary" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}
          <TextField
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => value.trim() && onConfirm(value.trim())}
          />
          <View style={styles.row}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              style={styles.flex1}
              onPress={onCancel}
            />
            <Button
              label={confirmLabel ?? t('common.save')}
              style={styles.flex1}
              disabled={!value.trim()}
              onPress={() => onConfirm(value.trim())}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: { fontSize: 17, fontWeight: '700' },
  message: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
});

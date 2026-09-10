import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** nativeID that `TextField` points numeric keyboards at. */
export const KEYBOARD_DONE_ID = 'kongsi-kb-done';

/**
 * A "Selesai" bar above the keyboard so numeric keyboards (which have no
 * return key) can be dismissed. iOS only — render once near the app root.
 * On Android tapping outside the field already dismisses.
 */
export function KeyboardDoneBar() {
  const c = useTheme();
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View
        style={[
          styles.bar,
          { backgroundColor: c.surface2, borderTopColor: c.border },
        ]}
      >
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={10}>
          <Text style={[styles.done, { color: c.primaryText }]}>Selesai</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  done: { fontSize: 16, fontWeight: '700' },
});

import { forwardRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

type FocusHandler = NonNullable<TextInputProps['onFocus']>;
type BlurHandler = NonNullable<TextInputProps['onBlur']>;

import { Spacing } from '@/constants/theme';
import { useT } from '@/features/settings/locale';
import { useTheme } from '@/hooks/use-theme';
import { KEYBOARD_DONE_ID } from './keyboard-done-bar';
import { useKeyboardAware } from './keyboard-aware';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const NUMERIC: KeyboardTypeOptions[] = [
  'number-pad',
  'numeric',
  'decimal-pad',
  'phone-pad',
];

export const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    { label, error, hint, style, containerStyle, onFocus, onBlur, ...props },
    ref,
  ) => {
    const c = useTheme();
    const t = useT();
    const keyboardAware = useKeyboardAware();
    const [focused, setFocused] = useState(false);

    const isNumeric =
      !!props.keyboardType && NUMERIC.includes(props.keyboardType);
    // numeric keyboards have no return key -> a way out is needed on both OSes:
    //  - iOS: the shared "Selesai" InputAccessoryView bar
    //  - Android: InputAccessoryView doesn't exist, so show an inline "Selesai"
    //    in the label row while the field is focused
    const needsDoneBar = Platform.OS === 'ios' && isNumeric;
    const showInlineDone =
      Platform.OS === 'android' && isNumeric && focused;

    const handleFocus: FocusHandler = (e) => {
      setFocused(true);
      const tag = e?.nativeEvent?.target;
      if (typeof tag === 'number') keyboardAware?.scrollToInput(tag);
      onFocus?.(e);
    };
    const handleBlur: BlurHandler = (e) => {
      setFocused(false);
      onBlur?.(e);
    };

    return (
      <View style={[styles.field, containerStyle]}>
        {label || showInlineDone ? (
          <View style={styles.labelRow}>
            {label ? (
              <Text style={[styles.label, { color: c.textSecondary }]}>
                {label}
              </Text>
            ) : (
              <View />
            )}
            {showInlineDone ? (
              <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
                <Text style={[styles.inlineDone, { color: c.primaryText }]}>
                  {t('common.done')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textFaint}
          inputAccessoryViewID={
            needsDoneBar ? KEYBOARD_DONE_ID : props.inputAccessoryViewID
          }
          style={[
            styles.input,
            {
              backgroundColor: c.surface2,
              borderColor: error ? c.danger : focused ? c.primary : c.border,
              color: c.text,
            },
            style,
          ]}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {error ? (
          <Text style={[styles.msg, { color: c.danger }]}>{error}</Text>
        ) : hint ? (
          <Text style={[styles.msg, { color: c.textFaint }]}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  field: { gap: 6 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  label: { fontSize: 13, fontWeight: '600' },
  inlineDone: { fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 16,
  },
  msg: { fontSize: 12 },
});

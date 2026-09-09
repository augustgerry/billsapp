import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, hint, style, containerStyle, ...props }, ref) => {
    const c = useTheme();
    return (
      <View style={[styles.field, containerStyle]}>
        {label ? (
          <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textFaint}
          style={[
            styles.input,
            {
              backgroundColor: c.surface2,
              borderColor: error ? c.danger : c.border,
              color: c.text,
            },
            style,
          ]}
          {...props}
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
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 16,
  },
  msg: { fontSize: 12 },
});

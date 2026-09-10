import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface SegmentedProps<T extends string> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const c = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: c.surface2 }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.seg, active && { backgroundColor: c.surface }]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? c.primaryText : c.textSecondary,
                  fontWeight: active ? '700' : '600',
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 3 },
  seg: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600' },
});

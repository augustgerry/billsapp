import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { CATEGORY_ICON } from '@/constants/theme';
import { useCategoryColors } from '@/hooks/use-theme';
import type { BillCategory } from '@/types/models';

/**
 * The category marker used everywhere a bill is shown. One glyph for every
 * category (point 8) — only the disc colour tells them apart.
 */
export function CategoryIcon({
  category,
  size = 36,
  style,
}: {
  category: BillCategory;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const catColor = useCategoryColors();
  const color = catColor[category] ?? catColor.Lainnya;
  return (
    <View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '22',
        },
        style,
      ]}
    >
      <Ionicons name={CATEGORY_ICON} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center' },
});

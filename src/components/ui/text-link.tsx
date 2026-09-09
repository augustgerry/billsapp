import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** An inline primary-coloured navigation link. */
export function TextLink({ style, ...props }: ComponentProps<typeof Link>) {
  const c = useTheme();
  return <Link {...props} style={[styles.link, { color: c.primaryText }, style]} />;
}

const styles = StyleSheet.create({
  link: { fontWeight: '700' },
});

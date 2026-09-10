import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { KeyboardDoneBar } from '@/components/ui/keyboard-done-bar';
import { SupabaseGate } from '@/components/supabase-gate';
import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import {
  ThemePreferenceProvider,
  useResolvedScheme,
} from '@/features/settings/theme-preference';

SplashScreen.preventAutoHideAsync();

function navTheme(scheme: 'light' | 'dark') {
  const c = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.danger,
    },
  };
}

function SplashHider() {
  const { initializing } = useAuth();
  useEffect(() => {
    if (!initializing) void SplashScreen.hideAsync();
  }, [initializing]);
  return null;
}

function ThemedApp() {
  const scheme = useResolvedScheme();
  return (
    <ThemeProvider value={navTheme(scheme)}>
      <SupabaseGate>
        <AuthProvider>
          <SplashHider />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </SupabaseGate>
      <KeyboardDoneBar />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemePreferenceProvider>
          <ThemedApp />
        </ThemePreferenceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

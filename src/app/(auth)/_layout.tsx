import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/features/auth/auth-context';
import { useT } from '@/features/settings/locale';

export default function AuthLayout() {
  const { initializing, session } = useAuth();
  const t = useT();
  if (initializing) return <LoadingScreen />;
  if (session) return <Redirect href="/(app)" />;

  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: t('register.title') }} />
      <Stack.Screen name="verify" options={{ title: t('verify.title') }} />
    </Stack>
  );
}

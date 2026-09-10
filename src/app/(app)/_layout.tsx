import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/features/auth/auth-context';
import { useT } from '@/features/settings/locale';

export default function AppLayout() {
  const { initializing, session } = useAuth();
  const t = useT();
  if (initializing) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
      <Stack.Screen name="create-group" options={{ title: t('nav.createGroup') }} />
      <Stack.Screen name="join-group" options={{ title: t('nav.joinGroup') }} />
      <Stack.Screen name="group-login" options={{ title: t('nav.groupLogin') }} />
      <Stack.Screen name="group/[id]/index" options={{ title: t('nav.group') }} />
      <Stack.Screen
        name="group/[id]/add-bill"
        options={{ title: t('nav.addBill') }}
      />
    </Stack>
  );
}

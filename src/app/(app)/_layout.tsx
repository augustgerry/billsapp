import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/features/auth/auth-context';

export default function AppLayout() {
  const { initializing, session } = useAuth();
  if (initializing) return <LoadingScreen />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Pengaturan' }} />
      <Stack.Screen name="create-group" options={{ title: 'Buat grup' }} />
      <Stack.Screen name="join-group" options={{ title: 'Buka grup' }} />
      <Stack.Screen name="group-login" options={{ title: 'Masuk grup' }} />
      <Stack.Screen name="group/[id]/index" options={{ title: 'Grup' }} />
      <Stack.Screen name="group/[id]/add-bill" options={{ title: 'Tambah tagihan' }} />
    </Stack>
  );
}

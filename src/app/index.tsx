import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/features/auth/auth-context';

export default function Index() {
  const { initializing, session } = useAuth();
  if (initializing) return <LoadingScreen />;
  return <Redirect href={session ? '/(app)' : '/(auth)/login'} />;
}

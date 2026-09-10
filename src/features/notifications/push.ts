/**
 * Expo push token registration.
 *
 * Requires a Development Build (or a store build) — push tokens don't work in
 * Expo Go, and `getExpoPushTokenAsync` needs an EAS `projectId`. Until
 * `eas init` has run, this no-ops with a warning. See docs/PUSH_SETUP.md.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function easProjectId(): string | undefined {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEas = Constants.easConfig?.projectId;
  return typeof fromConfig === 'string'
    ? fromConfig
    : typeof fromEas === 'string'
      ? fromEas
      : undefined;
}

/** Best-effort: ask for permission, get the token, upsert it for this user. */
export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return;

  try {
    const projectId = easProjectId();
    if (!projectId) {
      console.warn('[push] no EAS projectId yet — run `eas init`; skipping.');
      return;
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Umum',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#D6AE52',
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );
  } catch (e) {
    console.warn('[push] registration failed:', e);
  }
}

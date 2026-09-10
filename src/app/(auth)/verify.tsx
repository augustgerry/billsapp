import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { useT } from '@/features/settings/locale';

export default function VerifyScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { verifyEmail, resendCode } = useAuth();
  const t = useT();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyEmail({ email, token: code });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('verify.wrongCode'));
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setNote(null);
    try {
      await resendCode(email);
      setNote(t('verify.resent'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('verify.resendFailed'));
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">{t('verify.title')}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {t('verify.subtitle', { email: email || t('verify.emailFallback') })}
      </ThemedText>

      <View style={styles.form}>
        <TextField
          label={t('verify.codeLabel')}
          value={code}
          onChangeText={(v) => setCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="123456"
          maxLength={6}
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error ?? undefined}
          hint={note ?? undefined}
        />
        <Button
          label={t('verify.submit')}
          onPress={submit}
          disabled={code.length !== 6}
          loading={busy}
        />
        <Button label={t('verify.resend')} variant="ghost" onPress={resend} />
        <Button
          label={t('verify.changeEmail')}
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, marginTop: Spacing.two },
});

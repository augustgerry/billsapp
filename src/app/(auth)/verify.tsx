import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';

export default function VerifyScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { verifyEmail, resendCode } = useAuth();
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
      // success -> (auth)/_layout redirects to /(app)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kode salah, coba lagi.');
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setNote(null);
    try {
      await resendCode(email);
      setNote('Kode baru sudah dikirim.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim ulang.');
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Verifikasi email</ThemedText>
      <ThemedText themeColor="textSecondary">
        Masukkan kode 6 digit yang dikirim ke {email || 'email kamu'}.
      </ThemedText>

      <View style={styles.form}>
        <TextField
          label="Kode OTP"
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="123456"
          maxLength={6}
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error ?? undefined}
          hint={note ?? undefined}
        />
        <Button
          label="Verifikasi"
          onPress={submit}
          disabled={code.length !== 6}
          loading={busy}
        />
        <Button label="Kirim ulang kode" variant="ghost" onPress={resend} />
        <Button label="Ganti email" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, marginTop: Spacing.two },
});

import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WA_RE = /^0\d{9,13}$/;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [wa, setWa] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pwRef = useRef<TextInput>(null);
  const waRef = useRef<TextInput>(null);

  const emailOk = EMAIL_RE.test(email.trim());
  const passOk = password.length >= 6;
  const waOk = WA_RE.test(wa.trim());
  const valid = emailOk && passOk && waOk;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { needsVerification } = await signUp({ email, password, wa });
      if (needsVerification) {
        router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
        setBusy(false);
      }
      // otherwise the session exists and (auth)/_layout redirects
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mendaftar');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Daftar</ThemedText>
      <ThemedText themeColor="textSecondary">Buat akun buat mulai pakai Kongsi.</ThemedText>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="nama@email.com"
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
          error={email.length > 0 && !emailOk ? 'Masukkan email yang valid.' : undefined}
        />
        <TextField
          ref={pwRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Minimal 6 karakter"
          returnKeyType="next"
          onSubmitEditing={() => waRef.current?.focus()}
          error={password.length > 0 && !passOk ? 'Password minimal 6 karakter.' : undefined}
        />
        <TextField
          ref={waRef}
          label="Nomor WhatsApp"
          value={wa}
          onChangeText={(t) => setWa(t.replace(/[^0-9]/g, ''))}
          keyboardType="phone-pad"
          placeholder="08123456789"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={wa.length > 0 && !waOk ? 'Contoh: 08123456789.' : undefined}
        />
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Daftar" onPress={submit} disabled={!valid} loading={busy} />
      </View>

      <Text style={styles.foot}>
        <ThemedText themeColor="textSecondary">Sudah punya akun? </ThemedText>
        <TextLink href="/(auth)/login">Masuk</TextLink>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, marginTop: Spacing.two },
  foot: { textAlign: 'center', marginTop: Spacing.three },
});

import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pwRef = useRef<TextInput>(null);

  const valid = email.trim().length > 0 && password.length > 0;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn({ email, password });
      // success -> (auth)/_layout redirects to /(app); keep the spinner
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal masuk');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ThemedText type="subtitle">Masuk</ThemedText>
      <ThemedText themeColor="textSecondary">Masuk ke akun Kongsi kamu.</ThemedText>

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
        />
        <TextField
          ref={pwRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error ?? undefined}
        />
        <Button label="Masuk" onPress={submit} disabled={!valid} loading={busy} />
      </View>

      <Text style={styles.foot}>
        <ThemedText themeColor="textSecondary">Belum punya akun? </ThemedText>
        <TextLink href="/(auth)/register">Daftar</TextLink>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three, marginTop: Spacing.two },
  foot: { textAlign: 'center', marginTop: Spacing.three },
});

import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { isValidEmail } from '@/domain/email';
import { useAuth } from '@/features/auth/auth-context';
import { useT } from '@/features/settings/locale';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pwRef = useRef<TextInput>(null);

  const emailOk = isValidEmail(email);
  const valid = emailOk && password.length > 0;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn({ email, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.failed'));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Wordmark size={26} />
      <ThemedText type="subtitle" style={styles.title}>
        {t('login.title')}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{t('login.subtitle')}</ThemedText>

      <View style={styles.form}>
        <TextField
          label={t('common.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder={t('common.emailPlaceholder')}
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
          error={
            email.length > 0 && !emailOk ? t('register.emailInvalid') : undefined
          }
        />
        <TextField
          ref={pwRef}
          label={t('common.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('common.password')}
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error ?? undefined}
        />
        <Button
          label={t('login.submit')}
          onPress={submit}
          disabled={!valid}
          loading={busy}
        />
      </View>

      <Text style={styles.foot}>
        <ThemedText themeColor="textSecondary">{t('login.noAccount')}</ThemedText>
        <TextLink href="/(auth)/register">{t('login.register')}</TextLink>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.two },
  form: { gap: Spacing.three, marginTop: Spacing.two },
  foot: { textAlign: 'center', marginTop: Spacing.three },
});

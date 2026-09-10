import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import {
  DEFAULT_COUNTRY,
  isValidLocalNumber,
  toE164,
  type Country,
} from '@/features/auth/country-codes';
import { PhoneField } from '@/features/auth/phone-field';
import { isValidEmail } from '@/domain/email';
import { useT } from '@/features/settings/locale';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pwRef = useRef<TextInput>(null);

  const emailOk = isValidEmail(email);
  const passOk = password.length >= 6;
  const phoneOk = isValidLocalNumber(phone);
  const valid = emailOk && passOk && phoneOk;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { needsVerification } = await signUp({
        email,
        password,
        wa: toE164(country.dial, phone),
      });
      if (needsVerification) {
        router.push({
          pathname: '/(auth)/verify',
          params: { email: email.trim().toLowerCase() },
        });
        setBusy(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('register.failed'));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Wordmark size={26} />
      <ThemedText type="subtitle" style={styles.title}>
        {t('register.title')}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{t('register.subtitle')}</ThemedText>

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
          placeholder={t('register.passwordHint')}
          error={
            password.length > 0 && !passOk ? t('register.passwordShort') : undefined
          }
        />
        <PhoneField
          label={t('register.phoneLabel')}
          country={country}
          onChangeCountry={setCountry}
          number={phone}
          onChangeNumber={setPhone}
          error={
            phone.length > 0 && !phoneOk ? t('register.phoneInvalid') : undefined
          }
        />
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button
          label={t('register.submit')}
          onPress={submit}
          disabled={!valid}
          loading={busy}
        />
      </View>

      <Text style={styles.foot}>
        <ThemedText themeColor="textSecondary">
          {t('register.haveAccount')}
        </ThemedText>
        <TextLink href="/(auth)/login">{t('register.login')}</TextLink>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.two },
  form: { gap: Spacing.three, marginTop: Spacing.two },
  foot: { textAlign: 'center', marginTop: Spacing.three },
});

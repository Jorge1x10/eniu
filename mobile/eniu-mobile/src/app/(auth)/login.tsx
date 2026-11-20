import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppleAuthButton } from '@/components/apple-auth-button';
import { AuthDivider, AuthShell } from '@/components/auth-shell';
import { AuthTabs } from '@/components/auth-tabs';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { PasswordField } from '@/components/password-field';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { ArrowRightIcon, MailIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { useAuth } from '@/features/auth/auth-context';

export default function LoginScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!identifier.trim() || !password) { setError(t("Ingresa tu correo o usuario y contraseña.")); return; }
    setLoading(true); setError('');
    try {
      await login(identifier.trim(), password);
      router.replace('/(tabs)/(home)');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("No fue posible iniciar sesión."));
    } finally { setLoading(false); }
  }

  return (
    <AuthShell headline={<>{t("Tu menú,\nsiempre")}{'\n'}<Text style={{ color: theme.yellow }}>{t("al día.")}</Text></>}>
      <AuthTabs active="login" />

      <View style={{ gap: 10 }}>
        <AppleAuthButton mode="login" />
        <GoogleAuthButton mode="login" />
      </View>

      <AuthDivider />

      <FormField
        label={t("Correo o usuario")}
        value={identifier}
        onChangeText={setIdentifier}
        icon={<MailIcon color={theme.muted} size={18} />}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        keyboardType="email-address"
        placeholder={t("correo@ejemplo.com")}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <PasswordField
        ref={passwordRef}
        label={t("Contraseña")}
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        textContentType="password"
        placeholder={t("Tu contraseña")}
        returnKeyType="go"
        onSubmitEditing={submit}
        labelAccessory={(
          <Link href="/(auth)/forgot-password" asChild>
            {/* 16 de texto + 14 arriba y abajo: área táctil de 44. */}
            <Pressable accessibilityRole="link" hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}>
              <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 16, fontWeight: '600' }}>{t("¿La olvidaste?")}</Text>
            </Pressable>
          </Link>
        )}
      />

      <Feedback message={error} />

      <Button size="lg" onPress={submit} loading={loading} trailingIcon={<ArrowRightIcon color={theme.onYellow} size={18} />}>{t("Iniciar sesión")}</Button>

      {/* Sin casilla: quien ya tiene cuenta los aceptó en su día. */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{t("Términos y condiciones")}</Text>
        </Pressable>
        <Text aria-hidden style={{ color: theme.muted, fontSize: 12 }}>·</Text>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: theme.muted, fontSize: 12 }}>{t("Aviso de privacidad")}</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

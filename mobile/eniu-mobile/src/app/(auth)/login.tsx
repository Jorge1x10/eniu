import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { AppleAuthButton } from '@/components/apple-auth-button';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { useAuth } from '@/features/auth/auth-context';

export default function LoginScreen() {
  const theme = useEniuTheme();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!identifier.trim() || !password) { setError('Ingresa tu correo o usuario y contraseña.'); return; }
    setLoading(true); setError('');
    try {
      await login(identifier.trim(), password);
      router.replace('/(tabs)/(home)');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible iniciar sesión.');
    } finally { setLoading(false); }
  }

  return (
    <AuthShell title="Inicia sesión" subtitle="Administra tus menús desde cualquier lugar.">
      <Feedback message={error} />
      <FormField label="Correo o nombre de usuario" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoComplete="username" keyboardType="email-address" placeholder="correo@ejemplo.com" />
      <FormField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="Tu contraseña" onSubmitEditing={submit} />
      <Link href="/(auth)/forgot-password" style={{ alignSelf: 'flex-end', color: theme.text, fontWeight: '700', textDecorationLine: 'underline' }}>¿Olvidaste tu contraseña?</Link>
      <Button onPress={submit} loading={loading}>Iniciar sesión</Button>
      <GoogleAuthButton mode="login" />
      <AppleAuthButton mode="login" />
      {/* Sin casilla: quien ya tiene cuenta los aceptó en su día. */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
        <Text accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>Términos y condiciones</Text>
        <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>Aviso de privacidad</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 5 }}>
        <Text style={{ color: theme.muted }}>¿Todavía no tienes cuenta?</Text>
        <Link href="/(auth)/register" style={{ color: theme.text, fontWeight: '800', textDecorationLine: 'underline' }}>Regístrate</Link>
      </View>
    </AuthShell>
  );
}

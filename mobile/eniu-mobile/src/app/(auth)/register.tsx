import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { AppleAuthButton } from '@/components/apple-auth-button';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';

export default function RegisterScreen() {
  const theme = useEniuTheme();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '', confirmation: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    if (!/^[a-zA-Z0-9._]{4,30}$/.test(form.username)) { setError('El usuario debe tener entre 4 y 30 caracteres y usar solo letras, números, puntos o guion bajo.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError('Ingresa un correo electrónico válido.'); return; }
    if (!/^\d{10}$/.test(form.phone)) { setError('El teléfono debe tener 10 dígitos.'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (form.password !== form.confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true); setError('');
    try {
      await register({ username: form.username.trim(), email: form.email.trim().toLowerCase(), phone: form.phone, password: form.password });
      router.replace('/(onboarding)/business');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear la cuenta.');
    } finally { setLoading(false); }
  }

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Empieza a crear y compartir menús digitales.">
      <Feedback message={error} />
      <FormField label="Nombre de usuario" value={form.username} onChangeText={update('username')} autoCapitalize="none" autoComplete="username-new" placeholder="jorgealvarado" />
      <FormField label="Correo electrónico" value={form.email} onChangeText={update('email')} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="correo@ejemplo.com" />
      <FormField label="Teléfono" value={form.phone} onChangeText={update('phone')} autoComplete="tel" keyboardType="number-pad" maxLength={10} placeholder="3312345678" />
      <FormField label="Contraseña" value={form.password} onChangeText={update('password')} secureTextEntry autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
      <FormField label="Confirmar contraseña" value={form.confirmation} onChangeText={update('confirmation')} secureTextEntry autoComplete="new-password" placeholder="Repite tu contraseña" />
      <Button onPress={submit} loading={loading}>Crear cuenta</Button>
      <GoogleAuthButton mode="register" />
      <AppleAuthButton mode="register" />
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 5 }}>
        <Text style={{ color: theme.muted }}>¿Ya tienes una cuenta?</Text>
        <Link href="/(auth)/login" style={{ color: theme.text, fontWeight: '800', textDecorationLine: 'underline' }}>Inicia sesión</Link>
      </View>
    </AuthShell>
  );
}

import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { api } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const theme = useEniuTheme();
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false);
  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Ingresa un correo electrónico válido.'); return; }
    setLoading(true); setError('');
    try { await api.post('auth/forgot-password', { email: email.trim().toLowerCase() }); setSent(true); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible enviar el correo.'); }
    finally { setLoading(false); }
  }
  return <AuthShell title="Recupera tu acceso" subtitle="Te enviaremos instrucciones seguras a tu correo.">{sent ? <><Feedback tone="success" message="Si la cuenta existe, recibirás un enlace para restablecer tu contraseña." /><Text style={{ color: theme.muted, lineHeight: 21 }}>Puedes abrir el enlace desde tu correo y volver a iniciar sesión en la app.</Text></> : <><Feedback message={error} /><FormField label="Correo electrónico" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="correo@ejemplo.com" /><Button loading={loading} onPress={submit}>Enviar instrucciones</Button></>}<Link href="/(auth)/login" style={{ color: theme.text, fontWeight: '800', textAlign: 'center', textDecorationLine: 'underline' }}>Volver a iniciar sesión</Link></AuthShell>;
}

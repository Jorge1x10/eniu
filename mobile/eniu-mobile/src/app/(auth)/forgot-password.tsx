import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const [email, setEmail] = useState(''); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false);
  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError(t("Ingresa un correo electrónico válido.")); return; }
    setLoading(true); setError('');
    try { await api.post('auth/forgot-password', { email: email.trim().toLowerCase() }); setSent(true); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible enviar el correo.")); }
    finally { setLoading(false); }
  }
  return <AuthShell title={t("Recupera tu acceso")} subtitle={t("Te enviaremos instrucciones seguras a tu correo.")}>{sent ? <><Feedback tone="success" message={t("Si la cuenta existe, recibirás un enlace para restablecer tu contraseña.")} /><Text style={{ color: theme.muted, lineHeight: 21 }}>{t("Puedes abrir el enlace desde tu correo y volver a iniciar sesión en la app.")}</Text></> : <><Feedback message={error} /><FormField label={t("Correo electrónico")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder={t("correo@ejemplo.com")} /><Button loading={loading} onPress={submit}>{t("Enviar instrucciones")}</Button></>}<Link href="/(auth)/login" style={{ color: theme.text, fontWeight: '800', textAlign: 'center', textDecorationLine: 'underline' }}>{t("Volver a iniciar sesión")}</Link></AuthShell>;
}

import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { AppleAuthButton } from '@/components/apple-auth-button';
import { AuthShell } from '@/components/auth-shell';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { CheckIcon } from '@/components/ui/icons';
import { useEniuTheme } from '@/constants/eniu-theme';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { useAuth } from '@/features/auth/auth-context';

const TOTAL_STEPS = 3;

const COPY = [
  { title: 'Crea tu cuenta', subtitle: 'Empieza a crear y compartir menús digitales.' },
  { title: 'Tu teléfono', subtitle: 'Lo usamos para identificar tu cuenta y contactarte si hace falta.' },
  { title: 'Confirma tus datos', subtitle: 'Revisa que todo esté bien antes de crear la cuenta.' },
] as const;

function Progress({ step }: { step: number }) {
  const theme = useEniuTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2 }}>PASO {step} DE {TOTAL_STEPS}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: TOTAL_STEPS }, (_, index) => (
          <View key={index} style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: index < step ? theme.yellow : theme.border }} />
        ))}
      </View>
    </View>
  );
}

function TermsCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const theme = useEniuTheme();
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Acepto los términos y condiciones y el aviso de privacidad"
        onPress={onToggle}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 48, padding: 12, borderRadius: 14, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.75 : 1 })}
      >
        <View style={{ width: 22, height: 22, borderRadius: 7, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: checked ? theme.yellow : 'transparent', borderWidth: checked ? 0 : 1.5, borderColor: theme.border }}>
          {checked ? <CheckIcon color={theme.onYellow} size={13} /> : null}
        </View>
        <Text style={{ flex: 1, color: theme.text, fontSize: 13.5, lineHeight: 19 }}>Acepto los términos y condiciones y el aviso de privacidad.</Text>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
        <Text accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>Leer los términos</Text>
        <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={{ color: theme.muted, fontSize: 12, textDecorationLine: 'underline' }}>Leer el aviso</Text>
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  const theme = useEniuTheme();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [form, setForm] = useState({ email: '', phone: '', password: '', confirmation: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };

  // Cada paso valida lo suyo antes de dejar avanzar: nadie debería llegar al
  // resumen con un correo inválido escrito dos pantallas atrás.
  function nextFromAccount() {
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError('Ingresa un correo electrónico válido.'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (form.password !== form.confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setError(''); setStep(2);
  }

  function nextFromPhone() {
    if (!/^\d{10}$/.test(form.phone)) { setError('El teléfono debe tener 10 dígitos.'); return; }
    setError(''); setStep(3);
  }

  function back() { setError(''); setStep((current) => Math.max(1, current - 1)); }

  async function submit() {
    setLoading(true); setError('');
    try {
      await register({ email: form.email.trim().toLowerCase(), phone: form.phone, password: form.password });
      router.replace('/(onboarding)/business');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear la cuenta.');
    } finally { setLoading(false); }
  }

  const copy = COPY[step - 1];

  return (
    <AuthShell title={copy.title} subtitle={copy.subtitle}>
      <Progress step={step} />
      <Feedback message={error} />

      {step === 1 ? (
        <>
          <FormField label="Correo electrónico" value={form.email} onChangeText={update('email')} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="correo@ejemplo.com" />
          <FormField label="Contraseña" value={form.password} onChangeText={update('password')} secureTextEntry autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
          <FormField label="Confirmar contraseña" value={form.confirmation} onChangeText={update('confirmation')} secureTextEntry autoComplete="new-password" placeholder="Repite tu contraseña" />

          {/* La casilla va en este paso porque desde aquí también se crea la
              cuenta con Google o Apple: al final se la saltarían. */}
          <TermsCheckbox checked={accepted} onToggle={() => setAccepted((current) => !current)} />

          <Button disabled={!accepted} onPress={nextFromAccount}>Continuar</Button>
          {accepted ? (
            <>
              <GoogleAuthButton mode="register" />
              <AppleAuthButton mode="register" />
            </>
          ) : (
            <Text style={{ color: theme.muted, fontSize: 12.5, textAlign: 'center', lineHeight: 18 }}>Acepta los términos para continuar con Google o Apple.</Text>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 5 }}>
            <Text style={{ color: theme.muted }}>¿Ya tienes una cuenta?</Text>
            <Link href="/(auth)/login" style={{ color: theme.text, fontWeight: '800', textDecorationLine: 'underline' }}>Inicia sesión</Link>
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <FormField label="Teléfono" value={form.phone} onChangeText={update('phone')} autoComplete="tel" keyboardType="number-pad" maxLength={10} placeholder="3312345678" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} variant="secondary" onPress={back}>Atrás</Button>
            <Button style={{ flex: 1 }} onPress={nextFromPhone}>Continuar</Button>
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <View style={{ borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface }}>
            {([['Correo', form.email.trim().toLowerCase()], ['Teléfono', form.phone.trim()]] as const).map(([label, value], index) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 15, borderTopWidth: index ? 1 : 0, borderTopColor: theme.border }}>
                <Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>
                <Text numberOfLines={1} style={{ flexShrink: 1, color: theme.text, fontSize: 13.5, fontWeight: '700' }}>{value}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} variant="secondary" onPress={back}>Atrás</Button>
            <Button style={{ flex: 1 }} loading={loading} onPress={submit}>Crear cuenta</Button>
          </View>
        </>
      ) : null}
    </AuthShell>
  );
}

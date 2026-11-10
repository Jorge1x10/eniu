import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppleAuthButton } from '@/components/apple-auth-button';
import { AuthDivider, AuthShell } from '@/components/auth-shell';
import { AuthTabs } from '@/components/auth-tabs';
import { BrandLine } from '@/components/brand-line';
import { GoogleAuthButton } from '@/components/google-auth-button';
import { PasswordField } from '@/components/password-field';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { ArrowRightIcon, MailIcon, ShieldCheckIcon } from '@/components/ui/icons';
import { cardStyle, eniuDark, useEniuTheme } from '@/constants/eniu-theme';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { useAuth } from '@/features/auth/auth-context';
import { ApiError } from '@/lib/api';

const TOTAL_STEPS = 3;

/** Lo que pasa después del alta; se traduce al pintar. */
const NEXT_STEPS = ['Registra tu negocio', 'Arma tu primer menú', 'Publícalo y compártelo'] as const;

/** Agrupa 10 dígitos como "33 1234 5678". Sólo es visual: se guardan los dígitos. */
function formatPhone(digits: string) {
  return [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)].filter(Boolean).join(' ');
}

function errorCode(error: ApiError) {
  const data = error.data as { code?: unknown } | null | undefined;
  return typeof data?.code === 'string' ? data.code : undefined;
}

export default function RegisterScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const { register } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => { setForm((current) => ({ ...current, [key]: value })); setError(''); };

  // Cada paso valida lo suyo antes de dejar avanzar: nadie debería llegar al
  // resumen con un correo inválido escrito dos pantallas atrás.
  function nextFromAccount() {
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setError(t("Ingresa un correo electrónico válido.")); return; }
    if (form.password.length < 8) { setError(t("La contraseña debe tener al menos 8 caracteres.")); return; }
    setError(''); setStep(2);
  }

  function nextFromPhone() {
    if (!/^\d{10}$/.test(form.phone)) { setError(t("El teléfono debe tener 10 dígitos.")); return; }
    setError(''); setStep(3);
  }

  function back() { setError(''); setStep((current) => Math.max(1, current - 1)); }

  function edit(target: 1 | 2) { setError(''); setStep(target); }

  async function submit() {
    setLoading(true); setError('');
    try {
      await register({ email: form.email.trim().toLowerCase(), phone: form.phone, password: form.password });
      router.replace('/(onboarding)/business');
    } catch (requestError) {
      // Un dato repetido se corrige en su paso: se lleva ahí a la persona con
      // el mensaje del backend en vez de dejarla en el resumen sin campo que editar.
      if (requestError instanceof ApiError) {
        const code = errorCode(requestError);
        if (code === 'email_already_exists' || code === 'username_already_exists') setStep(1);
        else if (code === 'phone_already_exists') setStep(2);
      }
      setError(requestError instanceof Error ? requestError.message : t("No fue posible crear la cuenta."));
    } finally { setLoading(false); }
  }

  const arrow = <ArrowRightIcon color={theme.onYellow} size={18} />;

  if (step === 1) {
    return (
      <AuthShell heroSize="md" headline={<>{t("Tu carta digital,")}{'\n'}<Text style={{ color: theme.yellow }}>{t("lista hoy.")}</Text></>}>
        <AuthTabs active="register" />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <AppleAuthButton compact mode="register" style={{ flex: 1 }} />
          <GoogleAuthButton compact mode="register" style={{ flex: 1 }} />
        </View>

        <AuthDivider />

        <FormField
          label={t("Correo electrónico")}
          value={form.email}
          onChangeText={update('email')}
          icon={<MailIcon color={theme.muted} size={18} />}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          placeholder={t("correo@ejemplo.com")}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <PasswordField
          ref={passwordRef}
          label={t("Crea una contraseña")}
          value={form.password}
          onChangeText={update('password')}
          placeholder={t("Mínimo 8 caracteres")}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={nextFromAccount}
          showStrength
        />

        <Feedback message={error} />

        <Button size="lg" onPress={nextFromAccount} trailingIcon={arrow}>{t("Continuar")}</Button>

        {/* Sin casilla: el backend ya registra `terms_accepted_at` al crear la
            cuenta por correo, Google o Apple, así que la aceptación implícita al
            continuar coincide con lo que se guarda. */}
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
          {t("Al continuar aceptas los")}{' '}
          <Text accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} style={{ color: theme.text, fontWeight: '600' }}>{t("Términos")}</Text>
          {' '}{t("y el")}{' '}
          <Text accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={{ color: theme.text, fontWeight: '600' }}>{t("Aviso de privacidad")}</Text>
          .
        </Text>
      </AuthShell>
    );
  }

  if (step === 2) {
    return (
      <AuthShell
        variant="compact"
        step={{ current: 2, total: TOTAL_STEPS }}
        onBack={back}
        title={t("¿A qué número te contactamos?")}
        subtitle={t("Lo usamos para identificar tu cuenta y avisarte si algo pasa con tu menú.")}
      >
        <FormField
          label={t("Teléfono celular")}
          value={formatPhone(form.phone)}
          onChangeText={(value) => update('phone')(value.replace(/\D/g, '').slice(0, 10))}
          fieldHeight={56}
          prefix={(
            // No es interactivo por ahora: sólo México.
            <View accessible accessibilityLabel={t("México, +52")}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>MX +52</Text>
            </View>
          )}
          keyboardType="number-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="33 1234 5678"
          hint={t("10 dígitos, sin espacios ni guiones.")}
          returnKeyType="next"
          onSubmitEditing={nextFromPhone}
        />

        <Feedback message={error} />

        <View style={{ ...cardStyle(theme, 16), flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow }}>
            <ShieldCheckIcon color={theme.onYellow} size={18} />
          </View>
          <Text style={{ flex: 1, color: theme.text, fontSize: 13, lineHeight: 19 }}>{t("No compartimos tu número ni te enviaremos publicidad por SMS.")}</Text>
        </View>

        <View style={{ flex: 1 }} />

        <Button size="lg" onPress={nextFromPhone} trailingIcon={arrow}>{t("Continuar")}</Button>
      </AuthShell>
    );
  }

  const summary = [
    { label: t("Correo"), value: form.email.trim().toLowerCase(), editLabel: t("Editar correo"), target: 1 as const },
    { label: t("Teléfono"), value: `+52 ${formatPhone(form.phone)}`, editLabel: t("Editar teléfono"), target: 2 as const },
  ];

  return (
    <AuthShell
      variant="compact"
      step={{ current: 3, total: TOTAL_STEPS }}
      onBack={back}
      title={t("Todo listo para empezar")}
      subtitle={t("Revisa tus datos antes de crear la cuenta.")}
    >
      {/* Oscura en los dos modos, como el encabezado: el texto siempre es claro. */}
      <View style={{ backgroundColor: theme.authHero, borderRadius: 22, borderCurve: 'continuous', paddingHorizontal: 18, overflow: 'hidden' }}>
        <BrandLine color={theme.yellow} width={150} height={140} withTail={false} style={{ position: 'absolute', right: -40, bottom: -58, opacity: 0.9 }} />
        {summary.map((row, index) => (
          <View key={row.target} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: index ? 1 : 0, borderTopColor: 'rgba(251,247,236,0.12)' }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: eniuDark.muted, fontSize: 12 }}>{row.label}</Text>
              <Text numberOfLines={1} style={{ color: eniuDark.text, fontSize: 16, fontWeight: '700' }}>{row.value}</Text>
            </View>
            {/* `marginRight`: el trazo ocupa los últimos ~50 pt de la esquina
                inferior derecha; sin este margen "Editar" del teléfono queda
                encima de la línea amarilla y no se lee. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={row.editLabel}
              onPress={() => edit(row.target)}
              style={({ pressed }) => ({ minHeight: 44, minWidth: 44, marginRight: 38, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={{ color: theme.yellow, fontSize: 14, fontWeight: '700' }}>{t("Editar")}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={{ gap: 12, marginTop: 8 }}>
        <Text accessibilityRole="header" style={{ color: theme.muted, fontSize: 13, fontWeight: '700' }}>{t("Después de crear tu cuenta")}</Text>
        {NEXT_STEPS.map((label, index) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>{index + 1}</Text>
            </View>
            <Text style={{ flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' }}>{t(label)}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <Feedback message={error} />

      <Button size="lg" loading={loading} onPress={submit} trailingIcon={arrow}>{t("Crear mi cuenta")}</Button>
    </AuthShell>
  );
}

import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import Constants from 'expo-constants';
import { router } from 'expo-router';

import { BusinessPhotoField } from '@/components/business-photo';
import { BusinessSwitcher } from '@/components/business-switcher';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { PRIVACY_URL, SUPPORT_URL, TERMS_URL } from '@/constants/legal';
import { useScreenTopPadding } from '@/constants/layout';
import { useAuth } from '@/features/auth/auth-context';
import { useBusiness } from '@/features/business/business-context';
import { useLanguage } from '@/i18n/language-context';
import { getMilestoneNotificationsEnabled, setMilestoneNotificationsEnabled } from '@/features/milestones/milestone-store';
import { api } from '@/lib/api';
import type { Business, User } from '@/types/models';
import { useTranslation } from 'react-i18next';

function LinkRow({ label, url }: { label: string; url: string }) {
  const theme = useEniuTheme();
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(url)} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5, textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}

function Section({ label, children }: React.PropsWithChildren<{ label: string }>) {
  const theme = useEniuTheme();
  return <View style={{ gap: 11 }}><Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</Text><View style={{ padding: 18, gap: 14, borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>{children}</View></View>;
}

const LANGUAGE_OPTIONS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const;

export default function SettingsScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const topPadding = useScreenTopPadding();
  const { user, setUser, logout } = useAuth();
  const { selectedBusiness, updateBusiness } = useBusiness();
  const { language, changeLanguage, isSaving: isSavingLanguage } = useLanguage();
  const [profile, setProfile] = useState({ name: user?.name || '', username: user?.username || '', phone_number: user?.phone_number || '' });
  const [business, setBusiness] = useState(() => selectedBusiness ? { name: selectedBusiness.name, description: selectedBusiness.description || '', phone: selectedBusiness.phone || '', whatsapp: selectedBusiness.whatsapp || '', address: selectedBusiness.address || '', currency: selectedBusiness.currency || 'MXN' } : null);
  const [saving, setSaving] = useState<'profile' | 'business' | null>(null); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [milestoneNotifications, setMilestoneNotifications] = useState(true);
  const [deleteValue, setDeleteValue] = useState(''); const [deleting, setDeleting] = useState(false);
  // Con contraseña se pide la contraseña; quien entró con Google o Apple no
  // tiene ninguna, y exigírsela lo dejaría sin poder borrar su cuenta.
  const hasPassword = Boolean(user?.auth_methods?.password);
  const canDelete = hasPassword ? deleteValue.length > 0 : deleteValue.trim().toUpperCase() === 'ELIMINAR';
  const updateProfile = (key: keyof typeof profile) => (value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const updateBusinessField = (key: keyof NonNullable<typeof business>) => (value: string) => setBusiness((current) => current ? ({ ...current, [key]: value }) : current);

  useEffect(() => {
    const task = setTimeout(() => setBusiness(selectedBusiness ? { name: selectedBusiness.name, description: selectedBusiness.description || '', phone: selectedBusiness.phone || '', whatsapp: selectedBusiness.whatsapp || '', address: selectedBusiness.address || '', currency: selectedBusiness.currency || 'MXN' } : null), 0);
    return () => clearTimeout(task);
  }, [selectedBusiness]);
  useEffect(() => { getMilestoneNotificationsEnabled().then(setMilestoneNotifications); }, []);

  async function saveProfile() {
    setSaving('profile'); setError(''); setSuccess('');
    try { const data = await api.patch<{ user: User }>('users/me', { name: profile.name.trim(), username: profile.username.trim(), phone_number: profile.phone_number.trim() }); setUser(data.user); setSuccess(t("Tu perfil se actualizó correctamente.")); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar el perfil.")); }
    finally { setSaving(null); }
  }
  async function saveBusiness() {
    if (!selectedBusiness || !business) return;
    setSaving('business'); setError(''); setSuccess('');
    try { const data = await api.patch<{ business: Business }>(`businesses/${selectedBusiness.id}`, { ...business, name: business.name.trim(), currency: business.currency.trim().toUpperCase() }); updateBusiness(data.business); setSuccess(t("Los datos del negocio se actualizaron correctamente.")); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar el negocio.")); }
    finally { setSaving(null); }
  }
  async function toggleMilestoneNotifications(value: boolean) { setMilestoneNotifications(value); await setMilestoneNotificationsEnabled(value); }

  function confirmDelete() {
    if (!canDelete || deleting) return;
    Alert.alert(
      t("Eliminar tu cuenta"),
      t("Se eliminan tus negocios, menús, productos y fotos, y tus menús publicados dejan de estar disponibles. Si tienes una suscripción activa se cancela. No se puede deshacer."),
      [{ text: t("Cancelar"), style: 'cancel' }, { text: t("Eliminar"), style: 'destructive', onPress: deleteAccount }],
    );
  }

  async function deleteAccount() {
    setDeleting(true); setError(''); setSuccess('');
    try {
      await api.delete('users/me', hasPassword ? { password: deleteValue } : { confirmation: deleteValue });
      await logout();
    } catch (requestError) {
      setDeleting(false);
      setError(requestError instanceof Error ? requestError.message : t("No fue posible eliminar la cuenta."));
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 18, paddingTop: topPadding, paddingBottom: 120, gap: 20 }}>
      <Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>{t("Ajustes")}</Text>
      <Feedback message={error} /><Feedback message={success} tone="success" />

      <View style={{ borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow, flexShrink: 0 }}><Text style={{ color: '#111111', fontSize: 22, fontWeight: '900' }}>{(user?.name || user?.username || 'E').charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{user?.name || user?.username}</Text>
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12.5 }}>{user?.email}</Text>
        </View>
      </View>

      <Section label={t("Mi plan")}>
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5 }}>{user?.plan?.name || t("Plan gratuito")}</Text>
          {user?.plan?.has_access ? <Text style={{ color: theme.muted, fontSize: 12.5 }}>{t("Activo")}</Text> : null}
        </View>
        {user?.plan?.has_access
          ? <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 18 }}>{t("Administra o cancela tu suscripción desde los ajustes de suscripciones de tu dispositivo.")}</Text>
          : <Button onPress={() => router.push('/paywall')}>{t("Ver planes")}</Button>}
      </Section>

      <Section label={t("Mi perfil")}><FormField label={t("Nombre visible")} value={profile.name} onChangeText={updateProfile('name')} /><FormField label={t("Nombre de usuario")} value={profile.username} onChangeText={updateProfile('username')} autoCapitalize="none" /><FormField label={t("Teléfono")} value={profile.phone_number} onChangeText={updateProfile('phone_number')} keyboardType="phone-pad" /><FormField label={t("Correo electrónico")} value={user?.email || ''} editable={false} /><Button loading={saving === 'profile'} onPress={saveProfile}>{t("Guardar perfil")}</Button></Section>

      <Section label={t("Mi negocio")}><BusinessSwitcher />{business ? <><BusinessPhotoField onError={setError} /><FormField label={t("Nombre")} value={business.name} onChangeText={updateBusinessField('name')} /><FormField label={t("Descripción")} value={business.description} onChangeText={updateBusinessField('description')} multiline /><FormField label={t("Teléfono")} value={business.phone} onChangeText={updateBusinessField('phone')} keyboardType="phone-pad" /><FormField label={t("WhatsApp")} value={business.whatsapp} onChangeText={updateBusinessField('whatsapp')} keyboardType="phone-pad" /><FormField label={t("Dirección")} value={business.address} onChangeText={updateBusinessField('address')} /><FormField label={t("Moneda")} value={business.currency} onChangeText={updateBusinessField('currency')} autoCapitalize="characters" maxLength={3} /><Button loading={saving === 'business'} onPress={saveBusiness}>{t("Guardar negocio")}</Button></> : <Text style={{ color: theme.muted }}>{t("Crea un negocio desde Inicio para configurarlo.")}</Text>}</Section>

      <Section label={t("Aplicación")}>
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5 }}>{t("Apariencia")}</Text><Text style={{ color: theme.muted, fontSize: 12.5 }}>{t("Automática")}</Text></View>
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}><Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5 }}>{t("Avisos de logros")}</Text><Text style={{ color: theme.muted, fontSize: 11.5 }}>{t("Cuando alcances una meta de vistas")}</Text></View>
          <Switch value={milestoneNotifications} onValueChange={toggleMilestoneNotifications} trackColor={{ true: theme.yellowPressed }} />
        </View>
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5 }}>{t("Idioma")}</Text>
            <Text style={{ color: theme.muted, fontSize: 11.5 }}>{t("En toda la app y en los correos")}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, backgroundColor: theme.surfaceAlt, borderRadius: 11, borderCurve: 'continuous', padding: 3 }}>
            {LANGUAGE_OPTIONS.map((option) => {
              const on = option.code === language;
              return (
                <Pressable
                  key={option.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: isSavingLanguage }}
                  disabled={isSavingLanguage}
                  onPress={() => void changeLanguage(option.code)}
                  style={({ pressed }) => ({ minHeight: 34, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderCurve: 'continuous', backgroundColor: on ? theme.yellow : 'transparent', opacity: pressed || isSavingLanguage ? 0.7 : 1 })}
                >
                  <Text style={{ color: on ? theme.onYellow : theme.muted, fontSize: 12.5, fontWeight: '800' }}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <LinkRow label={t("Ayuda y soporte")} url={SUPPORT_URL} />
        <LinkRow label={t("Términos y condiciones")} url={TERMS_URL} />
        <LinkRow label={t("Aviso de privacidad")} url={PRIVACY_URL} />
        {/* La versión es lo primero que se pide al reportar un fallo, y quien
            lo reporta no tiene otro sitio donde consultarla. */}
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: theme.muted, fontWeight: '700', fontSize: 12.5 }}>{t("Versión")}</Text><Text style={{ color: theme.muted, fontSize: 12.5 }}>{Constants.expoConfig?.version ?? '—'}</Text></View>
      </Section>

      <Button variant="danger" onPress={() => Alert.alert(t("Cerrar sesión"), t("¿Quieres salir de Eniu en este dispositivo?"), [{ text: t("Cancelar"), style: 'cancel' }, { text: t("Cerrar sesión"), style: 'destructive', onPress: logout }])}>{t("Cerrar sesión")}</Button>

      <Section label={t("Eliminar cuenta")}>
        <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 18 }}>{t("Se eliminan tus negocios, menús, productos y fotos, y tus menús publicados dejan de estar disponibles. Si tienes una suscripción activa se cancela antes de borrar nada. No se puede deshacer.")}</Text>
        {hasPassword
          ? <FormField label={t("Confirma con tu contraseña")} value={deleteValue} onChangeText={setDeleteValue} secureTextEntry autoComplete="current-password" placeholder={t("Tu contraseña")} />
          : <FormField label={t("Escribe ELIMINAR para confirmar")} value={deleteValue} onChangeText={setDeleteValue} autoCapitalize="characters" placeholder="ELIMINAR" />}
        <Button variant="danger" loading={deleting} disabled={!canDelete} onPress={confirmDelete}>{t("Eliminar mi cuenta")}</Button>
      </Section>
    </ScrollView>
  );
}

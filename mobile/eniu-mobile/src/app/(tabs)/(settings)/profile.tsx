import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/lib/api';
import type { User } from '@/types/models';

/** Perfil: los mismos campos que antes estaban en Ajustes, y eliminar la cuenta al final. */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const { user, setUser, logout } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', username: user?.username || '', phone_number: user?.phone_number || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteValue, setDeleteValue] = useState('');
  const [deleting, setDeleting] = useState(false);
  // Con contraseña se pide la contraseña; quien entró con Google o Apple no
  // tiene ninguna, y exigírsela lo dejaría sin poder borrar su cuenta.
  const hasPassword = Boolean(user?.auth_methods?.password);
  const canDelete = hasPassword ? deleteValue.length > 0 : deleteValue.trim().toUpperCase() === 'ELIMINAR';
  const update = (key: keyof typeof profile) => (value: string) => { setProfile((current) => ({ ...current, [key]: value })); setSuccess(''); };

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      const data = await api.patch<{ user: User }>('users/me', { name: profile.name.trim(), username: profile.username.trim(), phone_number: profile.phone_number.trim() });
      setUser(data.user);
      setSuccess(t("Tu perfil se actualizó correctamente."));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar el perfil.")); }
    finally { setSaving(false); }
  }

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
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}>
      <ScreenHeader title={t("Perfil")} />
      <View style={{ ...cardStyle(theme, 22), padding: 18, gap: 14 }}>
        <FormField label={t("Nombre visible")} value={profile.name} onChangeText={update('name')} />
        <FormField label={t("Nombre de usuario")} value={profile.username} onChangeText={update('username')} autoCapitalize="none" />
        <FormField label={t("Teléfono")} value={profile.phone_number} onChangeText={update('phone_number')} keyboardType="phone-pad" />
        <FormField label={t("Correo electrónico")} value={user?.email || ''} editable={false} />
      </View>
      <Feedback message={error} /><Feedback message={success} tone="success" />
      <Button size="lg" loading={saving} onPress={save}>{t("Guardar perfil")}</Button>

      <View style={{ ...cardStyle(theme, 22), padding: 18, gap: 12, marginTop: 16 }}>
        <Text accessibilityRole="header" style={{ color: theme.danger, fontSize: 17, fontWeight: '800' }}>{t("Eliminar cuenta")}</Text>
        <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>{t("Se eliminan tus negocios, menús, productos y fotos, y tus menús publicados dejan de estar disponibles. Si tienes una suscripción activa se cancela antes de borrar nada. No se puede deshacer.")}</Text>
        {hasPassword
          ? <FormField label={t("Confirma con tu contraseña")} value={deleteValue} onChangeText={setDeleteValue} secureTextEntry autoComplete="current-password" placeholder={t("Tu contraseña")} />
          : <FormField label={t("Escribe ELIMINAR para confirmar")} value={deleteValue} onChangeText={setDeleteValue} autoCapitalize="characters" placeholder="ELIMINAR" />}
        <Button variant="danger" loading={deleting} disabled={!canDelete} onPress={confirmDelete}>{t("Eliminar mi cuenta")}</Button>
      </View>
    </ScrollView>
  );
}

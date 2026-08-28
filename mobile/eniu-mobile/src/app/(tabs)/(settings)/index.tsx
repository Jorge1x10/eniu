import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { BusinessPhotoField } from '@/components/business-photo';
import { BusinessSwitcher } from '@/components/business-switcher';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useScreenTopPadding } from '@/constants/layout';
import { useAuth } from '@/features/auth/auth-context';
import { useBusiness } from '@/features/business/business-context';
import { getMilestoneNotificationsEnabled, setMilestoneNotificationsEnabled } from '@/features/milestones/milestone-store';
import { api } from '@/lib/api';
import type { Business, User } from '@/types/models';

function Section({ label, children }: React.PropsWithChildren<{ label: string }>) {
  const theme = useEniuTheme();
  return <View style={{ gap: 11 }}><Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</Text><View style={{ padding: 18, gap: 14, borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>{children}</View></View>;
}

// El aviso vive en el panel web, que es la URL pública que pide App Store Connect.
const PRIVACY_URL = 'https://eniu.vercel.app/privacidad';

export default function SettingsScreen() {
  const theme = useEniuTheme();
  const topPadding = useScreenTopPadding();
  const { user, setUser, logout } = useAuth();
  const { selectedBusiness, updateBusiness } = useBusiness();
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
    try { const data = await api.patch<{ user: User }>('users/me', { name: profile.name.trim(), username: profile.username.trim(), phone_number: profile.phone_number.trim() }); setUser(data.user); setSuccess('Tu perfil se actualizó correctamente.'); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar el perfil.'); }
    finally { setSaving(null); }
  }
  async function saveBusiness() {
    if (!selectedBusiness || !business) return;
    setSaving('business'); setError(''); setSuccess('');
    try { const data = await api.patch<{ business: Business }>(`businesses/${selectedBusiness.id}`, { ...business, name: business.name.trim(), currency: business.currency.trim().toUpperCase() }); updateBusiness(data.business); setSuccess('Los datos del negocio se actualizaron correctamente.'); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar el negocio.'); }
    finally { setSaving(null); }
  }
  async function toggleMilestoneNotifications(value: boolean) { setMilestoneNotifications(value); await setMilestoneNotificationsEnabled(value); }

  function confirmDelete() {
    if (!canDelete || deleting) return;
    Alert.alert(
      'Eliminar tu cuenta',
      'Se eliminan tus negocios, menús, productos y fotos, y tus menús publicados dejan de estar disponibles. Si tienes una suscripción activa se cancela. No se puede deshacer.',
      [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: deleteAccount }],
    );
  }

  async function deleteAccount() {
    setDeleting(true); setError(''); setSuccess('');
    try {
      await api.delete('users/me', hasPassword ? { password: deleteValue } : { confirmation: deleteValue });
      await logout();
    } catch (requestError) {
      setDeleting(false);
      setError(requestError instanceof Error ? requestError.message : 'No fue posible eliminar la cuenta.');
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 18, paddingTop: topPadding, paddingBottom: 120, gap: 20 }}>
      <Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>Ajustes</Text>
      <Feedback message={error} /><Feedback message={success} tone="success" />

      <View style={{ borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow, flexShrink: 0 }}><Text style={{ color: '#111111', fontSize: 22, fontWeight: '900' }}>{(user?.name || user?.username || 'E').charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{user?.name || user?.username}</Text>
          <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 12.5 }}>{user?.email}</Text>
        </View>
      </View>

      <Section label="Mi perfil"><FormField label="Nombre visible" value={profile.name} onChangeText={updateProfile('name')} /><FormField label="Nombre de usuario" value={profile.username} onChangeText={updateProfile('username')} autoCapitalize="none" /><FormField label="Teléfono" value={profile.phone_number} onChangeText={updateProfile('phone_number')} keyboardType="phone-pad" /><FormField label="Correo electrónico" value={user?.email || ''} editable={false} /><Button loading={saving === 'profile'} onPress={saveProfile}>Guardar perfil</Button></Section>

      <Section label="Mi negocio"><BusinessSwitcher />{business ? <><BusinessPhotoField onError={setError} /><FormField label="Nombre" value={business.name} onChangeText={updateBusinessField('name')} /><FormField label="Descripción" value={business.description} onChangeText={updateBusinessField('description')} multiline /><FormField label="Teléfono" value={business.phone} onChangeText={updateBusinessField('phone')} keyboardType="phone-pad" /><FormField label="WhatsApp" value={business.whatsapp} onChangeText={updateBusinessField('whatsapp')} keyboardType="phone-pad" /><FormField label="Dirección" value={business.address} onChangeText={updateBusinessField('address')} /><FormField label="Moneda" value={business.currency} onChangeText={updateBusinessField('currency')} autoCapitalize="characters" maxLength={3} /><Button loading={saving === 'business'} onPress={saveBusiness}>Guardar negocio</Button></> : <Text style={{ color: theme.muted }}>Crea un negocio desde Inicio para configurarlo.</Text>}</Section>

      <Section label="Aplicación">
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5 }}>Apariencia</Text><Text style={{ color: theme.muted, fontSize: 12.5 }}>Automática</Text></View>
        <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}><Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5 }}>Avisos de logros</Text><Text style={{ color: theme.muted, fontSize: 11.5 }}>Cuando alcances una meta de vistas</Text></View>
          <Switch value={milestoneNotifications} onValueChange={toggleMilestoneNotifications} trackColor={{ true: theme.yellowPressed }} />
        </View>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14.5, textDecorationLine: 'underline' }}>Aviso de privacidad</Text>
        </Pressable>
      </Section>

      <Button variant="danger" onPress={() => Alert.alert('Cerrar sesión', '¿Quieres salir de Eniu en este dispositivo?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cerrar sesión', style: 'destructive', onPress: logout }])}>Cerrar sesión</Button>

      <Section label="Eliminar cuenta">
        <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 18 }}>Se eliminan tus negocios, menús, productos y fotos, y tus menús publicados dejan de estar disponibles. Si tienes una suscripción activa se cancela antes de borrar nada. No se puede deshacer.</Text>
        {hasPassword
          ? <FormField label="Confirma con tu contraseña" value={deleteValue} onChangeText={setDeleteValue} secureTextEntry autoComplete="current-password" placeholder="Tu contraseña" />
          : <FormField label="Escribe ELIMINAR para confirmar" value={deleteValue} onChangeText={setDeleteValue} autoCapitalize="characters" placeholder="ELIMINAR" />}
        <Button variant="danger" loading={deleting} disabled={!canDelete} onPress={confirmDelete}>Eliminar mi cuenta</Button>
      </Section>
    </ScrollView>
  );
}

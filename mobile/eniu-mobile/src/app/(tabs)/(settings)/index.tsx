import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { BusinessSwitcher } from '@/components/business-switcher';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useAuth } from '@/features/auth/auth-context';
import { useBusiness } from '@/features/business/business-context';
import { API_URL, api } from '@/lib/api';
import type { Business, User } from '@/types/models';

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  const theme = useEniuTheme();
  return <View style={{ padding: 19, gap: 14, borderRadius: 22, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>{children}</View>;
}

export default function SettingsScreen() {
  const theme = useEniuTheme();
  const { user, setUser, logout } = useAuth();
  const { selectedBusiness, updateBusiness } = useBusiness();
  const [profile, setProfile] = useState({ name: user?.name || '', username: user?.username || '', phone_number: user?.phone_number || '' });
  const [business, setBusiness] = useState(() => selectedBusiness ? { name: selectedBusiness.name, description: selectedBusiness.description || '', phone: selectedBusiness.phone || '', whatsapp: selectedBusiness.whatsapp || '', address: selectedBusiness.address || '', currency: selectedBusiness.currency || 'MXN' } : null);
  const [saving, setSaving] = useState<'profile' | 'business' | null>(null); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const updateProfile = (key: keyof typeof profile) => (value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const updateBusinessField = (key: keyof NonNullable<typeof business>) => (value: string) => setBusiness((current) => current ? ({ ...current, [key]: value }) : current);

  useEffect(() => {
    const task = setTimeout(() => setBusiness(selectedBusiness ? { name: selectedBusiness.name, description: selectedBusiness.description || '', phone: selectedBusiness.phone || '', whatsapp: selectedBusiness.whatsapp || '', address: selectedBusiness.address || '', currency: selectedBusiness.currency || 'MXN' } : null), 0);
    return () => clearTimeout(task);
  }, [selectedBusiness]);

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

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 18, backgroundColor: theme.background }}>
      <Feedback message={error} /><Feedback message={success} tone="success" />
      <Section title="Mi perfil"><View style={{ width: 54, height: 54, borderRadius: 18, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.yellow }}><Text style={{ color: '#111111', fontSize: 22, fontWeight: '900' }}>{(user?.name || user?.username || 'E').charAt(0).toUpperCase()}</Text></View><FormField label="Nombre visible" value={profile.name} onChangeText={updateProfile('name')} /><FormField label="Nombre de usuario" value={profile.username} onChangeText={updateProfile('username')} autoCapitalize="none" /><FormField label="Teléfono" value={profile.phone_number} onChangeText={updateProfile('phone_number')} keyboardType="phone-pad" /><FormField label="Correo electrónico" value={user?.email || ''} editable={false} /><Button loading={saving === 'profile'} onPress={saveProfile}>Guardar perfil</Button></Section>
      <Section title="Mi negocio"><BusinessSwitcher />{business ? <><FormField label="Nombre" value={business.name} onChangeText={updateBusinessField('name')} /><FormField label="Descripción" value={business.description} onChangeText={updateBusinessField('description')} multiline /><FormField label="Teléfono" value={business.phone} onChangeText={updateBusinessField('phone')} keyboardType="phone-pad" /><FormField label="WhatsApp" value={business.whatsapp} onChangeText={updateBusinessField('whatsapp')} keyboardType="phone-pad" /><FormField label="Dirección" value={business.address} onChangeText={updateBusinessField('address')} /><FormField label="Moneda" value={business.currency} onChangeText={updateBusinessField('currency')} autoCapitalize="characters" maxLength={3} /><Button loading={saving === 'business'} onPress={saveBusiness}>Guardar negocio</Button></> : <Text style={{ color: theme.muted }}>Crea un negocio desde Inicio para configurarlo.</Text>}</Section>
      <Section title="Aplicación"><Text selectable style={{ color: theme.muted, lineHeight: 20 }}>La apariencia sigue automáticamente el modo claro u oscuro del dispositivo.</Text><Text selectable style={{ color: theme.muted, fontSize: 12 }}>API: {API_URL}</Text></Section>
      <Button variant="danger" onPress={() => Alert.alert('Cerrar sesión', '¿Quieres salir de Eniu en este dispositivo?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Cerrar sesión', style: 'destructive', onPress: logout }])}>Cerrar sesión</Button>
    </ScrollView>
  );
}

import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BusinessPhotoField } from '@/components/business-photo';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { EmptyState } from '@/components/ui/screen-state';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api } from '@/lib/api';
import type { Business } from '@/types/models';

/** Límite real del backend (`business/services.py`). */
const DESCRIPTION_LIMIT = 2000;

function formFrom(business: Business | null) {
  return business ? { name: business.name, description: business.description || '', phone: business.phone || '', whatsapp: business.whatsapp || '', address: business.address || '' } : null;
}

export default function BusinessSettingsScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const insets = useSafeAreaInsets();
  const { selectedBusiness, updateBusiness } = useBusiness();
  const [form, setForm] = useState(() => formFrom(selectedBusiness));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const task = setTimeout(() => setForm(formFrom(selectedBusiness)), 0);
    return () => clearTimeout(task);
  }, [selectedBusiness]);

  const update = (key: keyof NonNullable<typeof form>) => (value: string) => { setForm((current) => current ? { ...current, [key]: value } : current); setSuccess(''); };

  async function save() {
    if (!selectedBusiness || !form) return;
    if (!form.name.trim()) { setError(t("Escribe el nombre de tu negocio.")); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const data = await api.patch<{ business: Business }>(`businesses/${selectedBusiness.id}`, { ...form, name: form.name.trim() });
      updateBusiness(data.business);
      setSuccess(t("Los datos del negocio se actualizaron correctamente."));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar el negocio.")); }
    finally { setSaving(false); }
  }

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}>
        <ScreenHeader title={t("Mi negocio")} />
        {!form ? <EmptyState title={t("Sin negocio")} description={t("Crea un negocio desde Inicio para configurarlo.")} /> : (
          <>
            <BusinessPhotoField compact onError={setError} />
            <View style={{ ...cardStyle(theme, 22), padding: 18, gap: 14 }}>
              <FormField label={t("Nombre")} value={form.name} onChangeText={update('name')} maxLength={64} />
              <View style={{ gap: 6 }}>
                <FormField label={t("Descripción")} value={form.description} onChangeText={update('description')} multiline maxLength={DESCRIPTION_LIMIT} />
                <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{form.description.length}/{DESCRIPTION_LIMIT}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><FormField label={t("Teléfono")} value={form.phone} onChangeText={update('phone')} keyboardType="phone-pad" maxLength={20} /></View>
                <View style={{ flex: 1 }}><FormField label={t("WhatsApp")} value={form.whatsapp} onChangeText={update('whatsapp')} keyboardType="phone-pad" maxLength={20} /></View>
              </View>
              <FormField label={t("Dirección")} value={form.address} onChangeText={update('address')} />
            </View>
            <Feedback message={error} /><Feedback message={success} tone="success" />
          </>
        )}
      </ScrollView>
      {form ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border }}>
          <Button size="lg" loading={saving} onPress={save}>{t("Guardar cambios")}</Button>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

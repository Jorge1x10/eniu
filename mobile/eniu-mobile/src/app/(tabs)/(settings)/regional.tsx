import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { ChoiceField } from '@/components/ui/choice-field';
import { Feedback } from '@/components/ui/feedback';
import { EmptyState } from '@/components/ui/screen-state';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { currentLocale } from '@/i18n/formats';
import { deviceTimezone } from '@/lib/analytics-range';
import { api } from '@/lib/api';
import { currencyChoices, timezoneChoices } from '@/lib/regions';
import type { Business } from '@/types/models';

/** Moneda y zona horaria del negocio, con los buscadores que ya existían. */
export default function RegionalScreen() {
  const { t } = useTranslation();
  const theme = useEniuTheme();
  const { selectedBusiness, updateBusiness } = useBusiness();
  const [currency, setCurrency] = useState(selectedBusiness?.currency || 'MXN');
  const [timezone, setTimezone] = useState(selectedBusiness?.timezone || deviceTimezone());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const locale = currentLocale();
  const currencies = useMemo(() => currencyChoices(locale), [locale]);
  const timezones = useMemo(() => timezoneChoices(), []);

  useEffect(() => {
    const task = setTimeout(() => {
      setCurrency(selectedBusiness?.currency || 'MXN');
      setTimezone(selectedBusiness?.timezone || deviceTimezone());
    }, 0);
    return () => clearTimeout(task);
  }, [selectedBusiness]);

  async function save() {
    if (!selectedBusiness) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const data = await api.patch<{ business: Business }>(`businesses/${selectedBusiness.id}`, { currency: currency.trim().toUpperCase(), timezone });
      updateBusiness(data.business);
      setSuccess(t("Los datos del negocio se actualizaron correctamente."));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar el negocio.")); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}>
      <ScreenHeader title={t("Moneda y horario")} />
      {!selectedBusiness ? <EmptyState title={t("Sin negocio")} description={t("Crea un negocio desde Inicio para configurarlo.")} /> : (
        <>
          <View style={{ ...cardStyle(theme, 22), padding: 18, gap: 16 }}>
            <ChoiceField label={t("Moneda")} hint={t("En esta moneda ven los precios tus clientes.")} value={currency} options={currencies} searchLabel={t("Buscar moneda")} onChange={(value) => { setCurrency(value); setSuccess(''); }} />
            <ChoiceField label={t("Zona horaria")} hint={t("Decide dónde empieza y termina el día en tus analíticas.")} value={timezone} options={timezones} searchLabel={t("Buscar zona horaria")} onChange={(value) => { setTimezone(value); setSuccess(''); }} />
          </View>
          <Feedback message={error} /><Feedback message={success} tone="success" />
          <Button size="lg" loading={saving} onPress={save}>{t("Guardar cambios")}</Button>
        </>
      )}
    </ScrollView>
  );
}

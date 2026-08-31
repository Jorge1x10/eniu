import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { BusinessSwitcher } from '@/components/business-switcher';
import { CatalogueCard } from '@/components/catalogue-card';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { PlusIcon } from '@/components/ui/icons';
import { PlanNotice } from '@/components/ui/plan-notice';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useScreenTopPadding } from '@/constants/layout';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Catalogue } from '@/types/models';
import { useTranslation } from 'react-i18next';

export default function MenusScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const topPadding = useScreenTopPadding();
  const queryClient = useQueryClient();
  const { selectedBusiness } = useBusiness();
  const { limits, isWithin } = usePlan();
  const query = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!selectedBusiness || !name.trim()) { setError(t("Escribe el nombre del menú.")); return; }
    setSaving(true); setError('');
    try {
      const data = await api.post<{ catalogue: Catalogue }>(`businesses/${selectedBusiness.id}/catalogues`, { name: name.trim(), description: description.trim() });
      queryClient.setQueryData<{ catalogues: Catalogue[] }>(catalogueKeys.all(selectedBusiness.id), (current) => ({ catalogues: [...(current?.catalogues ?? []), data.catalogue] }));
      setName(''); setDescription(''); setCreating(false);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible crear el menú.")); }
    finally { setSaving(false); }
  }

  const menus = query.data?.catalogues ?? [];
  const atMenuLimit = !isWithin(menus.length, limits.max_catalogues_per_business);
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 18, paddingTop: topPadding, paddingBottom: 120, gap: 18 }}>
      <View style={{ gap: 5 }}>
        <Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>{t("Menús")}</Text>
        <Text style={{ color: theme.muted, lineHeight: 20 }}>{t("Administra los menús que compartes con tus clientes.")}</Text>
      </View>
      <Divider />
      <BusinessSwitcher />
      <Divider />
      {!selectedBusiness ? <EmptyState title={t("Primero crea un negocio")} description={t("Ve a Inicio para crear el negocio que contendrá tus menús.")} /> : <>
        {creating ? <View style={{ padding: 18, gap: 14, borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{t("Nuevo menú")}</Text><FormField label={t("Nombre")} value={name} onChangeText={setName} maxLength={64} placeholder={t("Menú principal")} /><FormField label={t("Descripción")} value={description} onChangeText={setDescription} multiline placeholder={t("Nuestro menú general")} /><Feedback message={error} /><View style={{ flexDirection: 'row', gap: 10 }}><Button style={{ flex: 1 }} onPress={create} loading={saving}>{t("Guardar menú")}</Button><Button style={{ flex: 1 }} variant="secondary" onPress={() => { setCreating(false); setError(''); }}>{t("Cancelar")}</Button></View></View> : null}
        {query.isLoading ? <LoadingState label={t("Cargando menús…")} /> : query.isError ? <ErrorState message={t("No pudimos cargar tus menús.")} error={query.error} onRetry={() => query.refetch()} /> : menus.length ? <View style={{ gap: 12 }}>
          {menus.map((menu, index) => <Animated.View key={menu.id} entering={FadeInDown.duration(300).delay(index * 70)} layout={LinearTransition.duration(200)}><CatalogueCard catalogue={menu} /></Animated.View>)}
          {atMenuLimit ? <PlanNotice message={`Tu plan actual permite ${limits.max_catalogues_per_business === 1 ? t("un menú") : `${limits.max_catalogues_per_business} menús`} por negocio.`} /> : null}
          {!creating && !atMenuLimit ? <Pressable onPress={() => setCreating(true)} style={({ pressed }) => ({ borderRadius: 20, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.yellowPressed, padding: 20, alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' }}><PlusIcon color="#111111" size={18} /></View>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{t("Crear otro menú")}</Text>
            <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 230 }}>{t("Uno para comidas, otro para bebidas o para temporada.")}</Text>
          </Pressable> : null}
        </View> : <EmptyState title={t("Todavía no tienes menús")} description={t("Crea tu primer menú para comenzar a agregar categorías y productos.")} action={t("Crear el primero")} onAction={() => setCreating(true)} />}
      </>}
    </ScrollView>
  );
}

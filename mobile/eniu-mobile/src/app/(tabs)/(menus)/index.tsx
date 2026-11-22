import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { BusinessSwitcher } from '@/components/business-switcher';
import { CatalogueCard } from '@/components/catalogue-card';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { LockIcon, PlusIcon } from '@/components/ui/icons';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useScreenTopPadding } from '@/constants/layout';
import { usePlan } from '@/features/auth/use-plan';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Catalogue } from '@/types/models';

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
  const limitText = limits.max_catalogues_per_business === 1
    ? t("Tu plan incluye un menú por negocio.")
    : t("Tu plan incluye {{count}} menús por negocio.", { count: limits.max_catalogues_per_business });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: topPadding, paddingBottom: 24, gap: 16 }}>
      <View style={{ gap: 2 }}>
        <BusinessSwitcher variant="inline" />
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 }}>{t("Menús")}</Text>
      </View>
      {!selectedBusiness ? <EmptyState title={t("Primero crea un negocio")} description={t("Ve a Inicio para crear el negocio que contendrá tus menús.")} /> : <>
        {creating ? (
          <View style={{ ...cardStyle(theme, 22), padding: 18, gap: 14 }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>{t("Nuevo menú")}</Text>
            <FormField label={t("Nombre")} value={name} onChangeText={setName} maxLength={64} placeholder={t("Menú principal")} />
            <FormField label={t("Descripción · opcional")} value={description} onChangeText={setDescription} multiline placeholder={t("Nuestro menú general")} />
            <Feedback message={error} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button style={{ flex: 1 }} variant="secondary" onPress={() => { setCreating(false); setError(''); }}>{t("Cancelar")}</Button>
              <Button style={{ flex: 1 }} onPress={create} loading={saving}>{t("Guardar menú")}</Button>
            </View>
          </View>
        ) : null}
        {query.isLoading ? <LoadingState label={t("Cargando menús…")} />
          : query.isError ? <ErrorState message={t("No pudimos cargar tus menús.")} error={query.error} onRetry={() => query.refetch()} />
          : menus.length ? (
            <View style={{ gap: 12 }}>
              {menus.map((menu, index) => (
                <Animated.View key={menu.id} entering={FadeInDown.duration(300).delay(index * 70)} layout={LinearTransition.duration(200)}>
                  <CatalogueCard catalogue={menu} businessId={selectedBusiness.id} />
                </Animated.View>
              ))}
              {atMenuLimit ? (
                <View style={{ borderRadius: 20, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><LockIcon color={theme.muted} size={15} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>{t("Otro menú")}</Text>
                    <Text style={{ color: theme.muted, fontSize: 13 }}>{limitText}</Text>
                  </View>
                  <Pressable accessibilityRole="link" onPress={() => router.push('/paywall')} hitSlop={12}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' }}>{t("Ver planes")}</Text>
                  </Pressable>
                </View>
              ) : !creating ? (
                <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={({ pressed }) => ({ borderRadius: 20, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.yellowPressed, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' }}><PlusIcon color={theme.onYellow} size={16} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>{t("Crear otro menú")}</Text>
                    <Text style={{ color: theme.muted, fontSize: 13 }}>{t("Uno para comidas, otro para bebidas o para temporada.")}</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          ) : <EmptyState title={t("Todavía no tienes menús")} description={t("Crea tu primer menú para comenzar a agregar categorías y productos.")} action={t("Crear el primero")} onAction={() => setCreating(true)} />}
      </>}
    </ScrollView>
  );
}

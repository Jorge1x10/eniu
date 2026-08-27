import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { BusinessSwitcher } from '@/components/business-switcher';
import { CatalogueCard } from '@/components/catalogue-card';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { PlusIcon } from '@/components/ui/icons';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, listCatalogues } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Catalogue } from '@/types/models';

export default function MenusScreen() {
  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { selectedBusiness } = useBusiness();
  const query = useQuery({ queryKey: catalogueKeys.all(selectedBusiness?.id), queryFn: () => listCatalogues(selectedBusiness!.id), enabled: Boolean(selectedBusiness) });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!selectedBusiness || !name.trim()) { setError('Escribe el nombre del menú.'); return; }
    setSaving(true); setError('');
    try {
      const data = await api.post<{ catalogue: Catalogue }>(`businesses/${selectedBusiness.id}/catalogues`, { name: name.trim(), description: description.trim() });
      queryClient.setQueryData<{ catalogues: Catalogue[] }>(catalogueKeys.all(selectedBusiness.id), (current) => ({ catalogues: [...(current?.catalogues ?? []), data.catalogue] }));
      setName(''); setDescription(''); setCreating(false);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible crear el menú.'); }
    finally { setSaving(false); }
  }

  const menus = query.data?.catalogues ?? [];
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 18, paddingTop: 8, paddingBottom: 120, gap: 18 }}>
      <View style={{ gap: 5 }}>
        <Text style={{ color: theme.text, fontSize: 25, fontWeight: '900' }}>Menús</Text>
        <Text style={{ color: theme.muted, lineHeight: 20 }}>Administra los menús que compartes con tus clientes.</Text>
      </View>
      <BusinessSwitcher />
      {!selectedBusiness ? <EmptyState title="Primero crea un negocio" description="Ve a Inicio para crear el negocio que contendrá tus menús." /> : <>
        {creating ? <View style={{ padding: 18, gap: 14, borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>Nuevo menú</Text><FormField label="Nombre" value={name} onChangeText={setName} maxLength={64} placeholder="Menú principal" /><FormField label="Descripción" value={description} onChangeText={setDescription} multiline placeholder="Nuestro menú general" /><Feedback message={error} /><View style={{ flexDirection: 'row', gap: 10 }}><Button style={{ flex: 1 }} onPress={create} loading={saving}>Guardar menú</Button><Button style={{ flex: 1 }} variant="secondary" onPress={() => { setCreating(false); setError(''); }}>Cancelar</Button></View></View> : null}
        {query.isLoading ? <LoadingState label="Cargando menús…" /> : query.isError ? <ErrorState message="No pudimos cargar tus menús." onRetry={() => query.refetch()} /> : menus.length ? <View style={{ gap: 12 }}>
          {menus.map((menu, index) => <Animated.View key={menu.id} entering={FadeInDown.duration(300).delay(index * 70)} layout={LinearTransition.duration(200)}><CatalogueCard catalogue={menu} /></Animated.View>)}
          {!creating ? <Pressable onPress={() => setCreating(true)} style={({ pressed }) => ({ borderRadius: 20, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.yellowPressed, padding: 20, alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: theme.yellow, alignItems: 'center', justifyContent: 'center' }}><PlusIcon color="#111111" size={18} /></View>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>Crear otro menú</Text>
            <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 230 }}>Uno para comidas, otro para bebidas o para temporada.</Text>
          </Pressable> : null}
        </View> : <EmptyState title="Todavía no tienes menús" description="Crea tu primer menú para comenzar a agregar categorías y productos." action="Crear el primero" onAction={() => setCreating(true)} />}
      </>}
    </ScrollView>
  );
}

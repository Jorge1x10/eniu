import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BusinessSwitcher } from '@/components/business-switcher';
import { CatalogueCard } from '@/components/catalogue-card';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
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
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 18, backgroundColor: theme.background }}>
      <BusinessSwitcher />
      {!selectedBusiness ? <EmptyState title="Primero crea un negocio" description="Ve a Inicio para crear el negocio que contendrá tus menús." /> : <>
        <Button onPress={() => { setCreating((value) => !value); setError(''); }}>{creating ? 'Cerrar formulario' : 'Crear menú'}</Button>
        {creating ? <View style={{ padding: 18, gap: 14, borderRadius: 20, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}><Text style={{ color: theme.text, fontSize: 20, fontWeight: '900' }}>Nuevo menú</Text><FormField label="Nombre" value={name} onChangeText={setName} maxLength={64} placeholder="Menú principal" /><FormField label="Descripción" value={description} onChangeText={setDescription} multiline placeholder="Nuestro menú general" /><Feedback message={error} /><Button onPress={create} loading={saving}>Guardar menú</Button></View> : null}
        {query.isLoading ? <LoadingState label="Cargando menús…" /> : query.isError ? <ErrorState message="No pudimos cargar tus menús." onRetry={() => query.refetch()} /> : menus.length ? <View style={{ gap: 12 }}>{menus.map((menu) => <CatalogueCard key={menu.id} catalogue={menu} />)}</View> : <EmptyState title="Todavía no tienes menús" description="Crea tu primer menú para comenzar a agregar categorías y productos." action="Crear el primero" onAction={() => setCreating(true)} />}
      </>}
    </ScrollView>
  );
}

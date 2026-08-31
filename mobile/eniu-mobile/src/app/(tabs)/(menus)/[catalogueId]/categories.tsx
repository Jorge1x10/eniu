import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api } from '@/lib/api';
import type { Category, Product } from '@/types/models';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n/formats';

export default function CategoriesScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const key = ['categories', selectedBusiness?.id, catalogueId] as const;
  const base = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/categories`;
  const query = useQuery({ queryKey: key, queryFn: () => api.get<{ categories: Category[] }>(base), enabled: Boolean(selectedBusiness && catalogueId) });
  const products = useQuery({ queryKey: ['products', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ products: Product[] }>(`businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/products`), enabled: Boolean(selectedBusiness && catalogueId) });
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState(''); const [description, setDescription] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);

  function startEdit(category?: Category) { setEditing(category ?? null); setName(category?.name ?? ''); setDescription(category?.description ?? ''); setError(''); setFormOpen(true); }
  async function save() {
    if (!name.trim()) { setError(t("Escribe el nombre de la categoría.")); return; }
    setSaving(true); setError('');
    try {
      const data = editing ? await api.patch<{ category: Category }>(`${base}/${editing.id}`, { name: name.trim(), description: description.trim() }) : await api.post<{ category: Category }>(base, { name: name.trim(), description: description.trim() });
      queryClient.setQueryData<{ categories: Category[] }>(key, (current) => ({ categories: editing ? (current?.categories ?? []).map((item) => item.id === editing.id ? data.category : item) : [...(current?.categories ?? []), data.category] }));
      setFormOpen(false); setEditing(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : t("No fue posible guardar la categoría.")); }
    finally { setSaving(false); }
  }
  function remove(category: Category) {
    Alert.alert(t("Eliminar categoría"), t("Los productos de “{{name}}” quedarán sin categoría.", { name: category.name }), [{ text: t("Cancelar"), style: 'cancel' }, { text: t("Eliminar"), style: 'destructive', onPress: async () => { try { await api.delete(`${base}/${category.id}`); queryClient.setQueryData<{ categories: Category[] }>(key, (current) => ({ categories: (current?.categories ?? []).filter((item) => item.id !== category.id) })); } catch (requestError) { Alert.alert(t("No se pudo eliminar"), requestError instanceof Error ? requestError.message : t("Intenta nuevamente.")); } } }]);
  }

  const categories = query.data?.categories ?? [];
  const currency = new Intl.NumberFormat(currentLocale(), { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16, backgroundColor: theme.background }}>
      <Button onPress={() => formOpen ? setFormOpen(false) : startEdit()}>{formOpen ? t("Cerrar formulario") : t("Crear categoría")}</Button>
      {formOpen ? <View style={{ padding: 18, gap: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous' }}><Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{editing ? t("Editar categoría") : t("Nueva categoría")}</Text><FormField label={t("Nombre")} value={name} onChangeText={setName} maxLength={64} placeholder={t("Bebidas")} /><FormField label={t("Descripción")} value={description} onChangeText={setDescription} multiline placeholder={t("Refrescos y aguas")} /><Feedback message={error} /><Button loading={saving} onPress={save}>{t("Guardar categoría")}</Button></View> : null}
      {categories.length ? <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>{t("Toca una categoría para editarla, mantén presionado para eliminarla.")}</Text> : null}
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message={t("No pudimos cargar las categorías.")} error={query.error} onRetry={() => query.refetch()} /> : categories.length ? <View style={{ gap: 10 }}>{categories.map((category) => {
        const items = (products.data?.products ?? []).filter((product) => product.category_id === category.id);
        const prices = items.map((product) => Number(product.price)).filter((value) => Number.isFinite(value) && value > 0);
        const empty = products.data ? items.length === 0 : null;
        return (
          <Pressable key={category.id} onPress={() => startEdit(category)} onLongPress={() => remove(category)} style={({ pressed }) => ({ padding: 16, borderRadius: 18, borderCurve: 'continuous', backgroundColor: empty ? theme.surfaceAlt : theme.surface, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.72 : 1 })}>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{category.name}</Text>
              {empty ? <Text style={{ color: theme.yellowPressed, fontSize: 12, fontWeight: '600' }}>{t("Vacía — no se muestra a tus clientes")}</Text> : <Text style={{ color: theme.muted, fontSize: 12 }}>{items.length} producto{items.length === 1 ? '' : 's'}{prices.length ? ` · desde ${currency.format(Math.min(...prices))}` : ''}</Text>}
            </View>
          </Pressable>
        );
      })}</View> : <EmptyState title={t("Sin categorías")} description={t("Organiza los productos de este menú creando categorías.")} action={t("Crear categoría")} onAction={() => startEdit()} />}
    </ScrollView>
  );
}

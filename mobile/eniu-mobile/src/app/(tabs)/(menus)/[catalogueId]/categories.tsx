import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { ChevronRightIcon } from '@/components/ui/icons';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { SheetModal } from '@/components/ui/sheet-modal';
import { cardStyle, useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { catalogueKeys, getCatalogue } from '@/features/catalogues/catalogue-api';
import { api } from '@/lib/api';
import type { Category, Product } from '@/types/models';

export default function CategoriesScreen() {
  const { t } = useTranslation();

  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const catalogue = useQuery({ queryKey: catalogueKeys.detail(selectedBusiness?.id, catalogueId), queryFn: () => getCatalogue(selectedBusiness!.id, catalogueId), enabled: Boolean(selectedBusiness && catalogueId) });
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
    Alert.alert(t("¿Eliminar la categoría “{{name}}”?", { name: category.name }), t("Sus productos no se eliminan: quedan sin categoría."), [{ text: t("Cancelar"), style: 'cancel' }, { text: t("Eliminar"), style: 'destructive', onPress: async () => { try { await api.delete(`${base}/${category.id}`); queryClient.setQueryData<{ categories: Category[] }>(key, (current) => ({ categories: (current?.categories ?? []).filter((item) => item.id !== category.id) })); setFormOpen(false); setEditing(null); } catch (requestError) { Alert.alert(t("No se pudo eliminar"), requestError instanceof Error ? requestError.message : t("Intenta nuevamente.")); } } }]);
  }

  const categories = query.data?.categories ?? [];
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }}>
      <ScreenHeader
        overline={catalogue.data?.catalogue.name}
        title={t("Categorías")}
        subtitle={t("Agrupan tus productos en secciones dentro del menú.")}
        actionLabel={t("Nueva")}
        onAction={() => startEdit()}
      />
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message={t("No pudimos cargar las categorías.")} error={query.error} onRetry={() => query.refetch()} /> : categories.length ? (
        <View style={{ ...cardStyle(theme, 20), overflow: 'hidden' }}>
          {categories.map((category, index) => {
            const count = (products.data?.products ?? []).filter((product) => product.category_id === category.id).length;
            const empty = products.data ? count === 0 : false;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={t("Editar {{name}}", { name: category.name })}
                onPress={() => startEdit(category)}
                style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: index ? 1 : 0, borderTopColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : 'transparent' })}
              >
                <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.text, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <Text numberOfLines={1} style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>{category.name}</Text>
                  {empty ? (
                    <View style={{ alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(232,201,61,0.22)' }}>
                      <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>{t("Vacía · tus clientes no la ven")}</Text>
                    </View>
                  ) : (
                    <Text style={{ color: theme.muted, fontSize: 13 }}>{count === 1 ? t("1 producto") : t("{{count}} productos", { count })}</Text>
                  )}
                </View>
                <ChevronRightIcon color={theme.muted} size={12} />
              </Pressable>
            );
          })}
        </View>
      ) : <EmptyState title={t("Sin categorías")} description={t("Organiza los productos de este menú creando categorías.")} action={t("Crear categoría")} onAction={() => startEdit()} />}

      <Button variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/(menus)/[catalogueId]/products', params: { catalogueId } })}>{t("Ver productos de este menú")}</Button>

      <SheetModal visible={formOpen} title={editing ? t("Editar categoría") : t("Nueva categoría")} onClose={() => setFormOpen(false)} busy={saving}>
        <FormField label={t("Nombre")} value={name} onChangeText={setName} maxLength={64} placeholder={t("Bebidas")} />
        <FormField label={t("Descripción · opcional")} value={description} onChangeText={setDescription} multiline placeholder={t("Refrescos y aguas")} />
        <Feedback message={error} />
        <Button size="lg" loading={saving} onPress={save}>{t("Guardar categoría")}</Button>
        {editing ? (
          <Pressable accessibilityRole="button" onPress={() => remove(editing)} disabled={saving} style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: theme.danger, fontSize: 16, fontWeight: '700' }}>{t("Eliminar categoría")}</Text>
          </Pressable>
        ) : null}
      </SheetModal>
    </ScrollView>
  );
}

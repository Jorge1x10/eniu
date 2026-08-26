import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/ui/feedback';
import { FormField } from '@/components/ui/form-field';
import { PlusIcon } from '@/components/ui/icons';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useEniuTheme } from '@/constants/eniu-theme';
import { useBusiness } from '@/features/business/business-context';
import { api } from '@/lib/api';
import type { Category, Product } from '@/types/models';

const UNCATEGORIZED = 'uncategorized';

function ProductRow({ product, currency, theme, onPress, onLongPress }: { product: Product; currency: Intl.NumberFormat; theme: ReturnType<typeof useEniuTheme>; onPress: () => void; onLongPress: () => void }) {
  const image = product.image_url || product.image;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => ({ borderRadius: 18, borderCurve: 'continuous', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 13, opacity: pressed ? 0.72 : 1 })}>
      {image ? <Image source={{ uri: image }} style={{ width: 58, height: 58, borderRadius: 13, flexShrink: 0 }} /> : <View style={{ width: 58, height: 58, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.yellowPressed, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><PlusIcon color={theme.yellowPressed} size={16} /></View>}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{product.name}</Text>
        <Text numberOfLines={1} style={{ color: image ? theme.muted : theme.yellowPressed, fontSize: 12, fontWeight: image ? '400' : '600' }}>{image ? (product.description || 'Sin descripción') : 'Súbele una foto y se ve 3× más'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 1 }}>
          <View style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: product.is_available ? theme.success : theme.muted }} />
          <Text style={{ color: product.is_available ? theme.success : theme.muted, fontSize: 11, fontWeight: '600' }}>{product.is_available ? 'Disponible' : 'Agotado'}</Text>
        </View>
      </View>
      <Text selectable style={{ color: theme.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'], flexShrink: 0 }}>{product.price == null ? 'S/P' : currency.format(Number(product.price))}</Text>
    </Pressable>
  );
}

export default function ProductsScreen() {
  const theme = useEniuTheme();
  const queryClient = useQueryClient();
  const { catalogueId } = useLocalSearchParams<{ catalogueId: string }>();
  const { selectedBusiness } = useBusiness();
  const key = ['products', selectedBusiness?.id, catalogueId] as const;
  const base = `businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/products`;
  const query = useQuery({ queryKey: key, queryFn: () => api.get<{ products: Product[] }>(base), enabled: Boolean(selectedBusiness && catalogueId) });
  const categoriesQuery = useQuery({ queryKey: ['categories', selectedBusiness?.id, catalogueId], queryFn: () => api.get<{ categories: Category[] }>(`businesses/${selectedBusiness?.id}/catalogues/${catalogueId}/categories`), enabled: Boolean(selectedBusiness && catalogueId) });
  const [editing, setEditing] = useState<Product | null>(null); const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [price, setPrice] = useState(''); const [available, setAvailable] = useState(true);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  function startEdit(product?: Product) { setEditing(product ?? null); setName(product?.name ?? ''); setDescription(product?.description ?? ''); setPrice(product?.price == null ? '' : String(product.price)); setAvailable(product?.is_available ?? true); setError(''); setFormOpen(true); }
  async function save() {
    if (!name.trim()) { setError('Escribe el nombre del producto.'); return; }
    if (price && !/^\d+(?:\.\d{1,2})?$/.test(price)) { setError('Usa un precio válido con máximo dos decimales.'); return; }
    setSaving(true); setError('');
    const payload = { name: name.trim(), description: description.trim(), price: price || null, category_id: editing?.category_id ?? null, is_available: available };
    try {
      const data = editing ? await api.patch<{ product: Product }>(`${base}/${editing.id}`, payload) : await api.post<{ product: Product }>(base, payload);
      queryClient.setQueryData<{ products: Product[] }>(key, (current) => ({ products: editing ? (current?.products ?? []).map((item) => item.id === editing.id ? data.product : item) : [...(current?.products ?? []), data.product] }));
      setFormOpen(false); setEditing(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible guardar el producto.'); }
    finally { setSaving(false); }
  }
  function remove(product: Product) {
    Alert.alert('Eliminar producto', `¿Quieres eliminar “${product.name}”?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await api.delete(`${base}/${product.id}`); queryClient.setQueryData<{ products: Product[] }>(key, (current) => ({ products: (current?.products ?? []).filter((item) => item.id !== product.id) })); } catch (requestError) { Alert.alert('No se pudo eliminar', requestError instanceof Error ? requestError.message : 'Intenta nuevamente.'); } } }]);
  }

  const products = query.data?.products ?? [];
  const categories = categoriesQuery.data?.categories ?? [];
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: selectedBusiness?.currency || 'MXN' });
  const filtered = filter ? products.filter((product) => (product.category_id ?? UNCATEGORIZED) === filter) : products;
  const byCategory = new Map<string, Product[]>();
  for (const product of filtered) { const id = product.category_id ?? UNCATEGORIZED; byCategory.set(id, [...(byCategory.get(id) ?? []), product]); }
  const named = categories.filter((category) => byCategory.has(category.id)).map((category) => ({ id: category.id, name: category.name, items: byCategory.get(category.id)! }));
  const rest = byCategory.get(UNCATEGORIZED);
  const groups = rest ? [...named, { id: UNCATEGORIZED, name: 'Sin categoría', items: rest }] : named;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 18, paddingBottom: 100, gap: 16, backgroundColor: theme.background }}>
      {categories.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
        <Pressable onPress={() => setFilter(null)} style={({ pressed }) => ({ minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 99, backgroundColor: filter === null ? '#111111' : theme.surface, borderWidth: filter === null ? 0 : 1, borderColor: theme.border, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: filter === null ? theme.yellow : theme.text, fontSize: 12.5, fontWeight: '700' }}>Todos · {products.length}</Text></Pressable>
        {categories.map((category) => { const count = products.filter((product) => product.category_id === category.id).length; return <Pressable key={category.id} onPress={() => setFilter(category.id)} style={({ pressed }) => ({ minHeight: 34, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 99, backgroundColor: filter === category.id ? '#111111' : theme.surface, borderWidth: filter === category.id ? 0 : 1, borderColor: theme.border, opacity: pressed ? 0.75 : 1 })}><Text style={{ color: filter === category.id ? theme.yellow : theme.text, fontSize: 12.5, fontWeight: '600' }}>{category.name} · {count}</Text></Pressable>; })}
      </ScrollView> : null}

      <Button onPress={() => formOpen ? setFormOpen(false) : startEdit()}>{formOpen ? 'Cerrar formulario' : 'Crear producto'}</Button>
      {formOpen ? <View style={{ padding: 18, gap: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20, borderCurve: 'continuous' }}><Text style={{ color: theme.text, fontSize: 19, fontWeight: '900' }}>{editing ? 'Editar producto' : 'Nuevo producto'}</Text><FormField label="Nombre" value={name} onChangeText={setName} maxLength={64} placeholder="Hamburguesa clásica" /><FormField label="Descripción" value={description} onChangeText={setDescription} multiline placeholder="Ingredientes y detalles" /><FormField label="Precio" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="129.00" /><View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.text, fontWeight: '700' }}>Disponible</Text><Switch value={available} onValueChange={setAvailable} trackColor={{ true: theme.yellowPressed }} /></View><Feedback message={error} /><Button loading={saving} onPress={save}>Guardar producto</Button></View> : null}

      {products.length ? <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 19 }}>Toca un producto para editarlo, mantén presionado para eliminarlo.</Text> : null}
      {query.isLoading ? <LoadingState /> : query.isError ? <ErrorState message="No pudimos cargar los productos." onRetry={() => query.refetch()} /> : products.length ? <View style={{ gap: 18 }}>
        {groups.map((group) => <View key={group.id} style={{ gap: 10 }}>
          <Text style={{ color: theme.yellowPressed, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>{group.name}</Text>
          <View style={{ gap: 10 }}>{group.items.map((product) => <ProductRow key={product.id} product={product} currency={currency} theme={theme} onPress={() => startEdit(product)} onLongPress={() => remove(product)} />)}</View>
        </View>)}
      </View> : <EmptyState title="Sin productos" description="Agrega el primer producto de este menú." action="Crear producto" onAction={() => startEdit()} />}
    </ScrollView>
  );
}
